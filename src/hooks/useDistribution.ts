import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { useEssentialExpenses } from './useEssentialExpenses'
import { ALLOCATION_MODELS, type AllocationModel } from '../core/allocationModels'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
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
  PaydaySplit,
} from '../types/distribution'
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

// Valida um PaydaySplit de 5 campos (ganhou companyCashPercent no M5.5).
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

// Hoje só o AllocationModelPicker usa (reaproveitado na tela Investimentos, M5.9).
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

// M5.8: Destino do saldo das essenciais.
//
// O saldo (orçado − real) é um valor PLANEJADO por mês — não existe ledger de gastos reais.
// A regra é uma política permanente: "X% do saldo vai para Investimentos, o resto para Lazer",
// válida todo mês até o usuário editar. Sem regra salva (undefined) o saldo NÃO é roteado
// para lugar nenhum: o app não presume um destino que o usuário não declarou.

export interface MonthlyFlowInput {
  amounts: DistributionAmounts
  // Soma da lista detalhada de despesas essenciais.
  essentialsReal: number
  // Sem lista, "real = 0" faria o saldo ser o orçamento inteiro — enganoso. Sem lista, não há saldo.
  hasEssentialsList: boolean
  // 0–100; undefined = decisão pendente.
  surplusInvestmentsPercent?: number
}

export interface MonthlyFlow {
  balance: number // orçado − real (0 sem lista)
  surplus: number // saldo positivo
  deficit: number // estouro: quanto o real passa do orçado (positivo)
  surplusPending: boolean // há saldo e nenhuma regra salva
  surplusToInvestments: number
  surplusToLeisure: number
  // Fatia de Investimentos + saldo roteado = aporte mensal PLANEJADO (fonte única para o Radar,
  // a tela Investimentos e o lembrete).
  investmentsPlan: number
  leisureTotal: number // fatia de Lazer + saldo roteado
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateMonthlyFlow({
  amounts,
  essentialsReal,
  hasEssentialsList,
  surplusInvestmentsPercent,
}: MonthlyFlowInput): MonthlyFlow {
  // Arredonda a centavos só aqui: 3179.5500000000002 − 3179.55 não pode virar "saldo".
  const balance = hasEssentialsList ? roundCents(amounts.essentials - essentialsReal) : 0
  const surplus = Math.max(0, balance)
  const deficit = Math.max(0, -balance)
  const surplusPending = surplus > 0 && surplusInvestmentsPercent === undefined

  let surplusToInvestments = 0
  let surplusToLeisure = 0
  if (surplus > 0 && surplusInvestmentsPercent !== undefined) {
    surplusToInvestments = (surplus * surplusInvestmentsPercent) / 100
    surplusToLeisure = surplus - surplusToInvestments
  }

  return {
    balance,
    surplus,
    deficit,
    surplusPending,
    surplusToInvestments,
    surplusToLeisure,
    investmentsPlan: amounts.investments + surplusToInvestments,
    leisureTotal: amounts.leisure + surplusToLeisure,
  }
}

export function validateSurplusPercent(value: number): string | undefined {
  return isValidPercent(value) ? undefined : PERCENT_RANGE_ERROR
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
  hasSecondPayday: boolean
}

// Guard de runtime: aceita só o formato atual (tem payday1Split). Documento ausente ou de um
// formato antigo (M2 com 3 categorias, M5 "flat") cai no default — desde o M5.8 não convertemos
// mais o formato M5, que existia só para a conta de teste das primeiras sessões. O campo antigo
// `investmentBuckets`, quando presente, passa batido e é ignorado. Nunca escreve de volta no
// Firestore sozinho — só quando o usuário salva algo.
export function resolveStoredDistribution(
  stored: Distribution | null,
  context: ResolveContext
): Omit<Distribution, 'updatedAt'> {
  if (stored?.payday1Split) return stored
  return getDefaultDistribution(context.hasSecondPayday)
}

export function useDistribution(uid: string | undefined) {
  const { currentUser, refreshCurrentUser } = useAuth()
  // Uma única instância da lista de essenciais, compartilhada com a tela (via props): duas
  // instâncias divergiriam depois de adicionar/excluir uma despesa.
  const essentialExpenses = useEssentialExpenses(uid)

  const [payday1Split, setPayday1Split] = useState<PaydaySplit>(
    () => getDefaultDistribution(false).payday1Split
  )
  const [payday2Split, setPayday2Split] = useState<PaydaySplit | undefined>(undefined)
  const [payday1IncomeSharePercent, setPayday1IncomeSharePercent] = useState<number | undefined>(
    undefined
  )
  const [surplusInvestmentsPercent, setSurplusInvestmentsPercent] = useState<number | undefined>(
    undefined
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
        hasSecondPayday: currentUser.payday2 != null,
      })
      setPayday1Split(resolved.payday1Split)
      setPayday2Split(resolved.payday2Split)
      setPayday1IncomeSharePercent(resolved.payday1IncomeSharePercent)
      setSurplusInvestmentsPercent(resolved.surplusInvestmentsPercent)
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

  const hasEssentialsList = essentialExpenses.items.length > 0

  const flow = useMemo(
    () =>
      calculateMonthlyFlow({
        amounts,
        essentialsReal: essentialExpenses.total,
        hasEssentialsList,
        surplusInvestmentsPercent,
      }),
    [amounts, essentialExpenses.total, hasEssentialsList, surplusInvestmentsPercent]
  )

  const emergencyReserve = useMemo(
    () => calculateEmergencyReserve({ monthlyIncomeNet: currentUser?.monthlyIncomeNet ?? 0 }),
    [currentUser?.monthlyIncomeNet]
  )

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

  const saveSurplusRule = useCallback(
    async (percent: number) => {
      if (!uid) return
      const validationError = validateSurplusPercent(percent)
      if (validationError) {
        setActionError(validationError)
        throw new Error(validationError)
      }
      setActionError(null)
      try {
        await updateDistribution(uid, { surplusInvestmentsPercent: percent })
        setSurplusInvestmentsPercent(percent)
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Erro ao salvar o destino do saldo.'
        )
        throw error
      }
    },
    [uid]
  )

  return {
    loading: loadingInitial || essentialExpenses.loadingInitial,
    hasSecondPayday,
    payday1Split,
    payday2Split,
    payday1IncomeSharePercent,
    surplusInvestmentsPercent,
    amounts,
    flow,
    essentialExpenses,
    hasEssentialsList,
    emergencyReserve,
    actionError,
    saveNivelUm,
    saveSurplusRule,
  }
}
