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
  // Marcado true quando o usuário dispensa o banner de seed de patrimônio em M3 (Portfólio).
  // Nunca retorna false — é permanente para evitar re-exibição.
  portfolioSeedDismissed?: boolean
  // Taxa de inflação esperada (fração, ex: 0.045 = 4,5% a.a.). Ausente = DEFAULT_INFLATION_RATE.
  // Usado na projeção de patrimônio: converte taxas nominais em reais, valores em "valores de hoje".
  inflationRate?: number
  // Dias de investir do mês (1–31, até 2; ajustados a dia útil). Ausente/vazio = "fim do mês" (último dia útil).
  // Editado fora do onboarding (Investimentos e Conta), por isso setUserDocument usa merge e não apaga.
  investmentDays?: number[]
  // true depois da 1ª visita à tela Investimentos, mesmo que o usuário tenha escolhido "fim do mês".
  investmentDayPromptAnswered?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
