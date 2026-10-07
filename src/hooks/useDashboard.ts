import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useDistribution } from './useDistribution'
import { useProjection } from './useProjection'

export interface DashboardMetrics {
  velocity: number
  budgetAlert: boolean
  meetsDeadline: boolean
  deadlineGapYears: number | null
  series: number[]
  boostedSeries: number[] | null
  showBoostInsight: boolean
}

export function useDashboard(): DashboardMetrics & { loading: boolean; inflationRate: number } {
  const { currentUser } = useAuth()
  const distribution = useDistribution(useAuth().user?.uid)

  // Aporte planejado = fatia de Investimentos + saldo roteado
  const investmentsPlan = distribution.flow?.investmentsPlan ?? 0

  // Usa o motor unificado de projeção
  const projection = useProjection(investmentsPlan)

  const metrics = useMemo(() => {
    if (!projection.metrics) {
      return {
        velocity: 0,
        budgetAlert: false,
        meetsDeadline: false,
        deadlineGapYears: null,
        series: [],
        boostedSeries: null,
        showBoostInsight: false,
      }
    }

    // Budget alert = custo essencial > renda (decisão do M4, inalterada)
    const budgetAlert = (currentUser?.essentialMonthlyCost ?? 0) > (currentUser?.monthlyIncomeNet ?? 0)

    return {
      velocity: projection.metrics.velocity,
      budgetAlert,
      meetsDeadline: projection.metrics.meetsDeadline,
      deadlineGapYears: projection.metrics.deadlineGapYears,
      series: projection.metrics.series,
      boostedSeries: projection.metrics.boostedSeries,
      showBoostInsight: projection.metrics.showBoostInsight,
    }
  }, [projection.metrics, currentUser?.essentialMonthlyCost, currentUser?.monthlyIncomeNet])

  return {
    ...metrics,
    loading: projection.loading || !currentUser,
    inflationRate: projection.inflationRate,
  }
}

