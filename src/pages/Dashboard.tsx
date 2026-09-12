import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import type { GoalTimelineResult } from '../core/goalTimeline'
import BudgetAlertBanner from '../components/Dashboard/BudgetAlertBanner'
import ProjectionChart from '../components/Dashboard/ProjectionChart'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatTimeToGoal(result: GoalTimelineResult): string {
  if (!result.reachable || result.months === null) {
    return `mais de ${result.capYears} anos`
  }
  if (result.months === 0) {
    return 'já alcançada'
  }

  const years = Math.floor(result.months / 12)
  const months = result.months % 12

  const yearsLabel = years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : ''
  const monthsLabel = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : ''

  return [yearsLabel, monthsLabel].filter(Boolean).join(' e ')
}

export default function Dashboard() {
  const { currentUser } = useAuth()
  const { loading, metrics, chartSeries, currentPatrimony, hasAssets } = useDashboard()

  if (loading || !metrics || !currentUser) {
    return <div className="p-4 text-sm text-gray-500">Carregando radar de patrimônio...</div>
  }

  const { base, boosted, showBoostInsight, velocity, monthlyContribution, budgetAlert } = metrics

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Radar de Patrimônio</h1>

      {budgetAlert && (
        <BudgetAlertBanner
          essentialMonthlyCost={currentUser.essentialMonthlyCost}
          monthlyIncomeNet={currentUser.monthlyIncomeNet}
        />
      )}

      {!hasAssets && (
        <div className="mb-6 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Você ainda não tem ativos cadastrados — os números abaixo consideram patrimônio zero.{' '}
          <Link to="/portfolio" className="font-medium text-blue-600 hover:underline">
            Cadastre seus ativos no Portfólio
          </Link>{' '}
          para um Radar preciso.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-600">Patrimônio Atual</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(currentPatrimony)}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-600">Velocidade de Crescimento</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(velocity)}/mês</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-600">Tempo até a Meta</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatTimeToGoal(base)}</p>
        </div>
      </div>

      {!base.reachable && (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-gray-800">
          Essa meta, do jeito que está, levaria mais de {base.capYears} anos para se realizar. Vamos
          ajustar alguma variável — aporte, prazo ou meta — para encontrar um caminho mais realista?
        </div>
      )}

      {showBoostInsight && boosted && (
        <div className="mb-6 rounded border border-green-200 bg-green-50 p-4 text-sm text-gray-800">
          Aumentando seu aporte mensal em 20% (de {formatCurrency(monthlyContribution)} para{' '}
          {formatCurrency(monthlyContribution * 1.2)}), você chegaria à meta em{' '}
          <span className="font-semibold">{formatTimeToGoal(boosted)}</span> em vez de{' '}
          <span className="font-semibold">{formatTimeToGoal(base)}</span>.
        </div>
      )}

      <ProjectionChart series={chartSeries} showBoosted={showBoostInsight} />
    </div>
  )
}
