import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import BudgetAlertBanner from '../components/Dashboard/BudgetAlertBanner'
import ProjectionChart from '../components/Dashboard/ProjectionChart'
import { ProjectionAssumptions } from '../components/Dashboard/ProjectionAssumptions'
import Card from '../components/Common/Card'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'
import { updateUserDocument } from '../services/userService'
import type { ProjectionVariant } from '../core/portfolioProjection'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatYears(years: number): string {
  if (years === 0) {
    return 'já alcançada'
  }

  const wholeYears = Math.floor(years)
  const months = Math.round((years - wholeYears) * 12)

  const yearsLabel = wholeYears > 0 ? `${wholeYears} ${wholeYears === 1 ? 'ano' : 'anos'}` : ''
  const monthsLabel = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : ''

  return [yearsLabel, monthsLabel].filter(Boolean).join(' e ')
}

function formatTimeToGoal(variant: ProjectionVariant, horizonYears: number): string {
  return variant.years === null ? `mais de ${horizonYears} anos` : formatYears(variant.years)
}

// Descreve o efeito de uma alavanca com os números do próprio motor. Devolve null quando ela não muda o resultado.
function describeLever(
  label: string,
  lever: ProjectionVariant,
  base: ProjectionVariant,
  goalYears: number
): string | null {
  if (lever.years !== null && base.years !== null) {
    if (lever.years === base.years) return null
    return `${label}: você chega à meta em ${formatYears(lever.years)} (em vez de ${formatYears(base.years)}).`
  }
  if (lever.years !== null) {
    return `${label}: a meta passaria a ser atingida em ${formatYears(lever.years)}.`
  }
  return `${label}: ${formatCurrency(lever.valueAtDeadline)} em ${goalYears} anos (hoje: ${formatCurrency(base.valueAtDeadline)}).`
}

export default function Dashboard() {
  const { currentUser, user, refreshCurrentUser } = useAuth()
  const dashboard = useDashboard()

  if (dashboard.loading || !currentUser || !dashboard.metrics || !dashboard.assumptions) {
    return <LoadingState label="Carregando radar de patrimônio..." />
  }

  const { metrics, assumptions, budgetAlert, distribution, inflationRate } = dashboard
  const { goalAmount, goalYears } = currentUser
  const { base, conservative, optimistic, boosted, stepUp, requiredContribution } = metrics

  const handleInflationChange = async (newRate: number) => {
    if (!user?.uid) return
    await updateUserDocument(user.uid, { inflationRate: newRate })
    await refreshCurrentUser()
  }

  const levers = [
    boosted ? describeLever('Aumentando o aporte em 20%', boosted, base, goalYears) : null,
    stepUp
      ? describeLever('Se o aporte crescer 3% ao ano acima da inflação', stepUp, base, goalYears)
      : null,
  ].filter((line): line is string => line !== null)

  const monthlyNeeded = requiredContribution.base
  const monthlyNeededConservative = requiredContribution.conservative

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

      {assumptions.estimated && (
        <div className="mb-6">
          <Alert variant="info">
            Você ainda não tem ativos cadastrados — a projeção usa o patrimônio informado no onboarding e o retorno da
            estratégia do seu perfil (estimativa).{' '}
            <Link to="/portfolio" className="font-medium underline">
              Cadastre seus ativos no Portfólio
            </Link>{' '}
            para um Radar preciso.
          </Alert>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-gray-600">Patrimônio Atual{assumptions.estimated ? ' (estimado)' : ''}</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(assumptions.startingPatrimony)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Velocidade de Crescimento</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(metrics.velocity)}/mês</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Tempo até a Meta</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {base.years === null ? `Mais de ${metrics.horizonYears} anos` : `~${formatYears(base.years)}`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Seu prazo: {goalYears} {goalYears === 1 ? 'ano' : 'anos'} ·{' '}
            <span className={metrics.meetsDeadline ? 'text-green-700' : 'text-amber-700'}>
              {metrics.meetsDeadline ? 'dentro do prazo' : 'fora do prazo'}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Otimista: {formatTimeToGoal(optimistic, metrics.horizonYears)} · Conservador:{' '}
            {formatTimeToGoal(conservative, metrics.horizonYears)}
          </p>
        </Card>
      </div>

      {!metrics.meetsDeadline && (
        <div className="mb-6">
          <Alert variant="warning">
            Essa meta, do jeito que está, levaria{' '}
            {base.years === null ? `mais de ${metrics.horizonYears} anos` : `cerca de ${formatYears(base.years)}`} para se
            realizar (seu prazo é de {goalYears} {goalYears === 1 ? 'ano' : 'anos'}). Vamos ajustar alguma variável —
            aporte, prazo ou meta — para encontrar um caminho mais realista?
          </Alert>
        </div>
      )}

      <Card className="mb-6">
        <p className="text-xs font-medium text-gray-600">No seu prazo ({goalYears} {goalYears === 1 ? 'ano' : 'anos'})</p>
        <p className="mt-2 text-sm text-gray-800">
          Com o plano atual você chega a{' '}
          <span className="font-semibold">{formatCurrency(base.valueAtDeadline)}</span> —{' '}
          {metrics.deadlineProgressPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da meta de{' '}
          {formatCurrency(goalAmount)}, em valores de hoje.
        </p>
        {monthlyNeeded === null && (
          <p className="mt-2 text-sm text-gray-800">
            Nesse prazo a meta não fecha nem com aportes muito maiores — vale revisar o prazo ou o valor da meta.
          </p>
        )}
        {monthlyNeeded !== null && monthlyNeeded > 0 && (
          <p className="mt-2 text-sm text-gray-800">
            Para atingir a meta em {goalYears} {goalYears === 1 ? 'ano' : 'anos'} seria preciso investir cerca de{' '}
            <span className="font-semibold">{formatCurrency(monthlyNeeded)}/mês</span> (hoje:{' '}
            {formatCurrency(assumptions.investmentsPlan)}/mês)
            {monthlyNeededConservative !== null && monthlyNeededConservative > monthlyNeeded
              ? `; no cenário conservador, cerca de ${formatCurrency(monthlyNeededConservative)}/mês.`
              : '.'}
          </p>
        )}
      </Card>

      {levers.length > 0 && (
        <div className="mb-6">
          <Alert variant="success">
            <p className="font-medium">O que mais acelera sua meta</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {levers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

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

      <ProjectionAssumptions assumptions={assumptions} onInflationChange={handleInflationChange} />

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
