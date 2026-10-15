// Parcelas restantes de um aporte programado (M5.8 Fase 2). TS puro, só números: sem Date nem fuso,
// para rodar igual no navegador e em scripts de servidor.
//
// O aporte guarda o MÊS DA ÚLTIMA PARCELA ('YYYY-MM', inclusive), não um contador: assim as parcelas
// restantes se recalculam sozinhas com o passar do tempo. O mês corrente conta como parcela restante.

export interface YearMonth {
  year: number
  month: number // 1-12
}

const END_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1)
}

export function parseYearMonth(value: string): YearMonth | null {
  const match = END_MONTH_PATTERN.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

// Parcelas que ainda faltam a partir de hoje (mês corrente incluso). 0 = encerrado; valor ilegível = 0.
export function remainingInstallments(endsAt: string, today: YearMonth): number {
  const end = parseYearMonth(endsAt)
  if (!end) return 0
  return Math.max(0, monthIndex(end) - monthIndex(today) + 1)
}

// Inverso: o mês da última parcela quando faltam n parcelas (n = 1 → o próprio mês corrente).
export function endsAtFromRemaining(remaining: number, today: YearMonth): string {
  const lastIndex = monthIndex(today) + Math.max(1, Math.floor(remaining)) - 1
  return formatYearMonth({ year: Math.floor(lastIndex / 12), month: (lastIndex % 12) + 1 })
}

// Mês civil local de uma data (a única ponte com Date; o resto do módulo só usa números).
export function yearMonthOf(date: Date): YearMonth {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

// Parcelas restantes de um ativo: null = sem prazo (permanente).
export function resolveRemainingMonths(endsAt: string | undefined, today: YearMonth): number | null {
  return endsAt === undefined ? null : remainingInstallments(endsAt, today)
}

// Um aporte conta (nos totais e na projeção) se tem valor e ainda não terminou.
export function isContributionActive(
  monthlyAmount: number | undefined,
  remainingMonths: number | null | undefined
): boolean {
  return (monthlyAmount ?? 0) > 0 && (remainingMonths == null || remainingMonths > 0)
}

// "mm/aaaa" para exibir ao usuário.
export function formatEndMonthLabel(endsAt: string): string {
  const end = parseYearMonth(endsAt)
  return end ? `${String(end.month).padStart(2, '0')}/${end.year}` : endsAt
}
