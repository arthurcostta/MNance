import { describe, it, expect } from 'vitest'
import {
  brazilianBankHolidays,
  daysInMonth,
  easterSunday,
  effectiveInvestmentDay,
  isBusinessDay,
  lastBusinessDayOfMonth,
  weekday,
} from '../businessDays'

const d = (year: number, month: number, day: number) => ({ year, month, day })

describe('calendário', () => {
  it('dia da semana: 15/10/2026 é quinta; 17/10/2026 é sábado', () => {
    expect(weekday(d(2026, 10, 15))).toBe(4)
    expect(weekday(d(2026, 10, 17))).toBe(6)
  })

  it('dias do mês, incluindo fevereiro bissexto e secular', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('Páscoa e feriados móveis', () => {
  it('Páscoa de 2025, 2026 e 2027', () => {
    expect(easterSunday(2025)).toEqual(d(2025, 4, 20))
    expect(easterSunday(2026)).toEqual(d(2026, 4, 5))
    expect(easterSunday(2027)).toEqual(d(2027, 3, 28))
  })

  it('Carnaval, Sexta-feira Santa e Corpus Christi de 2026', () => {
    const holidays = brazilianBankHolidays(2026)
    expect(holidays).toContainEqual(d(2026, 2, 16)) // segunda de Carnaval
    expect(holidays).toContainEqual(d(2026, 2, 17)) // terça de Carnaval
    expect(holidays).toContainEqual(d(2026, 4, 3)) // Sexta-feira Santa
    expect(holidays).toContainEqual(d(2026, 6, 4)) // Corpus Christi
  })

  it('feriados fixos nacionais', () => {
    const holidays = brazilianBankHolidays(2026)
    expect(holidays).toContainEqual(d(2026, 1, 1))
    expect(holidays).toContainEqual(d(2026, 4, 21))
    expect(holidays).toContainEqual(d(2026, 12, 25))
  })

  it('Carnaval de 2025 cai em março (Páscoa em 20/04)', () => {
    const holidays = brazilianBankHolidays(2025)
    expect(holidays).toContainEqual(d(2025, 3, 3))
    expect(holidays).toContainEqual(d(2025, 3, 4))
  })
})

describe('dia útil', () => {
  it('fim de semana e feriado não são dia útil; quinta comum é', () => {
    expect(isBusinessDay(d(2026, 10, 17))).toBe(false) // sábado
    expect(isBusinessDay(d(2026, 10, 18))).toBe(false) // domingo
    expect(isBusinessDay(d(2026, 10, 15))).toBe(true)
    expect(isBusinessDay(d(2026, 4, 3))).toBe(false) // Sexta Santa
  })

  it('último dia útil de outubro de 2026 (sábado 31 → sexta 30)', () => {
    expect(lastBusinessDayOfMonth(2026, 10)).toEqual(d(2026, 10, 30))
  })
})

describe('effectiveInvestmentDay', () => {
  it('dia útil comum fica como está', () => {
    expect(effectiveInvestmentDay(2026, 10, 15)).toEqual(d(2026, 10, 15))
  })

  it('sábado vai para a segunda seguinte', () => {
    // 17/10/2026 é sábado → 19/10 (segunda)
    expect(effectiveInvestmentDay(2026, 10, 17)).toEqual(d(2026, 10, 19))
  })

  it('domingo vai para a segunda seguinte', () => {
    // 18/10/2026 é domingo → 19/10
    expect(effectiveInvestmentDay(2026, 10, 18)).toEqual(d(2026, 10, 19))
  })

  it('se o ajuste cruza o mês, usa o dia útil anterior', () => {
    // 31/05/2026 é domingo; 01/06 é segunda (mas feriado? não — Corpus Christi é 04/06).
    // Próximo útil seria 01/06, que cai no mês seguinte → usa o anterior: 29/05 (sexta).
    expect(effectiveInvestmentDay(2026, 5, 31)).toEqual(d(2026, 5, 29))
  })

  it('dia 31 em mês curto vira o último dia do mês', () => {
    // fevereiro de 2026 tem 28 dias; 28/02/2026 é sábado → sexta 27/02
    expect(effectiveInvestmentDay(2026, 2, 31)).toEqual(d(2026, 2, 27))
  })

  it('sem dia definido = último dia útil do mês', () => {
    expect(effectiveInvestmentDay(2026, 10, null)).toEqual(d(2026, 10, 30))
  })

  it('feriado no meio do mês empurra para o próximo dia útil', () => {
    // 21/04/2026 é Tiradentes (terça) → quarta 22/04
    expect(effectiveInvestmentDay(2026, 4, 21)).toEqual(d(2026, 4, 22))
  })
})
