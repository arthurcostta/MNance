import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { buildAssetPlanRows, useInvestments, type CheckinSlot, type SlotSubmission } from '../hooks/useInvestments'
import { updateUserDocument } from '../services/userService'
import { ALLOCATION_MODELS, modelKeyForRiskProfile } from '../core/allocationModels'
import { calculateGuidedContribution, type ClassAmounts } from '../core/checkin'
import { formatBRL } from '../utils/formatCurrency'
import { formatPercent } from '../utils/formatPercent'
import CheckinCard from '../components/Investments/CheckinCard'
import InvestmentDaysForm from '../components/Investments/InvestmentDaysForm'
import AllocationBar from '../components/Distribution/AllocationBar'
import AssetClassGlossary from '../components/Distribution/AssetClassGlossary'
import Alert from '../components/Common/Alert'
import Card from '../components/Common/Card'
import LoadingState from '../components/Common/LoadingState'
import type { AllocationModel } from '../core/allocationModels'

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// 'YYYY-MM' → 'outubro de 2026' (o histórico guarda o mês cru).
function monthNameOf(month: string): string {
  const [year, m] = month.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} de ${year}`
}

function describeSlotDate(slot: CheckinSlot): string {
  const date = new Date(slot.effective.year, slot.effective.month - 1, slot.effective.day)
  return `${WEEKDAYS[date.getDay()]}, ${String(slot.effective.day).padStart(2, '0')}/${String(slot.effective.month).padStart(2, '0')}`
}

// Composição atual da carteira por classe (em R$) e em fração, para comparar com a estratégia.
function currentByClass(assets: { assetClass: string; currentValue: number }[]): ClassAmounts {
  const totals: ClassAmounts = { stocks: 0, bonds: 0, alternatives: 0, cash: 0 }
  for (const asset of assets) {
    const key = asset.assetClass as keyof ClassAmounts
    if (key in totals) totals[key] += asset.currentValue
  }
  return totals
}

export default function Investments() {
  const { user, currentUser, refreshCurrentUser } = useAuth()
  const inv = useInvestments(user?.uid)
  const [daysSaveError, setDaysSaveError] = useState<string | null>(null)
  const [editingDays, setEditingDays] = useState(false)

  const monthLabel = useMemo(
    () => `${MONTHS[inv.monthYm.month - 1]} de ${inv.monthYm.year}`,
    [inv.monthYm]
  )

  if (inv.loading || !currentUser || !user) return <LoadingState label="Carregando investimentos..." />

  const distribution = inv.distribution
  const showFirstVisitPrompt = !currentUser.investmentDayPromptAnswered && !editingDays

  const saveDays = async (days: number[]) => {
    setDaysSaveError(null)
    try {
      await updateUserDocument(user.uid, { investmentDays: days, investmentDayPromptAnswered: true })
      await refreshCurrentUser()
      setEditingDays(false)
    } catch {
      setDaysSaveError('Não foi possível salvar os dias. Tente novamente.')
    }
  }

  const openSlots = inv.slots.filter((s) => s.state === 'open')

  // Estratégia sugerida (somente leitura): composição-alvo do perfil × carteira atual.
  const targetModel = ALLOCATION_MODELS[modelKeyForRiskProfile(currentUser.riskProfile)]
  const byClass = currentByClass(inv.assets)
  const portfolioTotal = inv.assets.reduce((sum, a) => sum + a.currentValue, 0)
  const currentModel: AllocationModel = {
    label: 'Carteira atual',
    stocks: portfolioTotal ? byClass.stocks / portfolioTotal : 0,
    bonds: portfolioTotal ? byClass.bonds / portfolioTotal : 0,
    alternatives: portfolioTotal ? byClass.alternatives / portfolioTotal : 0,
    cash: portfolioTotal ? byClass.cash / portfolioTotal : 0,
  }
  const nextAmount = openSlots[0]?.plannedTotal ?? inv.slots[0]?.plannedTotal ?? 0
  const guided = calculateGuidedContribution(
    byClass,
    { stocks: targetModel.stocks, bonds: targetModel.bonds, alternatives: targetModel.alternatives, cash: targetModel.cash },
    nextAmount
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Investimentos</h1>
        <p className="mt-1 text-sm text-gray-600">
          {monthLabel}: você planeja investir {formatBRL(inv.investmentsPlan)} neste mês.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          = fatia de Investimentos {formatBRL(distribution.amounts.investments)}
          {distribution.flow.surplusToInvestments > 0 && (
            <> + saldo das essenciais {formatBRL(distribution.flow.surplusToInvestments)}</>
          )}
        </p>
      </header>

      {showFirstVisitPrompt && (
        <Card>
          <p className="mb-3 font-medium">Quer definir um dia para investir?</p>
          <p className="mb-4 text-sm text-gray-600">
            Avisamos no dia escolhido e você registra quanto investiu. Se preferir, responda no fim do mês.
          </p>
          <InvestmentDaysForm initialDays={inv.investmentDays} submitLabel="Salvar" onSave={saveDays} />
          {daysSaveError && (
            <div className="mt-3">
              <Alert variant="error">{daysSaveError}</Alert>
            </div>
          )}
        </Card>
      )}

      {inv.lastEffect && (
        <Card className="border-green-200 bg-green-50">
          <p className="font-medium">Aportes registrados</p>
          <p className="mt-2 text-sm">
            Patrimônio: {formatBRL(inv.lastEffect.patrimonyBefore)}
            {inv.lastEffect.estimatedBefore && <span className="text-xs text-gray-500"> (estimativa do onboarding)</span>}
            {' → '}
            <strong>{formatBRL(inv.lastEffect.patrimonyAfter)}</strong>
          </p>
          <p className="text-sm">
            Tempo até a meta:{' '}
            {inv.lastEffect.reachableBefore && inv.lastEffect.yearsBefore !== null
              ? `${inv.lastEffect.yearsBefore.toFixed(1)} anos`
              : 'mais de 60 anos'}{' '}
            →{' '}
            <strong>
              {inv.lastEffect.reachableAfter && inv.lastEffect.yearsAfter !== null
                ? `${inv.lastEffect.yearsAfter.toFixed(1)} anos`
                : 'mais de 60 anos'}
            </strong>
          </p>
          {Math.round(inv.lastEffect.adherenceBefore * 100) !== Math.round(inv.lastEffect.adherenceAfter * 100) && (
            <p className="mt-2 text-xs text-gray-600">
              Sua aderência foi de {formatPercent(inv.lastEffect.adherenceBefore * 100)} para{' '}
              {formatPercent(inv.lastEffect.adherenceAfter * 100)}. A projeção usa essa média nos aportes futuros,
              por isso o prazo pode mudar mesmo com mais patrimônio.
            </p>
          )}
          <div className="mt-3 flex gap-3 text-sm">
            <Link to="/" className="font-medium underline">Ver no Radar</Link>
            <button type="button" className="underline" onClick={inv.clearLastEffect}>
              Fechar
            </button>
          </div>
        </Card>
      )}

      {inv.investmentDays.length > 0 || currentUser.investmentDayPromptAnswered ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dias de investir</h2>
            <button type="button" className="text-sm underline" onClick={() => setEditingDays((v) => !v)}>
              {editingDays ? 'Fechar' : 'Alterar dias'}
            </button>
          </div>
          {editingDays && (
            <Card>
              <InvestmentDaysForm
                initialDays={inv.investmentDays}
                onSave={saveDays}
                onCancel={() => setEditingDays(false)}
              />
            </Card>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Como foi o seu investimento?</h2>
        {inv.slots.map((slot) => {
          const { rows } = buildAssetPlanRows(inv.assets, slot.slot, inv.monthYm)
          const label = `${slot.slot}º dia de investir · ${describeSlotDate(slot)}`
          return (
            <CheckinCard
              key={`${slot.slot}-${slot.checkin?.id ?? 'open'}`}
              slot={slot}
              label={label}
              rows={rows}
              submitting={inv.submitting}
              submitError={inv.submitError}
              onConfirm={(submission: SlotSubmission) => void inv.confirm(submission, slot)}
              onSkip={() => void inv.skip(slot)}
            />
          )
        })}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Sua aderência</h2>
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-semibold">{formatPercent(inv.adherence * 100)}</span> do que você planejou nos
          últimos meses. {inv.adherence === 1 && inv.checkins.length === 0
            ? 'Sem histórico ainda: a projeção usa o que você programou.'
            : 'Essa média ajusta os aportes futuros da projeção.'}
        </p>
        {inv.checkins.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            {[...inv.checkins]
              .sort((a, b) => (a.id < b.id ? 1 : -1))
              .slice(0, 6)
              .map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>
                    {monthNameOf(c.month)} · {c.slot}º dia
                  </span>
                  <span>
                    {formatBRL(c.investedTotal)} de {formatBRL(c.plannedTotal)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Estratégia sugerida</h2>
        <p className="mt-1 text-sm text-gray-600">
          Para o seu perfil, a composição de referência é a abaixo. É só uma sugestão: nada muda sozinho.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">{targetModel.label} (referência)</p>
            <AllocationBar model={targetModel} className="mt-1" />
          </div>
          <div>
            <p className="text-sm font-medium">Sua carteira hoje</p>
            <AllocationBar model={currentModel} className="mt-1" />
          </div>
          {nextAmount > 0 && portfolioTotal > 0 && (
            <div className="text-sm text-gray-700">
              <p className="font-medium">Para se aproximar da referência, direcione o próximo aporte ({formatBRL(nextAmount)}):</p>
              <ul className="mt-1 list-inside list-disc">
                {(['stocks', 'bonds', 'alternatives', 'cash'] as const)
                  .filter((k) => guided[k] > 0)
                  .map((k) => (
                    <li key={k}>
                      {formatBRL(guided[k])} em {CLASS_NAMES[k]}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm underline">O que é cada classe de ativos?</summary>
          <AssetClassGlossary />
        </details>
      </Card>

    </div>
  )
}

const CLASS_NAMES: Record<keyof ClassAmounts, string> = {
  stocks: 'Ações',
  bonds: 'Renda Fixa',
  alternatives: 'Alternativos',
  cash: 'Caixa',
}
