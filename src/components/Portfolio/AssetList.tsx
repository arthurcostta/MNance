import type { AssetWithId } from '../../types/asset'

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
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        Nenhum ativo cadastrado ainda.
      </div>
    )
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
              <span className="text-gray-500">{(asset.expectedReturnRate * 100).toFixed(1)}% a.a.</span>
            </div>
          </div>

          <div className="ml-4 flex gap-2">
            <button
              onClick={() => onEdit(asset)}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              Editar
            </button>
            <button
              onClick={() => handleArchive(asset.id)}
              className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              Arquivar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
