// Formata um valor JÁ EM PERCENTUAL (12.1 → "12,1%") no padrão pt-BR, com vírgula decimal —
// mesmo critério de toLocaleString('pt-BR') usado nos valores em R$. Quem tem uma fração
// (0.121) multiplica por 100 antes de chamar.
export function formatPercent(percent: number, fractionDigits = 1): string {
  const formatted = percent.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${formatted}%`
}
