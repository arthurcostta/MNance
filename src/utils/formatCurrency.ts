// Moeda em reais no padrão pt-BR (R$ 1.234,56).
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
