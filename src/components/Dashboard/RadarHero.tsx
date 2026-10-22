import { progressPercent, timelineMarkers } from '../../core/radarView'
import { formatYearsShort } from '../../utils/formatYears'
import { formatCompactBRL } from '../../utils/formatCurrency'
import { formatPercent } from '../../utils/formatPercent'

interface RadarHeroProps {
  goalYears: number
  goalAmount: number
  currentPatrimony: number
  baseYears: number | null
  optimisticYears: number | null
  conservativeYears: number | null
  horizonYears: number
  meetsDeadline: boolean
}

// O cartão principal do Radar: responde "estou no caminho?" de relance. O número grande é o tempo até a meta;
// o selo diz se cabe no prazo; a barra mostra quanto já foi; a linha mostra prazo, meta e a faixa de cenários.
export default function RadarHero({
  goalYears,
  goalAmount,
  currentPatrimony,
  baseYears,
  optimisticYears,
  conservativeYears,
  horizonYears,
  meetsDeadline,
}: RadarHeroProps) {
  const markers = timelineMarkers({ goalYears, baseYears, optimisticYears, conservativeYears, horizonYears })
  const progress = progressPercent(currentPatrimony, goalAmount)
  const gapYears = baseYears === null ? null : baseYears - goalYears

  const bigNumber = baseYears === null ? `Mais de ${horizonYears} anos` : formatYearsShort(baseYears)
  const badgeText = meetsDeadline
    ? 'Dentro do prazo'
    : gapYears === null
      ? 'Fora do prazo'
      : `Fora do prazo · +${formatYearsShort(gapYears)}`

  const summary = [
    `Tempo até a meta: ${baseYears === null ? `mais de ${horizonYears} anos` : formatYearsShort(baseYears)}.`,
    meetsDeadline ? 'Dentro do seu prazo.' : `Fora do seu prazo de ${goalYears} anos.`,
    `Progresso: ${formatPercent(progress)} da meta.`,
  ].join(' ')

  return (
    <section className="rounded border border-gray-200 bg-white p-5" aria-label="Resumo da meta">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-600">Tempo até a meta</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{bigNumber}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            meetsDeadline ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {badgeText}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>{formatCompactBRL(currentPatrimony)}</span>
          <span>
            meta {formatCompactBRL(goalAmount)} · {formatPercent(progress)}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-gray-100"
          role="progressbar"
          aria-label="Progresso até a meta"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="relative mt-6 h-14" aria-hidden="true">
        <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-gray-200" />
        {markers.band && (
          <div
            className="absolute top-5 h-3 rounded bg-blue-100"
            style={{ left: `${markers.band.start}%`, width: `${markers.band.end - markers.band.start}%` }}
          />
        )}
        <div
          className="absolute top-3 h-7 w-0.5 bg-gray-500"
          style={{ left: `${markers.deadline}%` }}
        />
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-gray-600"
          style={{ left: `${markers.deadline}%` }}
        >
          Prazo {goalYears}a
        </span>
        {markers.base !== null ? (
          <div
            className="absolute top-5 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-600 ring-2 ring-white"
            style={{ left: `${markers.base}%` }}
          />
        ) : (
          <span className="absolute right-0 top-5 -translate-y-1/2 text-[11px] text-gray-500">Além do horizonte</span>
        )}
        {markers.base !== null && (
          <span
            className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-gray-800"
            style={{ left: `${markers.base}%` }}
          >
            Meta {formatYearsShort(baseYears ?? 0)}
          </span>
        )}
        <span className="absolute left-0 bottom-0 text-[11px] text-gray-500">Hoje</span>
      </div>

      <p className="sr-only">{summary}</p>
    </section>
  )
}
