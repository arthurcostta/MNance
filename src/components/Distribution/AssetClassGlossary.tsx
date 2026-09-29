import { ASSET_RETURN_RATES, type AssetClass } from '../../core/assetReturnRates'

const CLASS_DESCRIPTIONS: Record<AssetClass, { label: string; description: string }> = {
  stocks: {
    label: 'Ações',
    description: 'Partes de empresas. Alto potencial de crescimento, mas com oscilação de curto prazo.',
  },
  bonds: {
    label: 'Renda Fixa',
    description: 'Empréstimos com juros pré-definidos. Retorno mais previsível, menos risco.',
  },
  alternatives: {
    label: 'Alternativos',
    description: 'Ativos fora do mercado tradicional (imóveis, moedas digitais etc.). Diversificam o portfólio.',
  },
  cash: {
    label: 'Caixa',
    description: 'Dinheiro líquido. Sem risco, mas sem ganhos (ou ganhos mínimos).',
  },
}

export default function AssetClassGlossary() {
  // Agrupa instrumentos por classe
  const groupedByClass: Record<AssetClass, string[]> = {
    stocks: [],
    bonds: [],
    alternatives: [],
    cash: [],
  }
  Object.values(ASSET_RETURN_RATES).forEach((rate) => {
    groupedByClass[rate.assetClass].push(rate.label)
  })

  return (
    <details className="my-4 rounded border border-gray-200 p-3">
      <summary className="cursor-pointer font-medium text-gray-800">O que é cada classe de ativos?</summary>
      <div className="mt-3 space-y-3">
        {(Object.keys(CLASS_DESCRIPTIONS) as AssetClass[]).map((key) => (
          <div key={key} className="text-sm">
            <p className="font-medium text-gray-700">{CLASS_DESCRIPTIONS[key].label}</p>
            <p className="mt-1 text-gray-600">{CLASS_DESCRIPTIONS[key].description}</p>
            {groupedByClass[key] && (
              <p className="mt-1 text-xs text-gray-500">
                Exemplos no app: {groupedByClass[key].join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
