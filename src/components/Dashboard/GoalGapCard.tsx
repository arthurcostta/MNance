import { formatBRL } from '../../utils/formatCurrency'
import { formatPercent } from '../../utils/formatPercent'

interface GoalGapCardProps {
  goalYears: number
  effectiveMonthly: number
  committed: number
  requiredMonthly: number | null
  requiredConservative: number | null
  deadlinePercent: number
}

// Análise de lacuna, recolhida por padrão: o resumo já mostra a distância; abrir mostra as duas barras.
export default function GoalGapCard({
  goalYears,
  effectiveMonthly,
  committed,
  requiredMonthly,
  requiredConservative,
  deadlinePercent,
}: GoalGapCardProps) {
  const impossible = requiredMonthly === null
  const summary = impossible
    ? 'Nem com aportes muito maiores a meta fecha nesse prazo'
    : requiredMonthly > 0
      ? `Precisa de ${formatBRL(requiredMonthly)}/mês · hoje ${formatBRL(effectiveMonthly)}`
      : 'Só com o que já está programado a meta fecha'

  const scale = Math.max(requiredMonthly ?? 0, effectiveMonthly, 1)
  const todayPercent = Math.min(100, (effectiveMonthly / scale) * 100)
  const neededPercent = impossible ? 100 : Math.min(100, ((requiredMonthly ?? 0) / scale) * 100)
  const deadlineBar = Math.min(100, Math.max(0, deadlinePercent))

  return (
    <details className="group rounded border border-gray-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none flex-col gap-1 text-sm font-medium text-gray-900 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span>No seu prazo ({goalYears} {goalYears === 1 ? 'ano' : 'anos'})</span>
        <span className="text-xs font-normal text-gray-600">{summary}</span>
      </summary>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-600">
            <span>Meta atingida no prazo</span>
            <span className="font-medium text-gray-900">{formatPercent(deadlinePercent)}</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-gray-100"
            role="progressbar"
            aria-label="Parte da meta atingida no prazo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(deadlineBar)}
          >
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${deadlineBar}%` }} />
          </div>
        </div>

        {!impossible && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Aporte mensal</p>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Hoje</span>
                <span className="font-medium">{formatBRL(effectiveMonthly)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-gray-500" style={{ width: `${todayPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Necessário</span>
                <span className="font-medium">{formatBRL(requiredMonthly ?? 0)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-green-600" style={{ width: `${neededPercent}%` }} />
              </div>
            </div>
            {committed > 0 && (
              <p className="text-xs text-gray-500">Inclui {formatBRL(committed)} de parcelas programadas.</p>
            )}
            {requiredConservative !== null && requiredMonthly !== null && requiredConservative > requiredMonthly && (
              <p className="text-xs text-gray-500">No cenário conservador: {formatBRL(requiredConservative)}/mês.</p>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
