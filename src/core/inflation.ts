// Inflação — conversão entre taxas nominais e reais. Taxa real = (1+nominal)/(1+inflação) − 1.
// O motor de projeção streamProjection.ts opera apenas com taxas reais; a UI converte conforme o valor
// configurado em User.inflationRate (default 4,5% a.a., teto da meta do Banco Central).

export const DEFAULT_INFLATION_RATE = 0.045

// Converte taxa nominal para taxa real.
// Se inflação === 0 (projeção nominal), retorna a taxa nominal inalterada.
// Resultado pode ser negativo (ex: Caixa a 0% com inflação 4,5% ⇒ taxa real ≈ -4,3%).
export function toRealRate(nominalRate: number, inflationRate: number): number {
  if (inflationRate === 0) return nominalRate
  return (1 + nominalRate) / (1 + inflationRate) - 1
}

// Fator de correção monetária (quanto R$ 1 de hoje vale daqui a N anos).
// inflationFactor(4.5%, 10) ≈ 0.644 — o poder de compra diminui.
export function inflationFactor(inflationRate: number, years: number): number {
  return Math.pow(1 + inflationRate, -years)
}
