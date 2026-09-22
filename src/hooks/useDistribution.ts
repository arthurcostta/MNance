import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  type AllocationModel,
} from '../core/allocationModels'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
import { calculateGoalTimeline, type GoalTimelineResult } from '../core/goalTimeline'
import {
  getDefaultDistribution,
  getDistribution,
  updateDistribution,
} from '../services/distributionService'
import type { CustomAllocation, Distribution, DistributionModelChoice } from '../types/distribution'

export interface NivelUmInput {
  essentialsPercent: number
  educationPercent: number
  leisurePercent: number
  investmentsPercent: number
}

export type NivelUmErrors = Partial<Record<keyof NivelUmInput, string>> & { total?: string }
export type CustomAllocationErrors = Partial<Record<keyof CustomAllocation, string>> & {
  total?: string
}

const SUM_TOLERANCE = 0.01
const PERCENT_RANGE_ERROR = 'O percentual precisa estar entre 0 e 100.'

function isValidPercent(value: number): boolean {
  return !isNaN(value) && isFinite(value) && value >= 0 && value <= 100
}

// CENÁRIO 37/38: soma precisa fechar em 100%, com tolerância de ponto flutuante — quando
// não fecha, o erro expõe a diferença exata (faltam/excedeu X%) em vez de uma mensagem genérica.
function sumError(total: number): string | undefined {
  const diff = total - 100
  if (Math.abs(diff) < SUM_TOLERANCE) return undefined
  return diff > 0
    ? `A soma excedeu 100% em ${diff.toFixed(1)}%.`
    : `Faltam ${Math.abs(diff).toFixed(1)}% para completar 100%.`
}

export function validateNivelUm(input: NivelUmInput): NivelUmErrors {
  const errors: NivelUmErrors = {}

  if (!isValidPercent(input.essentialsPercent)) errors.essentialsPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.educationPercent)) errors.educationPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.leisurePercent)) errors.leisurePercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.investmentsPercent)) errors.investmentsPercent = PERCENT_RANGE_ERROR

  const total =
    input.essentialsPercent + input.educationPercent + input.leisurePercent + input.investmentsPercent
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
}

export function calculateDistributionAmounts(
  nivelUm: NivelUmInput,
  monthlyIncomeNet: number
): DistributionAmounts {
  return {
    essentials: (nivelUm.essentialsPercent / 100) * monthlyIncomeNet,
    education: (nivelUm.educationPercent / 100) * monthlyIncomeNet,
    leisure: (nivelUm.leisurePercent / 100) * monthlyIncomeNet,
    investments: (nivelUm.investmentsPercent / 100) * monthlyIncomeNet,
  }
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

const DEFAULT_NIVEL_UM: NivelUmInput = {
  essentialsPercent: 55,
  educationPercent: 10,
  leisurePercent: 10,
  investmentsPercent: 25,
}

const DEFAULT_CUSTOM: CustomAllocation = { stocks: 30, bonds: 40, alternatives: 20, cash: 10 }

// Documento com o schema antigo do M2 (3 categorias) não tem educationPercent/leisurePercent
// — guard de runtime, não script de migração multiusuário (só relevante para a própria
// conta de teste usada nas sessões anteriores).
function isLegacyDocument(doc: Distribution): boolean {
  const raw = doc as unknown as Record<string, unknown>
  return typeof raw.educationPercent !== 'number' || typeof raw.leisurePercent !== 'number'
}

export function useDistribution(uid: string | undefined) {
  const { currentUser } = useAuth()
  const portfolio = usePortfolio(uid)

  const [nivelUm, setNivelUm] = useState<NivelUmInput>(DEFAULT_NIVEL_UM)
  const [modelChoice, setModelChoice] = useState<DistributionModelChoice>('ALL_WEATHER')
  const [customAllocation, setCustomAllocation] = useState<CustomAllocation>(DEFAULT_CUSTOM)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }
    let cancelled = false
    getDistribution(uid).then((existing) => {
      if (cancelled) return
      if (existing && !isLegacyDocument(existing)) {
        setNivelUm({
          essentialsPercent: existing.essentialsPercent,
          educationPercent: existing.educationPercent,
          leisurePercent: existing.leisurePercent,
          investmentsPercent: existing.investmentsPercent,
        })
        setModelChoice(existing.allocationModel)
        if (existing.customAllocation) setCustomAllocation(existing.customAllocation)
      } else if (currentUser) {
        const fallback = getDefaultDistribution(currentUser.riskProfile)
        setNivelUm({
          essentialsPercent: fallback.essentialsPercent,
          educationPercent: fallback.educationPercent,
          leisurePercent: fallback.leisurePercent,
          investmentsPercent: fallback.investmentsPercent,
        })
        setModelChoice(fallback.allocationModel)
      }
      setLoadingInitial(false)
    })
    return () => {
      cancelled = true
    }
  }, [uid, currentUser])

  const amounts = useMemo(
    () => calculateDistributionAmounts(nivelUm, currentUser?.monthlyIncomeNet ?? 0),
    [nivelUm, currentUser?.monthlyIncomeNet]
  )

  const resolvedModel = useMemo(
    () => resolveAllocationModel(modelChoice, customAllocation),
    [modelChoice, customAllocation]
  )

  const expectedReturn = useMemo(() => calculateModelExpectedReturn(resolvedModel), [resolvedModel])

  const emergencyReserve = useMemo(
    () => calculateEmergencyReserve({ monthlyIncomeNet: currentUser?.monthlyIncomeNet ?? 0 }),
    [currentUser?.monthlyIncomeNet]
  )

  const goalCheck = useMemo<GoalTimelineResult | null>(() => {
    if (!currentUser) return null
    return calculateGoalTimeline({
      currentPatrimony: portfolio.totalValue,
      monthlyContribution: amounts.investments,
      annualReturnRate: expectedReturn,
      goalAmount: currentUser.goalAmount,
    })
  }, [currentUser, portfolio.totalValue, amounts.investments, expectedReturn])

  const saveNivelUm = useCallback(
    async (values: NivelUmInput) => {
      if (!uid) return
      setActionError(null)
      try {
        await updateDistribution(uid, values)
        setNivelUm(values)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao salvar a distribuição.')
        throw error
      }
    },
    [uid]
  )

  const saveNivelDois = useCallback(
    async (choice: DistributionModelChoice, custom?: CustomAllocation) => {
      if (!uid) return
      setActionError(null)
      try {
        await updateDistribution(uid, {
          allocationModel: choice,
          ...(custom ? { customAllocation: custom } : {}),
        })
        setModelChoice(choice)
        if (custom) setCustomAllocation(custom)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao salvar o modelo de alocação.')
        throw error
      }
    },
    [uid]
  )

  return {
    loading: loadingInitial || portfolio.loadingInitial,
    nivelUm,
    modelChoice,
    customAllocation,
    amounts,
    resolvedModel,
    expectedReturn,
    emergencyReserve,
    goalCheck,
    actionError,
    saveNivelUm,
    saveNivelDois,
  }
}
