import { useCallback, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { useDistribution } from './useDistribution'
import { useCheckins } from './useCheckins'
import { buildProjectionMetrics, type ProjectionAssetSnapshot } from './useProjection'
import {
  compareCalendarDates,
  effectiveInvestmentDay,
  type CalendarDate,
} from '../core/businessDays'
import { calculateAdherence, splitPlanAcrossDays, type AnsweredCheckin } from '../core/checkin'
import {
  formatYearMonth,
  isContributionActive,
  resolveRemainingMonths,
  type YearMonth,
} from '../core/installments'
import { checkinIdFor, confirmCheckin, skipCheckin, type CheckinEntry } from '../services/checkinService'
import { getAssets } from '../services/assetService'
import type { InvestmentCheckinWithId, NewAssetDraft } from '../types/checkin'
import type { AssetWithId } from '../types/asset'
import type { User } from '../types/user'

export type SlotState = 'answered' | 'open' | 'upcoming'

export interface CheckinSlot {
  slot: number // 1 = primeiro dia de investir do mês
  configuredDay: number | null // null = "fim do mês"
  effective: CalendarDate
  plannedTotal: number
  state: SlotState
  checkin: InvestmentCheckinWithId | null
}

export interface BuildSlotsInput {
  today: CalendarDate
  investmentDays: number[]
  investmentsPlan: number
  // % da renda do 1º pagamento; só usado com 2 dias de investir e 2 pagamentos.
  firstPaydayShare: number | null
  checkins: InvestmentCheckinWithId[]
}

// Um slot por dia de investir do mês. Aberto = já chegou o dia (ou passou) e ainda não foi respondido;
// o usuário pode responder a qualquer hora depois disso, por isso "open" também vale para dias passados.
export function buildCheckinSlots({
  today,
  investmentDays,
  investmentsPlan,
  firstPaydayShare,
  checkins,
}: BuildSlotsInput): CheckinSlot[] {
  const days: (number | null)[] = investmentDays.length > 0 ? investmentDays : [null]
  const month: YearMonth = { year: today.year, month: today.month }
  const monthKey = formatYearMonth(month)
  const plans = splitPlanAcrossDays(investmentsPlan, days.length, days.length === 2 ? firstPaydayShare : null)

  return days.map((configuredDay, index) => {
    const slot = index + 1
    const effective = effectiveInvestmentDay(today.year, today.month, configuredDay)
    const checkin = checkins.find((c) => c.id === checkinIdFor(monthKey, slot)) ?? null
    let state: SlotState = 'upcoming'
    if (checkin) state = 'answered'
    else if (compareCalendarDates(effective, today) <= 0) state = 'open'
    return {
      slot,
      configuredDay,
      effective,
      plannedTotal: plans[index] ?? 0,
      state,
      checkin,
    }
  })
}

export interface PlannedRow {
  assetId: string
  name: string
  planned: number
}

// Linhas do check-in de um dia. A parcela programada (consórcio etc.) é cobrada no 1º dia de investir,
// então só o 1º slot a pré-preenche; o restante do plano aparece como "falta alocar".
export function buildAssetPlanRows(
  assets: AssetWithId[],
  slot: number,
  today: YearMonth
): { rows: PlannedRow[]; programmedTotal: number } {
  const rows = assets.map((asset) => {
    const remaining = resolveRemainingMonths(asset.contributionEndsAt, today)
    const programmed =
      slot === 1 && isContributionActive(asset.monthlyContribution, remaining)
        ? (asset.monthlyContribution ?? 0)
        : 0
    return { assetId: asset.id, name: asset.name, planned: programmed }
  })
  const programmedTotal = rows.reduce((sum, r) => sum + r.planned, 0)
  return { rows, programmedTotal }
}

// Resposta respondida, do mais recente para o mais antigo (mesma ordem da aderência).
export function answeredHistory(checkins: InvestmentCheckinWithId[]): AnsweredCheckin[] {
  return [...checkins]
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .map((c) => ({ plannedTotal: c.plannedTotal, investedTotal: c.investedTotal, status: c.status }))
}

export interface CheckinEffect {
  // true quando "antes" era só a estimativa do onboarding (conta sem ativos).
  estimatedBefore: boolean
  adherenceBefore: number
  adherenceAfter: number
  patrimonyBefore: number
  patrimonyAfter: number
  investedTotal: number
  yearsBefore: number | null
  yearsAfter: number | null
  reachableBefore: boolean
  reachableAfter: boolean
  goalAmount: number
  goalYears: number
}

export interface CheckinEffectInput {
  beforeAssets: AssetWithId[]
  afterAssets: AssetWithId[]
  beforeCheckins: InvestmentCheckinWithId[]
  afterCheckins: InvestmentCheckinWithId[]
  currentUser: Pick<
    User,
    'currentPatrimony' | 'goalAmount' | 'goalYears' | 'riskProfile' | 'monthlyIncomeNet' | 'inflationRate'
  >
  investmentsPlan: number
  today: YearMonth
}

// Arquivados ficam no Firestore e não compõem patrimônio nem projeção (mesma regra do usePortfolio).
const activeOnly = (assets: AssetWithId[]) => assets.filter((a) => a.status === 'active')
const sumValues = (assets: AssetWithId[]) => activeOnly(assets).reduce((sum, a) => sum + a.currentValue, 0)
const patrimonyOf = (assets: AssetWithId[], estimate: number) =>
  activeOnly(assets).length > 0 ? sumValues(assets) : estimate

// Antes × depois de um check-in, pelo mesmo motor do Radar: o "tempo até a meta" mostrado no
// fechamento bate com o que o Radar vai mostrar a seguir.
export function summarizeCheckinEffect(input: CheckinEffectInput): CheckinEffect {
  const snapshot = (assets: AssetWithId[], checkins: InvestmentCheckinWithId[]) => {
    const adherence = calculateAdherence(answeredHistory(checkins))
    const metrics = buildProjectionMetrics({
      assets: activeOnly(assets).map(toProjectionAsset),
      currentUser: input.currentUser,
      investmentsPlan: input.investmentsPlan,
      adherence,
      today: input.today,
    })
    return { metrics, adherence }
  }

  const before = snapshot(input.beforeAssets, input.beforeCheckins)
  const after = snapshot(input.afterAssets, input.afterCheckins)

  return {
    // Mesma regra do Radar: sem ativos, o patrimônio é a estimativa do onboarding.
    patrimonyBefore: patrimonyOf(input.beforeAssets, input.currentUser.currentPatrimony),
    patrimonyAfter: patrimonyOf(input.afterAssets, input.currentUser.currentPatrimony),
    estimatedBefore: activeOnly(input.beforeAssets).length === 0,
    investedTotal: Math.round((sumValues(input.afterAssets) - sumValues(input.beforeAssets)) * 100) / 100,
    adherenceBefore: before.adherence,
    adherenceAfter: after.adherence,
    yearsBefore: before.metrics.base.years,
    yearsAfter: after.metrics.base.years,
    reachableBefore: before.metrics.base.reachable,
    reachableAfter: after.metrics.base.reachable,
    goalAmount: input.currentUser.goalAmount,
    goalYears: input.currentUser.goalYears,
  }
}

function toProjectionAsset(asset: AssetWithId): ProjectionAssetSnapshot {
  return {
    name: asset.name,
    currentValue: asset.currentValue,
    expectedReturnRate: asset.expectedReturnRate,
    ...(asset.monthlyContribution !== undefined
      ? { monthlyContribution: asset.monthlyContribution, contributionEndsAt: asset.contributionEndsAt }
      : {}),
  }
}

export interface SlotSubmission {
  slot: number
  plannedTotal: number
  // Linhas de ativos existentes com o valor digitado.
  rows: { assetId: string; planned: number; invested: number }[]
  // Ativos novos criados a partir do check-in (o valor investido vira o saldo inicial).
  newAssets: { draft: NewAssetDraft; invested: number }[]
}

function todayCalendar(): CalendarDate {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

export function useInvestments(uid: string | undefined) {
  const { currentUser } = useAuth()
  const portfolio = usePortfolio(uid)
  const distribution = useDistribution(uid)
  const checkinState = useCheckins(uid)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastEffect, setLastEffect] = useState<CheckinEffect | null>(null)

  const today = useMemo(() => todayCalendar(), [])
  const investmentDays = useMemo(
    () => [...(currentUser?.investmentDays ?? [])].sort((a, b) => a - b),
    [currentUser?.investmentDays]
  )
  const investmentsPlan = distribution.flow?.investmentsPlan ?? 0
  const firstPaydayShare = distribution.hasSecondPayday ? (distribution.payday1IncomeSharePercent ?? 50) : null

  const slots = useMemo(
    () =>
      buildCheckinSlots({
        today,
        investmentDays,
        investmentsPlan,
        firstPaydayShare,
        checkins: checkinState.checkins,
      }),
    [today, investmentDays, investmentsPlan, firstPaydayShare, checkinState.checkins]
  )

  const monthYm: YearMonth = { year: today.year, month: today.month }
  const monthKey = formatYearMonth(monthYm)

  const confirm = useCallback(
    async (submission: SlotSubmission, slot: CheckinSlot): Promise<CheckinEffect | null> => {
      if (!uid || !currentUser) return null
      setSubmitting(true)
      setSubmitError(null)
      try {
        const beforeAssets = portfolio.assets
        const beforeCheckins = checkinState.checkins

        const entries: CheckinEntry[] = [
          ...submission.rows
            .filter((r) => r.planned > 0 || r.invested > 0)
            .map((r) => ({ assetId: r.assetId, planned: r.planned, invested: r.invested })),
          ...submission.newAssets.map((n) => ({
            // id gerado antes da transação: o ativo novo nasce com ele e o check-in o referencia.
            assetId: crypto.randomUUID(),
            planned: 0,
            invested: n.invested,
            newAsset: n.draft,
          })),
        ]

        await confirmCheckin(uid, {
          month: monthKey,
          slot: submission.slot,
          day: slot.effective.day,
          plannedTotal: submission.plannedTotal,
          entries,
        })

        const afterAssets = ((await portfolio.refresh()) ?? (await getAssets(uid))).filter(
          (a) => a.status === 'active'
        )
        const afterCheckins = (await checkinState.refresh()) ?? beforeCheckins
        const effect = summarizeCheckinEffect({
          beforeAssets,
          afterAssets,
          beforeCheckins,
          afterCheckins,
          currentUser,
          investmentsPlan,
          today: monthYm,
        })
        setLastEffect(effect)
        return effect
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o check-in.')
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [uid, currentUser, portfolio, checkinState, monthKey, investmentsPlan, monthYm]
  )

  const skip = useCallback(
    async (slot: CheckinSlot): Promise<boolean> => {
      if (!uid) return false
      setSubmitting(true)
      setSubmitError(null)
      try {
        await skipCheckin(uid, {
          month: monthKey,
          slot: slot.slot,
          day: slot.effective.day,
          plannedTotal: slot.plannedTotal,
        })
        await checkinState.refresh()
        return true
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar.')
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [uid, monthKey, checkinState]
  )

  // Mesma taxa real que o painel de premissas do Radar usa (carteira ou estratégia do perfil).
  const realReturnRate = useMemo(() => {
    if (!currentUser) return 0
    const metrics = buildProjectionMetrics({
      assets: portfolio.assets.filter((a) => a.status === 'active').map(toProjectionAsset),
      currentUser,
      investmentsPlan,
      adherence: checkinState.adherence,
      today: { year: today.year, month: today.month },
    })
    return metrics.rates.realUsed
  }, [currentUser, portfolio.assets, investmentsPlan, checkinState.adherence, today])

  return {
    loading: !currentUser || portfolio.loadingInitial || checkinState.loadingInitial || distribution.loading,
    currentUser,
    today,
    monthYm,
    investmentDays,
    investmentsPlan,
    realReturnRate,
    distribution,
    slots,
    assets: portfolio.assets,
    checkins: checkinState.checkins,
    adherence: checkinState.adherence,
    submitting,
    submitError,
    lastEffect,
    clearLastEffect: () => setLastEffect(null),
    confirm,
    skip,
    refreshAssets: portfolio.refresh,
  }
}


export interface InvestmentDaysErrors {
  days?: string
}

// Dias de investir: 0 (fim do mês), 1 ou 2 dias distintos entre 1 e 31.
export function validateInvestmentDays(days: number[]): InvestmentDaysErrors {
  if (days.length > 2) return { days: 'Escolha no máximo 2 dias.' }
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 31)) {
    return { days: 'Cada dia precisa ser um número entre 1 e 31.' }
  }
  if (days.length === 2 && days[0] === days[1]) {
    return { days: 'Os dois dias precisam ser diferentes.' }
  }
  return {}
}
