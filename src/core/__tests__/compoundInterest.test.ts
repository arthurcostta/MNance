import { describe, expect, it } from 'vitest'
import { annualToMonthlyRate, calculateCompoundInterest } from '../compoundInterest'

describe('annualToMonthlyRate', () => {
  it('a taxa mensal composta 12x reproduz a taxa anual original', () => {
    const annualRate = 0.12
    const monthlyRate = annualToMonthlyRate(annualRate)
    const reconstructedAnnual = Math.pow(1 + monthlyRate, 12) - 1
    expect(reconstructedAnnual).toBeCloseTo(annualRate, 10)
  })

  it('taxa anual zero resulta em taxa mensal zero', () => {
    expect(annualToMonthlyRate(0)).toBe(0)
  })
})

describe('calculateCompoundInterest', () => {
  it('aporte zero: cresce apenas por juros compostos sobre o principal', () => {
    const annualRate = 0.1
    const months = 24
    const monthlyRate = annualToMonthlyRate(annualRate)
    const expected = 1000 * Math.pow(1 + monthlyRate, months)

    const result = calculateCompoundInterest({
      principal: 1000,
      monthlyContribution: 0,
      annualRate,
      months,
    })

    expect(result).toBeCloseTo(expected, 6)
  })

  it('taxa zero: soma linear dos aportes, sem juros', () => {
    const result = calculateCompoundInterest({
      principal: 1000,
      monthlyContribution: 500,
      annualRate: 0,
      months: 24,
    })

    expect(result).toBeCloseTo(1000 + 500 * 24, 6)
  })

  it('months = 0: retorna o principal sem alteração', () => {
    const result = calculateCompoundInterest({
      principal: 5000,
      monthlyContribution: 300,
      annualRate: 0.15,
      months: 0,
    })

    expect(result).toBeCloseTo(5000, 6)
  })

  it('caso normal (1 mês) verificável à mão: FV = principal * (1 + taxaMensal) + aporte', () => {
    const principal = 1000
    const monthlyContribution = 100
    const annualRate = 0.12
    const monthlyRate = annualToMonthlyRate(annualRate)
    const expected = principal * (1 + monthlyRate) + monthlyContribution

    const result = calculateCompoundInterest({
      principal,
      monthlyContribution,
      annualRate,
      months: 1,
    })

    expect(result).toBeCloseTo(expected, 6)
  })

  it('cresce de forma monotônica com o tempo (sanidade contra regressão)', () => {
    const base = {
      principal: 10000,
      monthlyContribution: 200,
      annualRate: 0.08,
    }
    const after12 = calculateCompoundInterest({ ...base, months: 12 })
    const after24 = calculateCompoundInterest({ ...base, months: 24 })

    expect(after24).toBeGreaterThan(after12)
  })
})
