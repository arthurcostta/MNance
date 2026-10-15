import type { AssetWithId } from '../../types/asset'
import EmptyState from '../Common/EmptyState'
import Button from '../Common/Button'
import { formatPercent } from '../../utils/formatPercent'
import { formatEndMonthLabel, remainingInstallments, yearMonthOf } from '../../core/installments'

interface AssetListProps {
  assets: AssetWithId[]
  onEdit: (asset: AssetWithId) => void
  onArchive: (assetId: string) => void
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  stocks: 'Ações',
  bonds: 'Renda Fixa',
  alternatives: 'Alternativos',
  cash: 'Caixa',
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// "aporta R$ 1.500,00/mês · restam 38 parcelas (até 11/2029)" | "aporte encerrado" | null (sem aporte programado)
function describeContribution(asset: AssetWithId): { text: string; ended: boolean } | null {
  if (!asset.monthlyContribution || asset.monthlyContribution <= 0) return null

  const amount = `${formatCurrency(asset.monthlyContribution)}/mês`
  if (!asset.contributionEndsAt) return { text: `aporta ${amount} (sem prazo)`, ended: false }

  const remaining = remainingInstallments(asset.contributionEndsAt, yearMonthOf(new Date()))
  if (remaining <= 0) {
    return { text: `aporte de ${amount} encerrado em ${formatEndMonthLabel(asset.contributionEndsAt)}`, ended: true }
  }

  const label = `${remaining} ${remaining === 1 ? 'parcela' : 'parcelas'}`
  return {
    text: `aporta ${amount} · ${remaining === 1 ? 'resta' : 'restam'} ${label} (até ${formatEndMonthLabel(asset.contributionEndsAt)})`,
    ended: false,
  }
}

export default function AssetList({ assets, onEdit, onArchive }: AssetListProps) {
  if (assets.length === 0) {
    return <EmptyState title="Nenhum ativo cadastrado ainda." />
  }

  const handleArchive = (assetId: string) => {
    if (window.confirm('Deseja arquivar este ativo?')) {
      onArchive(assetId)
    }
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        const contribution = describeContribution(asset)
        return (
        <div
          key={asset.id}
          className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{asset.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>{ASSET_CLASS_LABELS[asset.assetClass] || asset.assetClass}</span>
              <span>{formatCurrency(asset.currentValue)}</span>
              <span className="text-gray-500">{formatPercent(asset.expectedReturnRate * 100)} a.a.</span>
            </div>
            {contribution && (
              <p className={`mt-1 text-xs ${contribution.ended ? 'text-amber-700' : 'text-gray-600'}`}>
                {contribution.text}
              </p>
            )}
          </div>

          <div className="flex gap-2 sm:ml-4">
            <Button variant="secondary" size="sm" onClick={() => onEdit(asset)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleArchive(asset.id)}>
              Arquivar
            </Button>
          </div>
        </div>
        )
      })}
    </div>
  )
}
