import type { AllocationModel } from '../../core/allocationModels'

interface AllocationBarProps {
  model: AllocationModel
  className?: string
}

const CLASS_COLORS: Record<keyof Omit<AllocationModel, 'label'>, { bg: string; label: string }> = {
  stocks: { bg: 'bg-blue-400', label: 'Ações' },
  bonds: { bg: 'bg-green-400', label: 'Renda Fixa' },
  alternatives: { bg: 'bg-amber-400', label: 'Alternativos' },
  cash: { bg: 'bg-gray-300', label: 'Caixa' },
}

export default function AllocationBar({ model, className }: AllocationBarProps) {
  const stocksPercent = Math.round(model.stocks * 100)
  const bondsPercent = Math.round(model.bonds * 100)
  const altPercent = Math.round(model.alternatives * 100)
  const cashPercent = Math.round(model.cash * 100)

  const ariaLabel = `Alocação: ${stocksPercent}% Ações, ${bondsPercent}% Renda Fixa, ${altPercent}% Alternativos, ${cashPercent}% Caixa`

  return (
    <div className={className}>
      <div className="mb-2 flex h-6 overflow-hidden rounded border border-gray-300" role="img" aria-label={ariaLabel}>
        {model.stocks > 0 && (
          <div
            className="bg-blue-400"
            style={{ width: `${stocksPercent}%` }}
            title={`${CLASS_COLORS.stocks.label}: ${stocksPercent}%`}
          />
        )}
        {model.bonds > 0 && (
          <div
            className="bg-green-400"
            style={{ width: `${bondsPercent}%` }}
            title={`${CLASS_COLORS.bonds.label}: ${bondsPercent}%`}
          />
        )}
        {model.alternatives > 0 && (
          <div
            className="bg-amber-400"
            style={{ width: `${altPercent}%` }}
            title={`${CLASS_COLORS.alternatives.label}: ${altPercent}%`}
          />
        )}
        {model.cash > 0 && (
          <div
            className="bg-gray-300"
            style={{ width: `${cashPercent}%` }}
            title={`${CLASS_COLORS.cash.label}: ${cashPercent}%`}
          />
        )}
      </div>
      <div className="text-xs text-gray-600">
        <span>{CLASS_COLORS.stocks.label} {stocksPercent}%</span>
        <span className="mx-2">·</span>
        <span>{CLASS_COLORS.bonds.label} {bondsPercent}%</span>
        <span className="mx-2">·</span>
        <span>{CLASS_COLORS.alternatives.label} {altPercent}%</span>
        <span className="mx-2">·</span>
        <span>{CLASS_COLORS.cash.label} {cashPercent}%</span>
      </div>
    </div>
  )
}
