import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import type { GoalTimelineResult } from '../core/goalTimeline'
import BudgetAlertBanner from '../components/Dashboard/BudgetAlertBanner'
import ProjectionChart from '../components/Dashboard/ProjectionChart'
import Card from '../components/Common/Card'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'

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
  const { loading, metrics, chartSeries, currentPatrimony, hasAssets, distributionSummary } =
    useDashboard()

  if (loading || !metrics || !currentUser) {
    return <LoadingState label="Carregando radar de patrimônio..." />
  }

  const { base, boosted, showBoostInsight, velocity, monthlyContribution, budgetAlert } = metrics

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Radar de Patrimônio</h1>

      {budgetAlert && (
        <div className="mb-6">
          <BudgetAlertBanner
            essentialMonthlyCost={currentUser.essentialMonthlyCost}
            monthlyIncomeNet={currentUser.monthlyIncomeNet}
          />
        </div>
      )}

      {!hasAssets && (
        <div className="mb-6">
          <Alert variant="info">
            Você ainda não tem ativos cadastrados — os números abaixo consideram patrimônio zero.{' '}
            <Link to="/portfolio" className="font-medium underline">
              Cadastre seus ativos no Portfólio
            </Link>{' '}
            para um Radar preciso.
          </Alert>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-gray-600">Patrimônio Atual</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(currentPatrimony)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Velocidade de Crescimento</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(velocity)}/mês</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Tempo até a Meta</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatTimeToGoal(base)}</p>
        </Card>
      </div>

      {!base.reachable && (
        <div className="mb-6">
          <Alert variant="warning">
            Essa meta, do jeito que está, levaria mais de {base.capYears} anos para se realizar. Vamos
            ajustar alguma variável — aporte, prazo ou meta — para encontrar um caminho mais realista?
          </Alert>
        </div>
      )}

      {showBoostInsight && boosted && (
        <div className="mb-6">
          <Alert variant="success">
            Aumentando seu aporte mensal em 20% (de {formatCurrency(monthlyContribution)} para{' '}
            {formatCurrency(monthlyContribution * 1.2)}), você chegaria à meta em{' '}
            <span className="font-semibold">{formatTimeToGoal(boosted)}</span> em vez de{' '}
            <span className="font-semibold">{formatTimeToGoal(base)}</span>.
          </Alert>
        </div>
      )}

      <ProjectionChart series={chartSeries} showBoosted={showBoostInsight} />

      {distributionSummary && (
        <Card className="mt-6">
          <p className="mb-2 text-xs font-medium text-gray-600">💎 Distribuição Ativa</p>
          <div className="space-y-1 text-sm text-gray-800">
            <p>Essenciais {formatCurrency(distributionSummary.amounts.essentials)}</p>
            <p>Educação {formatCurrency(distributionSummary.amounts.education)}</p>
            <p>Lazer {formatCurrency(distributionSummary.flow.leisureTotal)}</p>
            <p>Investimentos {formatCurrency(distributionSummary.flow.investmentsPlan)}</p>
            {distributionSummary.amounts.companyCash > 0 && (
              <p>Caixa da Empresa {formatCurrency(distributionSummary.amounts.companyCash)}</p>
            )}
          </div>
          {distributionSummary.flow.surplusToInvestments > 0 && (
            <p className="mt-2 text-xs text-gray-600">
              Investimentos inclui {formatCurrency(distributionSummary.flow.surplusToInvestments)} do saldo das
              despesas essenciais.
            </p>
          )}
          {distributionSummary.flow.surplusPending && (
            <p className="mt-2 text-xs text-amber-800">
              Você tem {formatCurrency(distributionSummary.flow.surplus)} de saldo nas essenciais sem destino.{' '}
              <Link to="/distribution" className="font-medium underline">
                Decidir agora
              </Link>
            </p>
          )}
          <Link to="/distribution" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Editar distribuição
          </Link>
        </Card>
      )}
    </div>
  )
}
