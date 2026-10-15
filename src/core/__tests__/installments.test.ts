import { describe, expect, it } from 'vitest'
import {
  endsAtFromRemaining,
  formatEndMonthLabel,
  isContributionActive,
  parseYearMonth,
  remainingInstallments,
  resolveRemainingMonths,
  yearMonthOf,
} from '../installments'

const OUTUBRO_2026 = { year: 2026, month: 10 }

describe('remainingInstallments', () => {
  it('o mês corrente conta como parcela restante', () => {
    expect(remainingInstallments('2026-10', OUTUBRO_2026)).toBe(1)
  })

  it('mês seguinte ao final = encerrado', () => {
    expect(remainingInstallments('2026-09', OUTUBRO_2026)).toBe(0)
    expect(remainingInstallments('2020-01', OUTUBRO_2026)).toBe(0)
  })

  it('conta meses à frente, inclusive na virada de ano', () => {
    expect(remainingInstallments('2026-12', OUTUBRO_2026)).toBe(3)
    expect(remainingInstallments('2027-01', OUTUBRO_2026)).toBe(4)
    expect(remainingInstallments('2031-09', OUTUBRO_2026)).toBe(60)
  })

  it('valor ilegível vira encerrado (0), nunca NaN', () => {
    expect(remainingInstallments('lixo', OUTUBRO_2026)).toBe(0)
    expect(remainingInstallments('2026-13', OUTUBRO_2026)).toBe(0)
    expect(remainingInstallments('', OUTUBRO_2026)).toBe(0)
  })
})

describe('endsAtFromRemaining', () => {
  it('1 parcela = o próprio mês corrente', () => {
    expect(endsAtFromRemaining(1, OUTUBRO_2026)).toBe('2026-10')
  })

  it('vira o ano corretamente', () => {
    expect(endsAtFromRemaining(3, OUTUBRO_2026)).toBe('2026-12')
    expect(endsAtFromRemaining(4, OUTUBRO_2026)).toBe('2027-01')
    expect(endsAtFromRemaining(60, OUTUBRO_2026)).toBe('2031-09')
  })

  it('ida e volta com remainingInstallments', () => {
    for (const n of [1, 2, 12, 13, 38, 60, 120]) {
      expect(remainingInstallments(endsAtFromRemaining(n, OUTUBRO_2026), OUTUBRO_2026)).toBe(n)
    }
  })

  it('n inválido (0, negativo, fracionário) cai no mínimo de 1 parcela', () => {
    expect(endsAtFromRemaining(0, OUTUBRO_2026)).toBe('2026-10')
    expect(endsAtFromRemaining(-5, OUTUBRO_2026)).toBe('2026-10')
    expect(endsAtFromRemaining(2.9, OUTUBRO_2026)).toBe('2026-11')
  })
})

describe('auxiliares', () => {
  it('parseYearMonth aceita só YYYY-MM válido', () => {
    expect(parseYearMonth('2029-11')).toEqual({ year: 2029, month: 11 })
    expect(parseYearMonth('2029-1')).toBeNull()
    expect(parseYearMonth('2029-00')).toBeNull()
  })

  it('formatEndMonthLabel mostra mm/aaaa', () => {
    expect(formatEndMonthLabel('2029-11')).toBe('11/2029')
  })

  it('resolveRemainingMonths: sem mês final = null (permanente)', () => {
    expect(resolveRemainingMonths(undefined, OUTUBRO_2026)).toBeNull()
    expect(resolveRemainingMonths('2026-12', OUTUBRO_2026)).toBe(3)
  })

  it('isContributionActive exige valor > 0 e parcelas restantes (ou sem prazo)', () => {
    expect(isContributionActive(1500, 60)).toBe(true)
    expect(isContributionActive(1500, null)).toBe(true)
    expect(isContributionActive(1500, undefined)).toBe(true)
    expect(isContributionActive(1500, 0)).toBe(false)
    expect(isContributionActive(0, 60)).toBe(false)
    expect(isContributionActive(undefined, null)).toBe(false)
  })

  it('yearMonthOf usa o mês civil local', () => {
    expect(yearMonthOf(new Date(2026, 9, 15))).toEqual({ year: 2026, month: 10 })
  })
})
