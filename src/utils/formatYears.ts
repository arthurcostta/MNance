// Tempo em anos e meses por extenso ("55 anos e 6 meses") e curto ("55a 6m"), usados pelo Radar.

function splitYears(years: number): { whole: number; months: number } {
  const whole = Math.floor(years)
  const months = Math.round((years - whole) * 12)
  // 11,96 anos arredonda para 12 meses: vira 1 ano exato, sem "12 meses".
  return months === 12 ? { whole: whole + 1, months: 0 } : { whole, months }
}

export function formatYears(years: number): string {
  if (years === 0) return 'já alcançada'
  const { whole, months } = splitYears(years)
  const yearsLabel = whole > 0 ? `${whole} ${whole === 1 ? 'ano' : 'anos'}` : ''
  const monthsLabel = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : ''
  return [yearsLabel, monthsLabel].filter(Boolean).join(' e ')
}

export function formatYearsShort(years: number): string {
  if (years === 0) return '0a'
  const { whole, months } = splitYears(years)
  if (whole === 0) return `${months}m`
  return months > 0 ? `${whole}a ${months}m` : `${whole}a`
}
