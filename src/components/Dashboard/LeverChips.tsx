import { formatYearsShort } from '../../utils/formatYears'
import { formatCompactBRL } from '../../utils/formatCurrency'
import type { LeverDelta } from '../../core/radarView'

export interface LeverChipItem {
  label: string
  delta: LeverDelta
}

interface LeverChipsProps {
  items: LeverChipItem[]
}

// Alavancas como chips: "+20% no aporte livre → 52a 10m ▼ 2a 8m". Quem não muda o prazo não aparece.
export default function LeverChips({ items }: LeverChipsProps) {
  const visible = items.filter((item) => item.delta.kind !== 'same')
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">O que mais acelera sua meta</p>
      <ul className="flex flex-wrap gap-2">
        {visible.map((item) => {
          const { delta } = item
          let result: string
          if (delta.kind === 'faster') {
            result = `${formatYearsShort(delta.years ?? 0)} ▼ ${formatYearsShort(delta.deltaYears ?? 0)}`
          } else if (delta.kind === 'reachable') {
            result = `meta em ${formatYearsShort(delta.years ?? 0)}`
          } else {
            result = `${formatCompactBRL(delta.valueAtDeadline)} no prazo`
          }
          return (
            <li
              key={item.label}
              className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-900"
            >
              <span className="font-medium">{item.label}</span> → {result}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
