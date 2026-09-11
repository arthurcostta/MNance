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
  createdAt: Timestamp
  updatedAt: Timestamp
}
