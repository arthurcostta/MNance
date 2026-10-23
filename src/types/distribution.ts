import type { Timestamp } from 'firebase/firestore'
import type { AllocationModelKey } from '../core/allocationModels'
import type { CustomCategory } from '../core/distributionCategories'

export type DistributionModelChoice = AllocationModelKey | 'CUSTOM'

export interface CustomAllocation {
  stocks: number // percentual 0-100, não fração — mesma convenção dos campos de Nível 1
  bonds: number
  alternatives: number
  cash: number
}

// Divisão da renda de UM dia de pagamento. As 4 categorias padrão são sempre as mesmas; as
// personalizadas (até 5) entram por id em customPercents (ausente = 0%).
export interface PaydaySplit {
  essentialsPercent: number
  educationPercent: number
  leisurePercent: number
  investmentsPercent: number
  customPercents: Record<string, number>
}

// Formato anterior (até o M5.10): 5ª categoria fixa "Caixa da Empresa". Só existe em documentos
// que ainda não foram migrados; resolveStoredDistribution converte na leitura.
export interface LegacyPaydaySplit extends Omit<PaydaySplit, 'customPercents'> {
  companyCashPercent?: number
  customPercents?: Record<string, number>
}

// Desde o M5.8 a Distribuição só decide COMO A RENDA SE DIVIDE (+ o destino do saldo das
// essenciais). Em que investir é assunto do Portfólio e da tela Investimentos.
export interface Distribution {
  payday1Split: PaydaySplit
  // Presente só quando User.payday2 existe. Se o usuário remover o 2º pagamento
  // depois, este campo fica órfão mas inofensivo — hasSecondPayday deriva de currentUser.payday2.
  payday2Split?: PaydaySplit
  // % da renda mensal líquida que chega no payday1 (o resto chega no payday2).
  // Presente só junto com payday2Split.
  payday1IncomeSharePercent?: number

  // Destino do saldo das despesas essenciais (orçado − real): quanto % vai para
  // Investimentos (0–100); o resto vai para Lazer. É uma POLÍTICA permanente — vale todo
  // mês até o usuário editar. `undefined` = decisão pendente: nada é roteado (conservador).
  surplusInvestmentsPercent?: number

  // Categorias personalizadas do usuário. Ausente em documentos antigos = nenhuma.
  customCategories?: CustomCategory[]

  updatedAt: Timestamp
}

// Documento como está no Firestore, antes da migração para o formato atual.
export interface StoredDistribution extends Omit<Distribution, 'payday1Split' | 'payday2Split' | 'updatedAt'> {
  payday1Split: LegacyPaydaySplit
  payday2Split?: LegacyPaydaySplit
  updatedAt?: Timestamp
}
