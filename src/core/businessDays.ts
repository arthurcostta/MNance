// Dias úteis bancários e o "dia de investir" efetivo (M5.9). TS puro, só números: sem Date nem fuso,
// para rodar igual no navegador e no script de lembretes do GitHub Actions (M5.10).

export interface CalendarDate {
  year: number
  month: number // 1-12
  day: number // 1-31
}

// Domingo = 0 … sábado = 6 (algoritmo de Sakamoto, só aritmética inteira).
export function weekday({ year, month, day }: CalendarDate): number {
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const y = month < 3 ? year - 1 : year
  return (
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + (offsets[month - 1] ?? 0) + day) % 7
  )
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// Domingo de Páscoa (algoritmo anônimo gregoriano).
export function easterSunday(year: number): CalendarDate {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { year, month, day }
}

function addDays(date: CalendarDate, offset: number): CalendarDate {
  let { year, month, day } = date
  let remaining = offset
  while (remaining > 0) {
    if (day < daysInMonth(year, month)) day++
    else {
      day = 1
      if (month === 12) {
        month = 1
        year++
      } else month++
    }
    remaining--
  }
  while (remaining < 0) {
    if (day > 1) day--
    else {
      if (month === 1) {
        month = 12
        year--
      } else month--
      day = daysInMonth(year, month)
    }
    remaining++
  }
  return { year, month, day }
}

// Feriados que fecham banco e B3: nacionais fixos, Carnaval (segunda e terça), Sexta-feira Santa e Corpus Christi.
export function brazilianBankHolidays(year: number): CalendarDate[] {
  const fixed: CalendarDate[] = [
    { year, month: 1, day: 1 },
    { year, month: 4, day: 21 },
    { year, month: 5, day: 1 },
    { year, month: 9, day: 7 },
    { year, month: 10, day: 12 },
    { year, month: 11, day: 2 },
    { year, month: 11, day: 15 },
    { year, month: 12, day: 25 },
  ]
  const easter = easterSunday(year)
  const movable = [
    addDays(easter, -48), // segunda de Carnaval
    addDays(easter, -47), // terça de Carnaval
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ]
  return [...fixed, ...movable]
}

export function isBankHoliday(date: CalendarDate): boolean {
  return brazilianBankHolidays(date.year).some(
    (holiday) => holiday.month === date.month && holiday.day === date.day
  )
}

export function isBusinessDay(date: CalendarDate): boolean {
  const dow = weekday(date)
  return dow !== 0 && dow !== 6 && !isBankHoliday(date)
}

export function nextBusinessDay(date: CalendarDate): CalendarDate {
  let current = date
  while (!isBusinessDay(current)) current = addDays(current, 1)
  return current
}

export function previousBusinessDay(date: CalendarDate): CalendarDate {
  let current = date
  while (!isBusinessDay(current)) current = addDays(current, -1)
  return current
}

export function lastBusinessDayOfMonth(year: number, month: number): CalendarDate {
  return previousBusinessDay({ year, month, day: daysInMonth(year, month) })
}

// Dia de investir efetivo de um mês. `day` null = "sem dia definido" → último dia útil do mês.
// Dia que cai em fim de semana/feriado vai para o próximo dia útil; se isso cruzar para o mês
// seguinte, usa o anterior. Dia 31 em mês curto vira o último dia do mês, e depois a mesma regra.
export function effectiveInvestmentDay(year: number, month: number, day: number | null): CalendarDate {
  if (day === null) return lastBusinessDayOfMonth(year, month)
  const base: CalendarDate = { year, month, day: Math.min(day, daysInMonth(year, month)) }
  const next = nextBusinessDay(base)
  if (next.month !== month) return previousBusinessDay(base)
  return next
}

// Ordem cronológica: negativo se a < b, 0 se iguais, positivo se a > b.
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}
