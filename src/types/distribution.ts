import type { Timestamp } from 'firebase/firestore'
import type { AllocationModelKey } from '../core/allocationModels'

export type DistributionModelChoice = AllocationModelKey | 'CUSTOM'

export interface CustomAllocation {
  stocks: number // percentual 0-100, não fração — mesma convenção dos campos de Nível 1
  bonds: number
  alternatives: number
  cash: number
}

// Divisão da renda de UM dia de pagamento (PRD §5 + planilha pessoal do usuário, que tem
// splits percentuais próprios para cada dia). Ganha a 5ª categoria "Caixa da Empresa" no
// M5.5 — default 0% para quem não tem empresa (a maioria).
export interface PaydaySplit {
  essentialsPercent: number
  educationPercent: number
  leisurePercent: number
  investmentsPercent: number
  companyCashPercent: number
}

// Desde o M5.8 a Distribuição só decide COMO A RENDA SE DIVIDE (+ o destino do saldo das
// essenciais). Em que investir é assunto do Portfólio e, depois, da tela Investimentos —
// por isso o antigo "Nível 2" (investmentBuckets) saiu daqui. Documentos antigos no
// Firestore ainda carregam esse campo; ele é simplesmente ignorado.
export interface Distribution {
  payday1Split: PaydaySplit
  // Presente só quando User.payday2 existe. Se o usuário remover o 2º pagamento
  // depois (reeditando o onboarding), este campo fica órfão no Firestore mas
  // inofensivo — hasSecondPayday sempre deriva de currentUser.payday2, nunca daqui.
  payday2Split?: PaydaySplit
  // % da renda mensal líquida que chega no payday1 (o resto chega no payday2).
  // Presente só junto com payday2Split.
  payday1IncomeSharePercent?: number

  // Destino do saldo das despesas essenciais (orçado − real): quanto % vai para
  // Investimentos (0–100); o resto vai para Lazer. É uma POLÍTICA permanente — vale todo
  // mês até o usuário editar. `undefined` = decisão pendente: nada é roteado (conservador).
  surplusInvestmentsPercent?: number

  updatedAt: Timestamp
}
