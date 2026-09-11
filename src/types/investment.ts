import type { Timestamp } from 'firebase/firestore'

export interface Investment {
  assetId: string
  amount: number
  date: Timestamp
  createdAt: Timestamp
}
