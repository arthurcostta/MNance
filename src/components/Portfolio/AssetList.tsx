import type { AssetWithId } from '../../types/asset'
import EmptyState from '../Common/EmptyState'
import Button from '../Common/Button'
import { formatPercent } from '../../utils/formatPercent'

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
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="flex items-center justify-between rounded border border-gray-200 bg-white p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{asset.name}</p>
            <div className="mt-1 flex gap-4 text-sm text-gray-600">
              <span>{ASSET_CLASS_LABELS[asset.assetClass] || asset.assetClass}</span>
              <span>{formatCurrency(asset.currentValue)}</span>
              <span className="text-gray-500">{formatPercent(asset.expectedReturnRate * 100)} a.a.</span>
            </div>
          </div>

          <div className="ml-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(asset)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleArchive(asset.id)}>
              Arquivar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
