import type { Timestamp } from 'firebase/firestore'
import type { AllocationModelKey } from '../core/allocationModels'

export type DistributionModelChoice = AllocationModelKey | 'CUSTOM'

export interface CustomAllocation {
  stocks: number // percentual 0-100, não fração — mesma convenção dos campos de Nível 1
  bonds: number
  alternatives: number
  cash: number
}

// Nível 1: divisão da renda de UM dia de pagamento (PRD §5 + planilha pessoal do
// usuário, que tem splits percentuais próprios para cada dia). Ganha a 5ª categoria
// "Caixa da Empresa" no M5.5 — default 0% para quem não tem empresa (a maioria).
export interface PaydaySplit {
  essentialsPercent: number
  educationPercent: number
  leisurePercent: number
  investmentsPercent: number
  companyCashPercent: number
}

// Nível 2: um "objetivo de investimento" nomeado (ex: "Casa + Carro 2031"), com sua
// própria fatia dos investimentos e seu próprio modelo de alocação — substitui o
// antigo allocationModel único do M5, que assumia 100% dos investimentos em um só lugar.
export interface InvestmentBucket {
  id: string
  name: string
  percentOfInvestments: number // soma de todos os buckets deve fechar em 100
  allocationModel: DistributionModelChoice
  // Presente só quando allocationModel === 'CUSTOM'; preservado mesmo trocando de
  // modelo, para não perder a customização ao voltar (CENÁRIO 39, herdado do M5).
  customAllocation?: CustomAllocation
}

export interface Distribution {
  payday1Split: PaydaySplit
  // Presente só quando User.payday2 existe. Se o usuário remover o 2º pagamento
  // depois (reeditando o onboarding), este campo fica órfão no Firestore mas
  // inofensivo — hasSecondPayday sempre deriva de currentUser.payday2, nunca daqui.
  payday2Split?: PaydaySplit
  // % da renda mensal líquida que chega no payday1 (o resto chega no payday2).
  // Presente só junto com payday2Split.
  payday1IncomeSharePercent?: number

  investmentBuckets: InvestmentBucket[]

  updatedAt: Timestamp
}
