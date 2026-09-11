import type { Timestamp } from 'firebase/firestore'

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

export interface User {
  name: string
  email: string
  goalAmount: number
  goalYears: number
  riskProfile: RiskProfile
  currentPatrimony: number
  monthlyIncomeNet: number
  essentialMonthlyCost: number
  emergencyReserveMin: number
  emergencyReserveSafe: number
  payday1: number
  payday2: number | null
  darkMode: boolean
  // Marca quando o onboarding foi concluído/atualizado pela última vez — M4 (Dashboard)
  // usa esse campo para diferenciar primeiro acesso de reedição.
  onboardingCompletedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
