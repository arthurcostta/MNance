import { describe, expect, it } from 'vitest'
import { calculateGoalTimeline } from '../goalTimeline'
import { calculateProjection } from '../projection'

describe('calculateGoalTimeline', () => {
  it('meta já atingida: reachable true, 0 meses, sem simular (CENÁRIO 32)', () => {
    const result = calculateGoalTimeline({
      currentPatrimony: 100000,
      monthlyContribution: 500,
      annualReturnRate: 0.09,
      goalAmount: 80000,
    })

    expect(result.reachable).toBe(true)
    expect(result.months).toBe(0)
    expect(result.years).toBe(0)
    expect(result.patrimonyAtCap).toBe(100000)
    expect(result.shortfallAtCap).toBeLessThanOrEqual(0)
  })

  it('aporte zero e taxa zero: nunca atinge a meta, sem Infinity/NaN (CENÁRIO 33)', () => {
    const result = calculateGoalTimeline({
      currentPatrimony: 1000,
      monthlyContribution: 0,
      annualReturnRate: 0,
      goalAmount: 1000000,
      maxYears: 10,
    })

    expect(result.reachable).toBe(false)
    expect(result.months).toBeNull()
    expect(result.years).toBeNull()
    expect(Number.isFinite(result.patrimonyAtCap)).toBe(true)
    expect(Number.isFinite(result.shortfallAtCap)).toBe(true)
    expect(result.patrimonyAtCap).toBeCloseTo(1000, 6)
    expect(result.shortfallAtCap).toBeCloseTo(1000000 - 1000, 6)
  })

  it('aporte negativo: patrimônio cai mas resultado permanece finito (CENÁRIO 33)', () => {
    const result = calculateGoalTimeline({
      currentPatrimony: 10000,
      monthlyContribution: -100,
      annualReturnRate: 0.05,
      goalAmount: 50000,
      maxYears: 5,
    })

    expect(result.reachable).toBe(false)
    expect(Number.isFinite(result.patrimonyAtCap)).toBe(true)
    expect(Number.isNaN(result.patrimonyAtCap)).toBe(false)
  })

  it('meta inatingível dentro do teto: retorna patrimonyAtCap/shortfallAtCap consistentes', () => {
    const goalAmount = 5000000
    const maxYears = 20
    const result = calculateGoalTimeline({
      currentPatrimony: 1000,
      monthlyContribution: 50,
      annualReturnRate: 0.06,
      goalAmount,
      maxYears,
    })

    expect(result.reachable).toBe(false)
    expect(result.capYears).toBe(maxYears)
    // Por definição: shortfallAtCap = goalAmount - patrimonyAtCap.
    expect(result.patrimonyAtCap + result.shortfallAtCap).toBeCloseTo(goalAmount, 6)
    expect(result.shortfallAtCap).toBeGreaterThan(0)
  })

  it('caso normal: meses encontrados batem com a projeção equivalente (±1 mês de arredondamento)', () => {
    const input = {
      currentPatrimony: 10000,
      monthlyContribution: 1000,
      annualReturnRate: 0.09,
    }
    const years = 8
    const projection = calculateProjection({ ...input, years })

    const result = calculateGoalTimeline({
      ...input,
      goalAmount: projection.finalAmount,
    })

    expect(result.reachable).toBe(true)
    expect(result.months).not.toBeNull()
    expect(result.months as number).toBeGreaterThanOrEqual(years * 12 - 1)
    expect(result.months as number).toBeLessThanOrEqual(years * 12 + 1)
  })
})
