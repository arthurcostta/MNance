import type { Timestamp } from 'firebase/firestore'

export interface Installment {
  name: string
  totalAmount: number
  installmentAmount: number
  totalInstallments: number
  paidInstallments: number
  category: string
  lastActivityDate: Timestamp
  dismissedAsZombie: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
