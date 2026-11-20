import type { Timestamp } from 'firebase/firestore'

// Retrato do patrimônio total de um mês, em users/{uid}/patrimonySnapshots/{YYYY-MM}.
// O documento do mês é sobrescrito a cada mudança: o valor de cada mês é o último conhecido dele.
export interface PatrimonySnapshot {
  month: string // 'YYYY-MM'
  total: number
  recordedAt: Timestamp
}

export interface PatrimonySnapshotWithId extends PatrimonySnapshot {
  id: string
}
