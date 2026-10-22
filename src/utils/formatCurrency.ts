// Moeda em reais no padrão pt-BR (R$ 1.234,56).
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Valor curto para cartões pequenos: "R$ 46,6 mil", "R$ 1,29 mi". Abaixo de mil, formato comum.
export function formatCompactBRL(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  }
  return formatBRL(value)
}
