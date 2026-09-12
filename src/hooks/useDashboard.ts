import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { calculateGoalTimeline, type GoalTimelineResult } from '../core/goalTimeline'
import { calculateProjection } from '../core/projection'
import { annualToMonthlyRate } from '../core/compoundInterest'

// Feature #2 (Radar/Dashboard) — decisão de produto fechada em M4: o PRD (§4.2) pede a
// velocidade de crescimento como "última média de 3 meses de aporte real + ganhos
// projetados", mas não existe (nem está previsto até M15) nenhum ledger de aportes reais.
// Substituto (desvio consciente, mesmo padrão de emergencyReserve.ts em M1): aporte mensal
// derivado de renda - custo, mais o ganho projetado do patrimônio já investido.
const BOOST_FACTOR = 1.2

export interface DashboardMetricsInput {
  currentPatrimony: number
  monthlyIncomeNet: number
  essentialMonthlyCost: number
  weightedReturn: number
  goalAmount: number
}

export interface DashboardMetrics {
  monthlyContribution: number
  velocity: number
  budgetAlert: boolean
  base: GoalTimelineResult
  boosted: GoalTimelineResult | null
  showBoostInsight: boolean
}

export function calculateDashboardMetrics({
  currentPatrimony,
  monthlyIncomeNet,
  essentialMonthlyCost,
  weightedReturn,
  goalAmount,
}: DashboardMetricsInput): DashboardMetrics {
  const monthlyContribution = monthlyIncomeNet - essentialMonthlyCost
  const budgetAlert = essentialMonthlyCost > monthlyIncomeNet

  const velocity = monthlyContribution + currentPatrimony * annualToMonthlyRate(weightedReturn)

  const base = calculateGoalTimeline({
    currentPatrimony,
    monthlyContribution,
    annualReturnRate: weightedReturn,
    goalAmount,
  })

  const alreadyReached = base.reachable && base.months === 0

  let boosted: GoalTimelineResult | null = null
  let showBoostInsight = false

  if (monthlyContribution > 0 && !alreadyReached) {
    boosted = calculateGoalTimeline({
      currentPatrimony,
      monthlyContribution: monthlyContribution * BOOST_FACTOR,
      annualReturnRate: weightedReturn,
      goalAmount,
    })

    // "Numericamente idêntico ao base" (decisão #4 do plano de M4): comparar reachable +
    // months em vez de patrimonyAtCap evita falso-negativo por ruído de ponto flutuante, e
    // cobre o caso em que nem o aporte turbinado muda o resultado dentro do teto de 100 anos.
    const sameOutcome = boosted.reachable === base.reachable && boosted.months === base.months
    showBoostInsight = !sameOutcome
  }

  return { monthlyContribution, velocity, budgetAlert, base, boosted, showBoostInsight }
}

export interface ProjectionPoint {
  year: number
  base: number
  boosted?: number
}

export function useDashboard() {
  const { user, currentUser, loading: authLoading } = useAuth()
  const portfolio = usePortfolio(user?.uid)

  const metrics = useMemo(() => {
    if (!currentUser) return null
    return calculateDashboardMetrics({
      currentPatrimony: portfolio.totalValue,
      monthlyIncomeNet: currentUser.monthlyIncomeNet,
      essentialMonthlyCost: currentUser.essentialMonthlyCost,
      weightedReturn: portfolio.weightedReturn,
      goalAmount: currentUser.goalAmount,
    })
  }, [currentUser, portfolio.totalValue, portfolio.weightedReturn])

  const chartSeries = useMemo<ProjectionPoint[]>(() => {
    if (!metrics) return []

    const horizonYears = Math.max(
      1,
      Math.min(Math.ceil(metrics.base.years ?? metrics.base.capYears), metrics.base.capYears)
    )

    const points: ProjectionPoint[] = []
    for (let year = 0; year <= horizonYears; year++) {
      const point: ProjectionPoint = {
        year,
        base: calculateProjection({
          currentPatrimony: portfolio.totalValue,
          monthlyContribution: metrics.monthlyContribution,
          annualReturnRate: portfolio.weightedReturn,
          years: year,
        }).finalAmount,
      }

      if (metrics.showBoostInsight) {
        point.boosted = calculateProjection({
          currentPatrimony: portfolio.totalValue,
          monthlyContribution: metrics.monthlyContribution * BOOST_FACTOR,
          annualReturnRate: portfolio.weightedReturn,
          years: year,
        }).finalAmount
      }

      points.push(point)
    }
    return points
  }, [metrics, portfolio.totalValue, portfolio.weightedReturn])

  return {
    loading: authLoading || portfolio.loadingInitial,
    metrics,
    chartSeries,
    currentPatrimony: portfolio.totalValue,
    hasAssets: portfolio.assets.length > 0,
  }
}
