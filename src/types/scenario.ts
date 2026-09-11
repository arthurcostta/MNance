import type { Timestamp } from 'firebase/firestore'

export interface Scenario {
  name: string
  monthlyContribution: number
  expectedReturnRate: number
  years: number
  createdAt: Timestamp
}
