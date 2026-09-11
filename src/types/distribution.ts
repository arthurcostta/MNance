import type { Timestamp } from 'firebase/firestore'
import type { AllocationModelKey } from '../core/allocationModels'

export interface Distribution {
  // Nível 1: divisão da renda mensal líquida
  essentialsPercent: number
  investmentsPercent: number
  freedomPercent: number

  // Nível 2: alocação da parcela de investimentos
  allocationModel: AllocationModelKey

  updatedAt: Timestamp
}
