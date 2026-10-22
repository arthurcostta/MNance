import { describe, it, expect } from 'vitest'
import { simulateContributionGrowth, validateGrowthInput } from '../contributionGrowth'
import { calculateCompoundInterest } from '../compoundInterest'

// Exemplo de referência: R$ 500/mês, 13,65% a.a., 21 anos.
const reference = { monthlyContribution: 500, annualRate: 0.1365, years: 21 }

describe('simulateContributionGrowth', () => {
  it('cenário de referência: totais batem com a anuidade fechada', () => {
    const r = simulateContributionGrowth(reference)
    const closedForm = calculateCompoundInterest({ principal: 0, monthlyContribution: 500, annualRate: 0.1365, months: 252 })
    expect(r.totals.total).toBeCloseTo(closedForm, 6)
    expect(r.totals.contributed).toBe(126_000)
    expect(r.totals.interest).toBeCloseTo(closedForm - 126_000, 6)
  })

  it('cenário de referência: ≈ R$ 638 mil no total, ≈ 20% do bolso, juros são a maior parte', () => {
    const r = simulateContributionGrowth(reference)
    expect(r.totals.total).toBeGreaterThan(637_000)
    expect(r.totals.total).toBeLessThan(640_000)
    expect(r.totals.pocketSharePercent).toBeGreaterThan(19.5)
    expect(r.totals.pocketSharePercent).toBeLessThan(20)
    expect(r.totals.interest).toBeGreaterThan(r.totals.contributed)
  })

  it('cenário de referência: marcos próximos de 5 anos e meio e de 10 anos', () => {
    const r = simulateContributionGrowth(reference)
    // 5 anos e 6 meses = 66 meses; 9 anos e 11 meses = 119 meses.
    expect(r.milestones.monthlyInterestPassesContribution).toBeGreaterThanOrEqual(64)
    expect(r.milestones.monthlyInterestPassesContribution).toBeLessThanOrEqual(68)
    expect(r.milestones.totalInterestPassesContributed).toBeGreaterThanOrEqual(116)
    expect(r.milestones.totalInterestPassesContributed).toBeLessThanOrEqual(122)
  })

  it('yearly tem um ponto por ano e o último é o total', () => {
    const r = simulateContributionGrowth(reference)
    expect(r.yearly).toHaveLength(21)
    expect(r.yearly[0]!.year).toBe(1)
    expect(r.yearly[20]!.total).toBeCloseTo(r.totals.total, 6)
    expect(r.yearly[20]!.contributed + r.yearly[20]!.interest).toBeCloseTo(r.yearly[20]!.total, 6)
  })

  it('juros mais contribuição sempre fecham o total em todos os anos', () => {
    const r = simulateContributionGrowth({ monthlyContribution: 1_200, annualRate: 0.08, years: 30 })
    for (const point of r.yearly) {
      expect(point.contributed + point.interest).toBeCloseTo(point.total, 6)
    }
  })

  it('mês de exemplo: juros creditados no mês 12 e aporte do mês', () => {
    const r = simulateContributionGrowth(reference)
    expect(r.monthExample.month).toBe(12)
    expect(r.monthExample.contribution).toBe(500)
    // Juros do mês 12 sobre o saldo do fim do mês 11 (≈ R$ 62 com esta taxa).
    expect(r.monthExample.monthlyInterest).toBeGreaterThan(55)
    expect(r.monthExample.monthlyInterest).toBeLessThan(70)
  })

  it('taxa zero: sem juros e sem marcos, sem NaN', () => {
    const r = simulateContributionGrowth({ monthlyContribution: 300, annualRate: 0, years: 5 })
    expect(r.totals.interest).toBe(0)
    expect(r.totals.total).toBe(18_000) // 300 × 60 meses
    expect(r.totals.pocketSharePercent).toBe(100)
    expect(r.milestones.monthlyInterestPassesContribution).toBeNull()
    expect(r.milestones.totalInterestPassesContributed).toBeNull()
  })

  it('aporte zero: tudo zerado, sem NaN', () => {
    const r = simulateContributionGrowth({ monthlyContribution: 0, annualRate: 0.1, years: 3 })
    expect(r.totals.total).toBe(0)
    expect(r.totals.pocketSharePercent).toBe(0)
    expect(Number.isFinite(r.totals.interest)).toBe(true)
  })

  it('marcos que não acontecem no período ficam null', () => {
    const r = simulateContributionGrowth({ monthlyContribution: 500, annualRate: 0.1365, years: 3 })
    expect(r.milestones.monthlyInterestPassesContribution).toBeNull()
    expect(r.milestones.totalInterestPassesContributed).toBeNull()
  })
})

describe('validateGrowthInput', () => {
  it('aceita entradas válidas', () => {
    expect(validateGrowthInput({ monthlyContribution: 0, annualRate: 0, years: 1 })).toEqual({})
    expect(validateGrowthInput({ monthlyContribution: 500, annualRate: 0.3, years: 50 })).toEqual({})
  })

  it('rejeita aporte negativo, anos fora de 1–50 e taxa fora de 0–30%', () => {
    const errors = validateGrowthInput({ monthlyContribution: -1, annualRate: 0.31, years: 51 })
    expect(errors.monthlyContribution).toBeDefined()
    expect(errors.annualRate).toBeDefined()
    expect(errors.years).toBeDefined()
    expect(validateGrowthInput({ monthlyContribution: 1, annualRate: 0.1, years: 2.5 }).years).toBeDefined()
  })
})
