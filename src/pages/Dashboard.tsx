import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import BudgetAlertBanner from '../components/Dashboard/BudgetAlertBanner'
import ProjectionChart from '../components/Dashboard/ProjectionChart'
import { ProjectionAssumptions } from '../components/Dashboard/ProjectionAssumptions'
import RadarHero from '../components/Dashboard/RadarHero'
import StatTile from '../components/Dashboard/StatTile'
import LeverChips, { type LeverChipItem } from '../components/Dashboard/LeverChips'
import GoalGapCard from '../components/Dashboard/GoalGapCard'
import DistributionBar, { type DistributionSegment } from '../components/Dashboard/DistributionBar'
import Alert from '../components/Common/Alert'
import Card from '../components/Common/Card'
import LoadingState from '../components/Common/LoadingState'
import InvestmentCheckinBanner from '../components/Dashboard/InvestmentCheckinBanner'
import { updateUserDocument } from '../services/userService'
import { leverDelta } from '../core/radarView'
import { formatCompactBRL } from '../utils/formatCurrency'
import { formatPercent } from '../utils/formatPercent'

// Segmentos da barra de distribuição. As cores só diferenciam as fatias; a legenda traz o nome e o valor.
const SEGMENT_COLORS = {
  essentials: 'bg-gray-700',
  education: 'bg-blue-400',
  leisure: 'bg-amber-300',
  investments: 'bg-green-600',
  companyCash: 'bg-purple-400',
}

export default function Dashboard() {
  const { currentUser, user, refreshCurrentUser } = useAuth()
  const dashboard = useDashboard()

  if (dashboard.loading || !currentUser || !dashboard.metrics || !dashboard.assumptions) {
    return <LoadingState label="Carregando radar de patrimônio..." />
  }

  const { metrics, assumptions, budgetAlert, distribution, inflationRate } = dashboard
  const { goalAmount, goalYears } = currentUser
  const { base, conservative, optimistic, boosted, stepUp, requiredContribution, contributions } = metrics

  const handleInflationChange = async (newRate: number) => {
    if (!user?.uid) return
    await updateUserDocument(user.uid, { inflationRate: newRate })
    await refreshCurrentUser()
  }

  // Com parcelas programadas (ex.: consórcio), as alavancas incidem só sobre o aporte livre.
  const leverTarget = contributions.committed > 0 ? 'no aporte livre' : 'no aporte'
  const leverItems: LeverChipItem[] = []
  if (boosted) leverItems.push({ label: `+20% ${leverTarget}`, delta: leverDelta(base, boosted), swatch: true })
  if (stepUp) leverItems.push({ label: '+3% ao ano no aporte', delta: leverDelta(base, stepUp) })

  const segments: DistributionSegment[] = distribution.flow && distribution.amounts
    ? [
        { label: 'Essenciais', value: distribution.amounts.essentials, colorClass: SEGMENT_COLORS.essentials },
        { label: 'Educação', value: distribution.amounts.education, colorClass: SEGMENT_COLORS.education },
        { label: 'Lazer', value: distribution.flow.leisureTotal, colorClass: SEGMENT_COLORS.leisure },
        { label: 'Investimentos', value: distribution.flow.investmentsPlan, colorClass: SEGMENT_COLORS.investments },
        { label: 'Caixa da Empresa', value: distribution.amounts.companyCash, colorClass: SEGMENT_COLORS.companyCash },
      ]
    : []

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Radar de Patrimônio</h1>

      <InvestmentCheckinBanner uid={user?.uid} />

      {budgetAlert && (
        <BudgetAlertBanner
          essentialMonthlyCost={currentUser.essentialMonthlyCost}
          monthlyIncomeNet={currentUser.monthlyIncomeNet}
        />
      )}

      {assumptions.estimated && (
        <Alert variant="info">
          Estimativa: sem ativos cadastrados.{' '}
          <Link to="/portfolio" className="font-medium underline">
            Cadastre seus ativos
          </Link>{' '}
          para um Radar preciso.
        </Alert>
      )}

      <RadarHero
        goalYears={goalYears}
        goalAmount={goalAmount}
        currentPatrimony={assumptions.startingPatrimony}
        baseYears={base.years}
        optimisticYears={optimistic.years}
        conservativeYears={conservative.years}
        horizonYears={metrics.horizonYears}
        meetsDeadline={metrics.meetsDeadline}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label={assumptions.estimated ? 'Patrimônio (est.)' : 'Patrimônio'}
          value={formatCompactBRL(assumptions.startingPatrimony)}
        />
        <StatTile label="Entra por mês" value={`${formatCompactBRL(metrics.velocity)}`} />
        <StatTile label="Retorno real" value={`${formatPercent(assumptions.realRate * 100)} a.a.`} />
      </div>

      <LeverChips items={leverItems} />

      <ProjectionChart
        base={base.series}
        conservative={conservative.series}
        optimistic={optimistic.series}
        boosted={boosted?.series ?? null}
        goalAmount={goalAmount}
        goalYears={goalYears}
        yearsToGoal={base.years}
        inflationRate={inflationRate}
      />

      <GoalGapCard
        goalYears={goalYears}
        effectiveMonthly={contributions.effectiveMonthly}
        committed={contributions.committed}
        requiredMonthly={requiredContribution.base}
        requiredConservative={requiredContribution.conservative}
        deadlinePercent={metrics.deadlineProgressPercent}
      />

      {segments.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Divisão mensal</p>
            <Link to="/distribution" className="text-sm text-blue-600 hover:underline">
              Editar
            </Link>
          </div>
          <DistributionBar segments={segments} />
          {distribution.flow?.surplusPending && (
            <p className="mt-3 text-xs text-amber-800">
              Saldo de {formatCompactBRL(distribution.flow.surplus ?? 0)} nas essenciais sem destino.{' '}
              <Link to="/distribution" className="font-medium underline">
                Decidir agora
              </Link>
            </p>
          )}
        </Card>
      )}

      <ProjectionAssumptions assumptions={assumptions} onInflationChange={handleInflationChange} />
    </div>
  )
}
