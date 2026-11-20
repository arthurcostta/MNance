import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { activeAssetsTotal, type AssetTotalInput } from '../core/patrimonyHistory'
import { formatYearMonth, yearMonthOf } from '../core/installments'
import type { PatrimonySnapshotWithId } from '../types/patrimonySnapshot'

function snapshotsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'patrimonySnapshots')
}

// Mesmo critério de getAssets: pede ao servidor e só usa o cache quando o aparelho está offline.
export async function getPatrimonySnapshots(uid: string): Promise<PatrimonySnapshotWithId[]> {
  const ref = snapshotsCollectionRef(uid)
  const snapshot = await getDocsFromServer(ref).catch(() => getDocs(ref))
  return snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }) as PatrimonySnapshotWithId)
}

export async function savePatrimonySnapshot(uid: string, month: string, total: number): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'patrimonySnapshots', month), {
    month,
    total,
    recordedAt: serverTimestamp(),
  })
}

// Último retrato gravado por usuário nesta sessão ('AAAA-MM|total'). Várias telas leem os ativos ao mesmo
// tempo (Radar, Investimentos, Portfólio); a trava evita gravar o mesmo valor várias vezes.
const lastRecorded = new Map<string, string>()

// Grava o patrimônio total do mês corrente com a lista de ativos que acabou de ser lida. Nunca quebra a
// tela: falha vira aviso no console e a próxima leitura tenta de novo.
export async function recordPatrimonySnapshot(uid: string, assets: AssetTotalInput[]): Promise<void> {
  const total = activeAssetsTotal(assets)
  if (total === null) return

  const month = formatYearMonth(yearMonthOf(new Date()))
  const key = `${month}|${total}`
  if (lastRecorded.get(uid) === key) return
  lastRecorded.set(uid, key)

  try {
    await savePatrimonySnapshot(uid, month, total)
  } catch (error) {
    lastRecorded.delete(uid)
    console.warn('Não foi possível registrar o patrimônio do mês:', error)
  }
}
