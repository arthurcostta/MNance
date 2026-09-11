import { describe, expect, it } from 'vitest'
import { calculateProjection } from '../projection'

describe('calculateProjection', () => {
  it('caso normal: finalAmount é a soma coerente de patrimônio + aportes + juros', () => {
    const result = calculateProjection({
      currentPatrimony: 10000,
      monthlyContribution: 500,
      annualReturnRate: 0.09,
      years: 5,
    })

    expect(result.totalContributed).toBeCloseTo(500 * 5 * 12, 6)
    expect(result.finalAmount).toBeCloseTo(
      10000 + result.totalContributed + result.totalInterestEarned,
      6,
    )
    expect(result.totalInterestEarned).toBeGreaterThan(0)
  })

  it('patrimônio inicial zero: não gera divisão por zero nem NaN (CENÁRIO 35)', () => {
    const result = calculateProjection({
      currentPatrimony: 0,
      monthlyContribution: 300,
      annualReturnRate: 0.1,
      years: 10,
    })

    expect(Number.isNaN(result.finalAmount)).toBe(false)
    expect(Number.isFinite(result.finalAmount)).toBe(true)
    expect(result.finalAmount).toBeGreaterThan(result.totalContributed)
  })

  it('taxa zero: juros ganhos são zero e o final é só patrimônio + aportes', () => {
    const result = calculateProjection({
      currentPatrimony: 5000,
      monthlyContribution: 200,
      annualReturnRate: 0,
      years: 3,
    })

    expect(result.totalInterestEarned).toBeCloseTo(0, 6)
    expect(result.finalAmount).toBeCloseTo(5000 + 200 * 3 * 12, 6)
  })

  it('years = 0: retorna o patrimônio atual sem aportes nem juros', () => {
    const result = calculateProjection({
      currentPatrimony: 8000,
      monthlyContribution: 400,
      annualReturnRate: 0.08,
      years: 0,
    })

    expect(result.finalAmount).toBeCloseTo(8000, 6)
    expect(result.totalContributed).toBe(0)
    expect(result.totalInterestEarned).toBeCloseTo(0, 6)
  })
})
