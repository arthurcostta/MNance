// Feature #5 (Portfólio) — retorno esperado da carteira, ponderado pelo peso de cada ativo
// no total investido: Σ (amount_i / totalAmount) × rate_i.

export interface WeightedReturnAsset {
  amount: number
  expectedReturnRate: number
}

export function calculateWeightedReturn(assets: WeightedReturnAsset[]): number {
  const totalAmount = assets.reduce((sum, asset) => sum + asset.amount, 0)

  // Carteira vazia ou soma zero: sem base para ponderar, retorno é zero (não NaN/Infinity).
  if (assets.length === 0 || totalAmount === 0) {
    return 0
  }

  return assets.reduce(
    (sum, asset) => sum + (asset.amount / totalAmount) * asset.expectedReturnRate,
    0,
  )
}
