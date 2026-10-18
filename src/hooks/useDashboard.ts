import { useAuth } from './useAuth'
import { useDistribution } from './useDistribution'
import { useProjection, type ProjectionAssumptionsData } from './useProjection'
import { useCheckins } from './useCheckins'
import type { ProjectionMetrics } from '../core/portfolioProjection'

export interface DashboardData {
  loading: boolean
  budgetAlert: boolean
  metrics: ProjectionMetrics | null
  assumptions: ProjectionAssumptionsData | null
  inflationRate: number
  distribution: ReturnType<typeof useDistribution>
}

export function useDashboard(): DashboardData {
  const { user, currentUser } = useAuth()
  const distribution = useDistribution(user?.uid)

  // Aderência dos últimos check-ins ajusta os aportes futuros (1 = sem histórico ou 100%).
  const checkins = useCheckins(user?.uid)

  // Aporte planejado = fatia de Investimentos + saldo das essenciais roteado pela regra do usuário.
  const projection = useProjection(distribution.flow?.investmentsPlan ?? 0, checkins.adherence)

  return {
    loading: projection.loading || distribution.loading || checkins.loadingInitial || !currentUser,
    // Alerta de orçamento (decisão do M4, inalterada): custo essencial maior que a renda líquida.
    budgetAlert: (currentUser?.essentialMonthlyCost ?? 0) > (currentUser?.monthlyIncomeNet ?? 0),
    metrics: projection.metrics,
    assumptions: projection.assumptions,
    inflationRate: projection.inflationRate,
    distribution,
  }
}
