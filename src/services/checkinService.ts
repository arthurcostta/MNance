import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { applyCheckinToAssets, deriveCheckinStatus, type AssetCheckinUpdate } from '../core/checkin'
import type { InvestmentCheckin, InvestmentCheckinWithId, NewAssetDraft } from '../types/checkin'
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
// ativos novos. Se o check-in já existir (dupla submissão), nada é gravado. Devolve o saldo de cada
// ativo antes e depois, para a tela mostrar o que mudou (e conferir no servidor).
export async function confirmCheckin(uid: string, input: ConfirmCheckinInput): Promise<AssetCheckinUpdate[]> {
  const checkinId = checkinIdFor(input.month, input.slot)

  return runTransaction(db, async (transaction) => {
    const checkinRef = checkinDocRef(uid, checkinId)
    const existing = await transaction.get(checkinRef)
    if (existing.exists()) throw new Error('Este dia de investir já foi respondido.')

    // Leituras antes de qualquer escrita (exigência do Firestore nas transações).
    const existingEntries = input.entries.filter((e) => !e.newAsset)
    const snapshots = await Promise.all(
      existingEntries.map((e) => transaction.get(doc(db, 'users', uid, 'assets', e.assetId)))
    )
    const balances = existingEntries.map((entry, index) => {
      const snap = snapshots[index]
      if (!snap?.exists()) throw new Error('Um dos ativos não existe mais. Atualize a tela e tente de novo.')
      const asset = snap.data() as Asset
      return { id: entry.assetId, name: asset.name, currentValue: asset.currentValue }
    })

    const existingUpdates = applyCheckinToAssets(
      balances,
      existingEntries.map((e) => ({ assetId: e.assetId, invested: e.invested }))
    )
    const newUpdates: AssetCheckinUpdate[] = input.entries
      .filter((e) => e.newAsset && e.invested > 0)
      .map((e) => ({ assetId: e.assetId, name: e.newAsset!.name, before: 0, after: e.invested }))

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
      const balance = balances[existingEntries.indexOf(entry)]!
      return { assetId: entry.assetId, assetName: balance.name, planned: entry.planned, invested: entry.invested }
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
      if (!entry.newAsset) return
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
    })

    existingUpdates.forEach((update) => {
      transaction.update(doc(db, 'users', uid, 'assets', update.assetId), {
        currentValue: update.after,
        updatedAt: serverTimestamp(),
      })
    })

    return [...existingUpdates, ...newUpdates]
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

// Refazer um dia marcado como "Não investi": apaga o registro para que o dia volte a aceitar resposta.
// Só apaga se o status for 'skipped'; um check-in confirmado nunca é removido (o aporte já mexeu nos ativos).
export async function reopenSkippedCheckin(uid: string, input: { month: string; slot: number }): Promise<void> {
  const checkinId = checkinIdFor(input.month, input.slot)
  await runTransaction(db, async (transaction) => {
    const ref = checkinDocRef(uid, checkinId)
    const existing = await transaction.get(ref)
    if (!existing.exists()) return
    const data = existing.data() as InvestmentCheckin
    if (data.status !== 'skipped') {
      throw new Error('Só dá para refazer um dia marcado como "Não investi".')
    }
    transaction.delete(ref)
  })
}
