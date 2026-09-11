import type { Timestamp } from 'firebase/firestore'

export type AssetClass = 'stocks' | 'bonds' | 'alternatives' | 'cash'
export type AssetStatus = 'active' | 'archived'

export interface Asset {
  name: string
  assetClass: AssetClass
  currentValue: number
  expectedReturnRate: number
  status: AssetStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}
