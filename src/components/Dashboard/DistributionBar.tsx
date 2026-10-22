import { formatBRL } from '../../utils/formatCurrency'

export interface DistributionSegment {
  label: string
  value: number
  colorClass: string
}

interface DistributionBarProps {
  segments: DistributionSegment[]
}

// Barra empilhada da divisão mensal: a proporção aparece de relance, e a legenda traz os valores.
// Segmentos com valor zero somem da barra e da legenda.
export default function DistributionBar({ segments }: DistributionBarProps) {
  const visible = segments.filter((s) => s.value > 0)
  const total = visible.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return null

  return (
    <div className="space-y-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={visible.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}
      >
        {visible.map((s) => (
          <div key={s.label} className={s.colorClass} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {visible.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-gray-700">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.colorClass}`} aria-hidden="true" />
              {s.label}
            </span>
            <span className="font-medium text-gray-900">{formatBRL(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
