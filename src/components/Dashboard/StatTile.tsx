import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
}

// Indicador de um número só, sem frase de apoio. Hint é opcional e curto (ex.: "estimado").
export default function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded border border-gray-200 bg-white p-3 sm:p-4">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900 sm:text-lg">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
