import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { deriveCheckinStatus } from '../core/checkin'
import type { InvestmentCheckinWithId, NewAssetDraft } from '../types/checkin'
import type { Asset } from '../types/asset'

function checkinsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'investmentCheckins')
}

function checkinDocRef(uid: string, checkinId: string) {
  return doc(db, 'users', uid, 'investmentCheckins', checkinId)
}

function assetsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'assets')
}

export function checkinIdFor(month: string, slot: number): string {
  return `${month}-${slot}`
}

export async function getCheckins(uid: string): Promise<InvestmentCheckinWithId[]> {
  const snapshot = await getDocs(checkinsCollectionRef(uid))
  return snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }) as InvestmentCheckinWithId)
}

export interface CheckinEntry {
  // Para ativo existente, o id do Portfólio. Para ativo novo, um id gerado antes (newAsset preenchido).
  assetId: string
  planned: number
  invested: number
  newAsset?: NewAssetDraft
}

export interface ConfirmCheckinInput {
  month: string
  slot: number
  day: number
  plannedTotal: number
  entries: CheckinEntry[]
}

// Gravação atômica: lê os ativos, cria o check-in, soma cada aporte ao saldo do ativo e cria os
// ativos novos. Se o check-in já existir (dupla submissão), nada é gravado.
export async function confirmCheckin(uid: string, input: ConfirmCheckinInput): Promise<void> {
  const checkinId = checkinIdFor(input.month, input.slot)

  await runTransaction(db, async (transaction) => {
    const checkinRef = checkinDocRef(uid, checkinId)
    const existing = await transaction.get(checkinRef)
    if (existing.exists()) throw new Error('Este dia de investir já foi respondido.')

    // Leituras antes de qualquer escrita (exigência do Firestore nas transações).
    const existingEntries = input.entries.filter((e) => !e.newAsset)
    const snapshots = await Promise.all(
      existingEntries.map((e) => transaction.get(doc(db, 'users', uid, 'assets', e.assetId)))
    )

    const allocations = input.entries.map((entry) => {
      if (entry.newAsset) {
        return {
          assetId: entry.assetId,
          assetName: entry.newAsset.name,
          planned: entry.planned,
          invested: entry.invested,
          isNew: true,
        }
      }
      const index = existingEntries.indexOf(entry)
      const snap = snapshots[index]
      if (!snap?.exists()) throw new Error('Um dos ativos não existe mais. Atualize a tela e tente de novo.')
      return {
        assetId: entry.assetId,
        assetName: (snap.data() as Asset).name,
        planned: entry.planned,
        invested: entry.invested,
      }
    })

    const investedTotal = allocations.reduce((sum, a) => sum + a.invested, 0)

    transaction.set(checkinRef, {
      month: input.month,
      slot: input.slot,
      day: input.day,
      plannedTotal: input.plannedTotal,
      investedTotal,
      status: deriveCheckinStatus(input.plannedTotal, investedTotal),
      allocations,
      completedAt: Timestamp.now(),
    })

    input.entries.forEach((entry) => {
      if (entry.newAsset) {
        transaction.set(doc(assetsCollectionRef(uid), entry.assetId), {
          name: entry.newAsset.name,
          assetClass: entry.newAsset.assetClass,
          currentValue: entry.invested,
          expectedReturnRate: entry.newAsset.expectedReturnRate,
          ...(entry.newAsset.monthlyContribution ? { monthlyContribution: entry.newAsset.monthlyContribution } : {}),
          ...(entry.newAsset.contributionEndsAt ? { contributionEndsAt: entry.newAsset.contributionEndsAt } : {}),
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return
      }
      const snap = snapshots[existingEntries.indexOf(entry)]
      if (!snap?.exists() || entry.invested === 0) return
      const current = (snap.data() as Asset).currentValue
      transaction.update(snap.ref, {
        currentValue: Math.round((current + entry.invested) * 100) / 100,
        updatedAt: serverTimestamp(),
      })
    })
  })
}

// "Ainda não investi" de verdade: registra o dia como pulado, sem tocar em nenhum ativo.
export async function skipCheckin(uid: string, input: { month: string; slot: number; day: number; plannedTotal: number }) {
  const checkinId = checkinIdFor(input.month, input.slot)
  await runTransaction(db, async (transaction) => {
    const ref = checkinDocRef(uid, checkinId)
    const existing = await transaction.get(ref)
    if (existing.exists()) throw new Error('Este dia de investir já foi respondido.')
    transaction.set(ref, {
      month: input.month,
      slot: input.slot,
      day: input.day,
      plannedTotal: input.plannedTotal,
      investedTotal: 0,
      status: 'skipped',
      allocations: [],
      completedAt: Timestamp.now(),
    })
  })
}
