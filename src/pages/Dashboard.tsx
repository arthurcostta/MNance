import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePortfolio } from '../hooks/usePortfolio'
import { useDistribution } from '../hooks/useDistribution'
import { useDashboard } from '../hooks/useDashboard'
import BudgetAlertBanner from '../components/Dashboard/BudgetAlertBanner'
import ProjectionChart from '../components/Dashboard/ProjectionChart'
import { ProjectionAssumptions } from '../components/Dashboard/ProjectionAssumptions'
import Card from '../components/Common/Card'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'
import { updateUserDocument } from '../services/userService'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatYears(years: number | null): string {
  if (years === null) {
    return 'não atingida neste século'
  }
  if (years === 0) {
    return 'já alcançada'
  }

  const y = Math.floor(years)
  const months = Math.round((years - y) * 12)

  const yearsLabel = y > 0 ? `${y} ${y === 1 ? 'ano' : 'anos'}` : ''
  const monthsLabel = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : ''

  return [yearsLabel, monthsLabel].filter(Boolean).join(' e ')
}

export default function Dashboard() {
  const { currentUser, user } = useAuth()
  const portfolio = usePortfolio(user?.uid)
  const distribution = useDistribution(user?.uid)
  const dashboard = useDashboard()

  if (dashboard.loading || !currentUser) {
    return <LoadingState label="Carregando radar de patrimônio..." />
  }

  const { velocity, budgetAlert, meetsDeadline, deadlineGapYears, series, boostedSeries, showBoostInsight, inflationRate } = dashboard

  const handleInflationChange = async (newRate: number) => {
    if (!user?.uid) return
    await updateUserDocument(user.uid, { inflationRate: newRate })
    // Trigger refresh of currentUser to update the context
    // (this happens automatically via the effect in AuthContext)
  }

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

      {portfolio.totalValue === 0 && (
        <div className="mb-6">
          <Alert variant="info">
            Você ainda não tem ativos cadastrados — os números abaixo consideram apenas patrimônio inicial.{' '}
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
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {formatCurrency(portfolio.totalValue || currentUser.currentPatrimony || 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Velocidade de Crescimento</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(velocity)}/mês</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Tempo até a Meta</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {currentUser.goalYears ? `~${formatYears((dashboard.meetsDeadline ? dashboard.meetsDeadline : dashboard.deadlineGapYears) as any)}` : 'N/A'}
          </p>
          {!meetsDeadline && currentUser.goalYears && (
            <p className="mt-1 text-xs text-gray-500">
              Meta: {currentUser.goalYears} ano{currentUser.goalYears !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      </div>

      {!meetsDeadline && deadlineGapYears !== null && (
        <div className="mb-6">
          <Alert variant="warning">
            Essa meta, do jeito que está, levaria mais de {Math.ceil(deadlineGapYears + (currentUser.goalYears ?? 0))} anos para se realizar. Vamos
            ajustar alguma variável — aporte, prazo ou meta — para encontrar um caminho mais realista?
          </Alert>
        </div>
      )}

      {showBoostInsight && boostedSeries && (
        <div className="mb-6">
          <Alert variant="success">
            Aumentando seu aporte mensal em 20%, você chegaria à meta em aproximadamente{' '}
            <span className="font-semibold">{formatYears(series.length * 0.75)}</span> em vez de{' '}
            <span className="font-semibold">{formatYears(series.length)}</span>.
          </Alert>
        </div>
      )}

      <ProjectionChart series={series} boostedSeries={boostedSeries} goalAmount={currentUser.goalAmount} />

      <ProjectionAssumptions
        assetCount={portfolio.assets?.length ?? 0}
        totalValue={portfolio.totalValue || 0}
        portfolioWeightedReturn={portfolio.weightedReturn ?? 0}
        investmentsPlan={distribution.flow?.investmentsPlan ?? 0}
        inflationRate={inflationRate}
        onInflationChange={handleInflationChange}
      />

      {distribution.flow && distribution.amounts && (
        <Card className="mt-6">
          <p className="mb-2 text-xs font-medium text-gray-600">💎 Distribuição Ativa</p>
          <div className="space-y-1 text-sm text-gray-800">
            <p>Essenciais {formatCurrency(distribution.amounts.essentials)}</p>
            <p>Educação {formatCurrency(distribution.amounts.education)}</p>
            <p>Lazer {formatCurrency(distribution.flow.leisureTotal)}</p>
            <p>Investimentos {formatCurrency(distribution.flow.investmentsPlan)}</p>
            {distribution.amounts.companyCash > 0 && (
              <p>Caixa da Empresa {formatCurrency(distribution.amounts.companyCash)}</p>
            )}
          </div>
          {(distribution.flow.surplusToInvestments ?? 0) > 0 && (
            <p className="mt-2 text-xs text-gray-600">
              Investimentos inclui {formatCurrency(distribution.flow.surplusToInvestments ?? 0)} do saldo das
              despesas essenciais.
            </p>
          )}
          {distribution.flow.surplusPending && (
            <p className="mt-2 text-xs text-amber-800">
              Você tem {formatCurrency(distribution.flow.surplus ?? 0)} de saldo nas essenciais sem destino.{' '}
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
