import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { ALLOCATION_MODELS, calculateModelExpectedReturn, type AllocationModel } from '../core/allocationModels'
import { calculateWeightedReturn } from '../core/weightedReturn'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
import { calculateGoalTimeline, type GoalTimelineResult } from '../core/goalTimeline'
import {
  getDefaultDistribution,
  getDistribution,
  updateDistribution,
} from '../services/distributionService'
import { updateUserDocument } from '../services/userService'
import type {
  CustomAllocation,
  Distribution,
  DistributionModelChoice,
  InvestmentBucket,
  PaydaySplit,
} from '../types/distribution'
import type { RiskProfile } from '../types/user'
import { generateId } from '../utils/generateId'
import { formatPercent } from '../utils/formatPercent'

export type NivelUmInput = PaydaySplit
export type NivelUmErrors = Partial<Record<keyof PaydaySplit, string>> & { total?: string }
export type CustomAllocationErrors = Partial<Record<keyof CustomAllocation, string>> & {
  total?: string
}

const SUM_TOLERANCE = 0.01
const PERCENT_RANGE_ERROR = 'O percentual precisa estar entre 0 e 100.'

function isValidPercent(value: number): boolean {
  return !isNaN(value) && isFinite(value) && value >= 0 && value <= 100
}

// CENÁRIO 37/38 (herdados do M5): soma precisa fechar em 100%, com tolerância de ponto
// flutuante — quando não fecha, o erro expõe a diferença exata (faltam/excedeu X%).
function sumError(total: number): string | undefined {
  const diff = total - 100
  if (Math.abs(diff) < SUM_TOLERANCE) return undefined
  return diff > 0
    ? `A soma excedeu 100% em ${formatPercent(diff)}.`
    : `Faltam ${formatPercent(Math.abs(diff))} para completar 100%.`
}

// Nível 1 agora valida um PaydaySplit de 5 campos (ganhou companyCashPercent no M5.5).
export function validateNivelUm(input: PaydaySplit): NivelUmErrors {
  const errors: NivelUmErrors = {}

  if (!isValidPercent(input.essentialsPercent)) errors.essentialsPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.educationPercent)) errors.educationPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.leisurePercent)) errors.leisurePercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.investmentsPercent)) errors.investmentsPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.companyCashPercent)) errors.companyCashPercent = PERCENT_RANGE_ERROR

  const total =
    input.essentialsPercent +
    input.educationPercent +
    input.leisurePercent +
    input.investmentsPercent +
    input.companyCashPercent
  const totalError = sumError(total)
  if (totalError) errors.total = totalError

  return errors
}

export function validateCustomAllocation(input: CustomAllocation): CustomAllocationErrors {
  const errors: CustomAllocationErrors = {}

  if (!isValidPercent(input.stocks)) errors.stocks = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.bonds)) errors.bonds = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.alternatives)) errors.alternatives = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.cash)) errors.cash = PERCENT_RANGE_ERROR

  const total = input.stocks + input.bonds + input.alternatives + input.cash
  const totalError = sumError(total)
  if (totalError) errors.total = totalError

  return errors
}

export interface DistributionAmounts {
  essentials: number
  education: number
  leisure: number
  investments: number
  companyCash: number
}

export interface PaydayAmountInput {
  split: PaydaySplit
  incomeShareFraction: number
}

// Agrega por dia de pagamento (1 ou 2): cada categoria soma
// monthlyIncomeNet × incomeShareFraction × percent/100 por dia. Usuário de 1 pagamento
// chama com um único item e incomeShareFraction: 1.
export function calculateDistributionAmounts(
  paydays: PaydayAmountInput[],
  monthlyIncomeNet: number
): DistributionAmounts {
  const totals: DistributionAmounts = {
    essentials: 0,
    education: 0,
    leisure: 0,
    investments: 0,
    companyCash: 0,
  }

  for (const { split, incomeShareFraction } of paydays) {
    const paydayIncome = monthlyIncomeNet * incomeShareFraction
    totals.essentials += (split.essentialsPercent / 100) * paydayIncome
    totals.education += (split.educationPercent / 100) * paydayIncome
    totals.leisure += (split.leisurePercent / 100) * paydayIncome
    totals.investments += (split.investmentsPercent / 100) * paydayIncome
    totals.companyCash += (split.companyCashPercent / 100) * paydayIncome
  }

  return totals
}

export function resolveAllocationModel(
  choice: DistributionModelChoice,
  custom?: CustomAllocation
): AllocationModel {
  if (choice === 'CUSTOM') {
    return {
      label: 'Personalizado',
      stocks: (custom?.stocks ?? 0) / 100,
      bonds: (custom?.bonds ?? 0) / 100,
      alternatives: (custom?.alternatives ?? 0) / 100,
      cash: (custom?.cash ?? 0) / 100,
    }
  }
  return ALLOCATION_MODELS[choice]
}

export interface InvestmentBucketErrors {
  total?: string
  byBucket: Record<string, { name?: string; percentOfInvestments?: string }>
}

// Piso de 1 bucket é garantido pela UI (botão Remover trava em 1) — aqui só validamos
// o que existe: nome obrigatório por bucket, soma de percentOfInvestments = 100.
export function validateInvestmentBuckets(buckets: InvestmentBucket[]): InvestmentBucketErrors {
  const byBucket: InvestmentBucketErrors['byBucket'] = {}

  for (const bucket of buckets) {
    const bucketErrors: { name?: string; percentOfInvestments?: string } = {}
    if (!bucket.name.trim()) bucketErrors.name = 'Informe um nome para o objetivo.'
    if (!isValidPercent(bucket.percentOfInvestments)) {
      bucketErrors.percentOfInvestments = PERCENT_RANGE_ERROR
    }
    if (Object.keys(bucketErrors).length > 0) byBucket[bucket.id] = bucketErrors
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.percentOfInvestments, 0)
  const totalError =
    buckets.length === 0 ? 'Adicione pelo menos um objetivo de investimento.' : sumError(total)

  return { total: totalError, byBucket }
}

// Média ponderada do retorno esperado de cada bucket, peso = percentOfInvestments.
// Reaproveita calculateWeightedReturn sem mudança — lista vazia retorna 0, nunca NaN.
export function calculateBlendedExpectedReturn(buckets: InvestmentBucket[]): number {
  return calculateWeightedReturn(
    buckets.map((bucket) => ({
      amount: bucket.percentOfInvestments,
      expectedReturnRate: calculateModelExpectedReturn(
        resolveAllocationModel(bucket.allocationModel, bucket.customAllocation)
      ),
    }))
  )
}

export interface EssentialsComparison {
  budget: number
  real: number
  balance: number
}

// Mesmo sinal do "Saldo Despesa" da planilha pessoal do usuário: positivo = sobrou
// orçamento, negativo = estourou.
export function calculateEssentialsComparison(budget: number, real: number): EssentialsComparison {
  return { budget, real, balance: budget - real }
}

// M5.6: Valor recebido por pagamento

export interface PaydayAmounts {
  payday1Amount: number
  payday2Amount: number
}

// Divide a renda total entre os 2 pagamentos baseado no percentual do 1º.
// Arredonda o 1º a centavos e deixa o 2º como complement (soma fecha exata).
// Total 0 retorna ambos como 0.
export function splitIncomeByShare(total: number, sharePercent: number): PaydayAmounts {
  if (total <= 0) return { payday1Amount: 0, payday2Amount: 0 }
  const payday1 = Math.round((total * sharePercent) / 100 * 100) / 100
  return {
    payday1Amount: payday1,
    payday2Amount: Math.round((total - payday1) * 100) / 100,
  }
}

// Inverso: calcula o percentual do 1º pagamento a partir dos dois valores.
// Total 0 retorna 50 (default). Retorna 0–100.
export function shareFromAmounts(payday1Amount: number, payday2Amount: number): number {
  const total = payday1Amount + payday2Amount
  if (total <= 0) return 50
  return (payday1Amount / total) * 100
}

export interface PaydayAmountsErrors {
  payday1Amount?: string
  payday2Amount?: string
  total?: string
}

// Valida os valores em R$ de cada pagamento.
// 1 pagamento: payday1Amount > 0; payday2Amount ignorado.
// 2 pagamentos: payday1Amount + payday2Amount > 0 (cada um >= 0, o 2º pode ser 0).
export function validatePaydayAmounts(
  amounts: PaydayAmounts,
  hasSecondPayday: boolean
): PaydayAmountsErrors {
  const errors: PaydayAmountsErrors = {}

  if (!isFinite(amounts.payday1Amount) || amounts.payday1Amount < 0) {
    errors.payday1Amount = 'O valor precisa ser finito e não-negativo.'
  }

  if (hasSecondPayday) {
    if (!isFinite(amounts.payday2Amount) || amounts.payday2Amount < 0) {
      errors.payday2Amount = 'O valor precisa ser finito e não-negativo.'
    }
    const total = amounts.payday1Amount + amounts.payday2Amount
    if (total <= 0) {
      errors.total = 'A soma dos pagamentos precisa ser maior que 0.'
    }
  } else {
    if (amounts.payday1Amount <= 0) {
      errors.total = 'O valor do pagamento precisa ser maior que 0.'
    }
  }

  return errors
}

interface ResolveContext {
  riskProfile: RiskProfile
  hasSecondPayday: boolean
}

function hasFlatM5Shape(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.essentialsPercent === 'number' &&
    typeof raw.educationPercent === 'number' &&
    typeof raw.leisurePercent === 'number' &&
    typeof raw.investmentsPercent === 'number' &&
    typeof raw.allocationModel !== 'undefined'
  )
}

function hasNewShape(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.payday1Split === 'object' &&
    raw.payday1Split !== null &&
    Array.isArray(raw.investmentBuckets)
  )
}

// Guard de compatibilidade de runtime (não é script de migração multiusuário — só
// relevante para a própria conta de teste usada nas sessões anteriores), com 4 casos:
// (1) formato novo → usa direto; (2) formato M5 flat sem 2º pagamento → converte em
// memória para 1 PaydaySplit + 1 bucket; (3) formato M5 flat COM 2º pagamento → não há
// como migrar parcialmente (o doc antigo nunca soube de 2 pagamentos), cai no default
// novo; (4) formato M2 (3 categorias) ou doc ausente/corrompido → cai no default novo.
// Nunca escreve a conversão de volta no Firestore sozinho — só em memória, até o
// usuário salvar algo manualmente.
export function resolveStoredDistribution(
  stored: Distribution | null,
  context: ResolveContext
): Omit<Distribution, 'updatedAt'> {
  if (stored) {
    const raw = stored as unknown as Record<string, unknown>

    if (hasNewShape(raw)) {
      return stored
    }

    if (hasFlatM5Shape(raw) && !context.hasSecondPayday) {
      const legacy = stored as unknown as {
        essentialsPercent: number
        educationPercent: number
        leisurePercent: number
        investmentsPercent: number
        allocationModel: DistributionModelChoice
        customAllocation?: CustomAllocation
      }
      return {
        payday1Split: {
          essentialsPercent: legacy.essentialsPercent,
          educationPercent: legacy.educationPercent,
          leisurePercent: legacy.leisurePercent,
          investmentsPercent: legacy.investmentsPercent,
          companyCashPercent: 0,
        },
        investmentBuckets: [
          {
            id: generateId(),
            name: 'Meus Investimentos',
            percentOfInvestments: 100,
            allocationModel: legacy.allocationModel,
            ...(legacy.customAllocation ? { customAllocation: legacy.customAllocation } : {}),
          },
        ],
      }
    }
  }

  return getDefaultDistribution(context.riskProfile, context.hasSecondPayday)
}

export function useDistribution(uid: string | undefined) {
  const { currentUser, refreshCurrentUser } = useAuth()
  const portfolio = usePortfolio(uid)

  const [payday1Split, setPayday1Split] = useState<PaydaySplit>(
    () => getDefaultDistribution('moderate', false).payday1Split
  )
  const [payday2Split, setPayday2Split] = useState<PaydaySplit | undefined>(undefined)
  const [payday1IncomeSharePercent, setPayday1IncomeSharePercent] = useState<number | undefined>(
    undefined
  )
  const [investmentBuckets, setInvestmentBuckets] = useState<InvestmentBucket[]>(
    () => getDefaultDistribution('moderate', false).investmentBuckets
  )
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const hasSecondPayday = currentUser?.payday2 != null

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }
    if (!currentUser) return

    let cancelled = false
    getDistribution(uid).then((existing) => {
      if (cancelled) return
      const resolved = resolveStoredDistribution(existing, {
        riskProfile: currentUser.riskProfile,
        hasSecondPayday: currentUser.payday2 != null,
      })
      setPayday1Split(resolved.payday1Split)
      setPayday2Split(resolved.payday2Split)
      setPayday1IncomeSharePercent(resolved.payday1IncomeSharePercent)
      setInvestmentBuckets(resolved.investmentBuckets)
      setLoadingInitial(false)
    })
    return () => {
      cancelled = true
    }
  }, [uid, currentUser])

  const amounts = useMemo(() => {
    const monthlyIncomeNet = currentUser?.monthlyIncomeNet ?? 0
    const paydays: PaydayAmountInput[] = hasSecondPayday && payday2Split
      ? [
          { split: payday1Split, incomeShareFraction: (payday1IncomeSharePercent ?? 50) / 100 },
          { split: payday2Split, incomeShareFraction: 1 - (payday1IncomeSharePercent ?? 50) / 100 },
        ]
      : [{ split: payday1Split, incomeShareFraction: 1 }]
    return calculateDistributionAmounts(paydays, monthlyIncomeNet)
  }, [payday1Split, payday2Split, payday1IncomeSharePercent, hasSecondPayday, currentUser?.monthlyIncomeNet])

  const blendedExpectedReturn = useMemo(
    () => calculateBlendedExpectedReturn(investmentBuckets),
    [investmentBuckets]
  )

  const emergencyReserve = useMemo(
    () => calculateEmergencyReserve({ monthlyIncomeNet: currentUser?.monthlyIncomeNet ?? 0 }),
    [currentUser?.monthlyIncomeNet]
  )

  const goalCheck = useMemo<GoalTimelineResult | null>(() => {
    if (!currentUser) return null
    return calculateGoalTimeline({
      currentPatrimony: portfolio.totalValue,
      monthlyContribution: amounts.investments,
      annualReturnRate: blendedExpectedReturn,
      goalAmount: currentUser.goalAmount,
    })
  }, [currentUser, portfolio.totalValue, amounts.investments, blendedExpectedReturn])

  const saveNivelUm = useCallback(
    async (payload: {
      payday1Split: PaydaySplit
      payday2Split?: PaydaySplit
      payday1IncomeSharePercent?: number
      monthlyIncomeNet: number
    }) => {
      if (!uid) return
      setActionError(null)
      try {
        // M5.6: Escreve Distribution + User.monthlyIncomeNet (nesta ordem)
        const data: Partial<Omit<Distribution, 'updatedAt'>> = {
          payday1Split: payload.payday1Split,
        }
        if (payload.payday2Split) data.payday2Split = payload.payday2Split
        if (payload.payday1IncomeSharePercent !== undefined) {
          data.payday1IncomeSharePercent = payload.payday1IncomeSharePercent
        }
        await updateDistribution(uid, data)

        // Atualiza User.monthlyIncomeNet se mudou
        const incomeChanged = Math.abs((payload.monthlyIncomeNet || 0) - (currentUser?.monthlyIncomeNet || 0)) >= 0.005
        if (incomeChanged && currentUser) {
          await updateUserDocument(uid, { monthlyIncomeNet: payload.monthlyIncomeNet })
        }

        // Atualiza estado local
        setPayday1Split(payload.payday1Split)
        if (payload.payday2Split) setPayday2Split(payload.payday2Split)
        if (payload.payday1IncomeSharePercent !== undefined) {
          setPayday1IncomeSharePercent(payload.payday1IncomeSharePercent)
        }

        // Recarrega currentUser se renda mudou (afeta Dashboard, Reserva de Emergência)
        if (incomeChanged) {
          await refreshCurrentUser()
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao salvar a distribuição.')
        throw error
      }
    },
    [uid, currentUser, refreshCurrentUser]
  )

  const saveInvestmentBuckets = useCallback(
    async (buckets: InvestmentBucket[]) => {
      if (!uid) return
      setActionError(null)
      try {
        await updateDistribution(uid, { investmentBuckets: buckets })
        setInvestmentBuckets(buckets)
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Erro ao salvar os objetivos de investimento.'
        )
        throw error
      }
    },
    [uid]
  )

  return {
    loading: loadingInitial || portfolio.loadingInitial,
    hasSecondPayday,
    payday1Split,
    payday2Split,
    payday1IncomeSharePercent,
    investmentBuckets,
    amounts,
    blendedExpectedReturn,
    emergencyReserve,
    goalCheck,
    actionError,
    saveNivelUm,
    saveInvestmentBuckets,
  }
}
