import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { useEssentialExpenses } from './useEssentialExpenses'
import { ALLOCATION_MODELS, type AllocationModel } from '../core/allocationModels'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
import {
  LEGACY_COMPANY_CASH_ID,
  LEGACY_COMPANY_CASH_NAME,
  type CustomCategory,
} from '../core/distributionCategories'
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
  LegacyPaydaySplit,
  PaydaySplit,
  StoredDistribution,
} from '../types/distribution'
import { formatPercent } from '../utils/formatPercent'

export type NivelUmInput = PaydaySplit
type DefaultPercentKey = 'essentialsPercent' | 'educationPercent' | 'leisurePercent' | 'investmentsPercent'
export type NivelUmErrors = Partial<Record<DefaultPercentKey, string>> & {
  total?: string
  // Erro por categoria personalizada (id → mensagem).
  custom?: Record<string, string>
}
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

// Soma de um dia de pagamento: as 4 padrão + as personalizadas existentes (ausente = 0).
function splitTotal(input: PaydaySplit, categories: CustomCategory[]): number {
  const custom = categories.reduce((sum, c) => sum + (input.customPercents[c.id] ?? 0), 0)
  return input.essentialsPercent + input.educationPercent + input.leisurePercent + input.investmentsPercent + custom
}

// Valida um dia de pagamento: cada percentual em 0–100 e a soma (padrão + personalizadas) em 100%.
export function validateNivelUm(input: PaydaySplit, categories: CustomCategory[] = []): NivelUmErrors {
  const errors: NivelUmErrors = {}

  if (!isValidPercent(input.essentialsPercent)) errors.essentialsPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.educationPercent)) errors.educationPercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.leisurePercent)) errors.leisurePercent = PERCENT_RANGE_ERROR
  if (!isValidPercent(input.investmentsPercent)) errors.investmentsPercent = PERCENT_RANGE_ERROR

  const custom: Record<string, string> = {}
  for (const category of categories) {
    const value = input.customPercents[category.id] ?? 0
    if (!isValidPercent(value)) custom[category.id] = PERCENT_RANGE_ERROR
  }
  if (Object.keys(custom).length > 0) errors.custom = custom

  const totalError = sumError(splitTotal(input, categories))
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
  // Valor em R$ de cada categoria personalizada, pelo id.
  custom: Record<string, number>
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
    custom: {},
  }

  for (const { split, incomeShareFraction } of paydays) {
    const paydayIncome = monthlyIncomeNet * incomeShareFraction
    totals.essentials += (split.essentialsPercent / 100) * paydayIncome
    totals.education += (split.educationPercent / 100) * paydayIncome
    totals.leisure += (split.leisurePercent / 100) * paydayIncome
    totals.investments += (split.investmentsPercent / 100) * paydayIncome
    for (const [id, percent] of Object.entries(split.customPercents)) {
      totals.custom[id] = (totals.custom[id] ?? 0) + (percent / 100) * paydayIncome
    }
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

export type ResolvedDistribution = Omit<Distribution, 'updatedAt'> & { customCategories: CustomCategory[] }

const hasLegacyCash = (split?: LegacyPaydaySplit) => (split?.companyCashPercent ?? 0) > 0

// Converte um dia de pagamento do formato anterior. Se havia "Caixa da Empresa", ela vira a
// categoria personalizada de mesmo id; sem ela, só sai o campo antigo.
function toCurrentSplit(split: LegacyPaydaySplit, legacyId: string | null): PaydaySplit {
  const customPercents: Record<string, number> = { ...(split.customPercents ?? {}) }
  if (legacyId) customPercents[legacyId] = split.companyCashPercent ?? 0
  return {
    essentialsPercent: split.essentialsPercent,
    educationPercent: split.educationPercent,
    leisurePercent: split.leisurePercent,
    investmentsPercent: split.investmentsPercent,
    customPercents,
  }
}

// Guard de runtime. Documento ausente ou sem os campos do formato atual cai no default.
// Documento com "companyCashPercent" (formato anterior) é convertido em memória: o valor da
// antiga 5ª categoria vira a personalizada "Caixa da Empresa". Nada é gravado até o usuário
// salvar. O campo antigo `investmentBuckets`, quando presente, é ignorado.
export function resolveStoredDistribution(
  stored: StoredDistribution | null,
  context: ResolveContext
): ResolvedDistribution {
  if (!stored?.payday1Split) {
    return getDefaultDistribution(context.hasSecondPayday) as ResolvedDistribution
  }

  const legacy = hasLegacyCash(stored.payday1Split) || hasLegacyCash(stored.payday2Split)
  const legacyId = legacy ? LEGACY_COMPANY_CASH_ID : null
  const base = stored.customCategories ?? []
  const customCategories =
    legacy && !base.some((c) => c.id === LEGACY_COMPANY_CASH_ID)
      ? [...base, { id: LEGACY_COMPANY_CASH_ID, name: LEGACY_COMPANY_CASH_NAME }]
      : base

  return {
    payday1Split: toCurrentSplit(stored.payday1Split, legacyId),
    ...(stored.payday2Split ? { payday2Split: toCurrentSplit(stored.payday2Split, legacyId) } : {}),
    ...(stored.payday1IncomeSharePercent !== undefined
      ? { payday1IncomeSharePercent: stored.payday1IncomeSharePercent }
      : {}),
    ...(stored.surplusInvestmentsPercent !== undefined
      ? { surplusInvestmentsPercent: stored.surplusInvestmentsPercent }
      : {}),
    customCategories,
  }
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
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
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
      setCustomCategories(resolved.customCategories)
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
      customCategories: CustomCategory[]
    }) => {
      if (!uid) return
      setActionError(null)
      try {
        // Escreve Distribution + User.monthlyIncomeNet (nesta ordem)
        const data: Partial<Omit<Distribution, 'updatedAt'>> = {
          payday1Split: payload.payday1Split,
          customCategories: payload.customCategories,
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
        setCustomCategories(payload.customCategories)

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
    customCategories,
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
