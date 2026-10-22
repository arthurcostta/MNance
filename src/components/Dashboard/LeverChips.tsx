import { leverResultText, type LeverDelta } from '../../core/radarView'

export interface LeverChipItem {
  label: string
  delta: LeverDelta
  // Quando a alavanca tem uma linha própria no gráfico, o chip mostra o mesmo traço para ligar os dois.
  swatch?: boolean
}

interface LeverChipsProps {
  items: LeverChipItem[]
}

// Alavancas como chips: "+20% no aporte livre: meta em 52 anos (2 anos antes)". Quem não muda o prazo não aparece.
export default function LeverChips({ items }: LeverChipsProps) {
  const visible = items.filter((item) => item.delta.kind !== 'same')
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">O que mais acelera sua meta</p>
      <ul className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-900"
          >
            {item.swatch && (
              <span aria-hidden="true" className="inline-block w-4 border-t-2 border-dashed border-green-600" />
            )}
            <span>
              <span className="font-medium">{item.label}:</span> {leverResultText(item.delta)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
