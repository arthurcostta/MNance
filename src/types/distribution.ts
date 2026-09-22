import type { Timestamp } from 'firebase/firestore'
import type { AllocationModelKey } from '../core/allocationModels'

export type DistributionModelChoice = AllocationModelKey | 'CUSTOM'

export interface CustomAllocation {
  stocks: number // percentual 0-100, não fração — mesma convenção dos campos de Nível 1
  bonds: number
  alternatives: number
  cash: number
}

export interface Distribution {
  // Nível 1: divisão da renda mensal líquida (PRD §5)
  essentialsPercent: number
  educationPercent: number
  leisurePercent: number
  investmentsPercent: number

  // Nível 2: alocação da parcela de investimentos
  allocationModel: DistributionModelChoice
  // Presente só quando allocationModel === 'CUSTOM'; preservado mesmo trocando de
  // modelo, para não perder a customização ao voltar (CENÁRIO 39).
  customAllocation?: CustomAllocation

  updatedAt: Timestamp
}
