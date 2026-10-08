import { describe, it, expect } from 'vitest'
import {
  blendRates,
  calculateProjectionMetrics,
  MAX_LONG_RUN_NOMINAL_RATE,
  PROJECTION_HORIZON_YEARS,
  type ProjectionInput,
} from '../portfolioProjection'
import { calculateCompoundInterest } from '../compoundInterest'
import { calculateGoalTimeline } from '../goalTimeline'
import { toRealRate } from '../inflation'

const PERSONA_ASSETS = [
  { name: 'Tesouro Selic', currentValue: 20000, expectedReturnRate: 0.115 },
  { name: 'CDB', currentValue: 15000, expectedReturnRate: 0.11 },
  { name: 'ETF', currentValue: 6291, expectedReturnRate: 0.105 },
]

function personaInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    assets: PERSONA_ASSETS,
    startingPatrimonyEstimate: 0,
    investmentsPlan: 1445.25,
    strategyNominalRate: 0.087,
    inflationRate: 0.045,
    goalAmount: 20_000_000,
    goalYears: 30,
    ...overrides,
  }
}

describe('blendRates', () => {
  it('pondera as taxas pelo valor de cada ativo', () => {
    const result = blendRates(PERSONA_ASSETS, 0.087, 0)

    const expected = (20000 * 0.115 + 15000 * 0.11 + 6291 * 0.105) / 41291
    expect(result.source).toBe('portfolio')
    expect(result.nominalUsed).toBeCloseTo(expected, 10)
    expect(result.cappedAssets).toEqual([])
  })

  it('aplica o teto de longo prazo e lista só o ativo limitado', () => {
    const result = blendRates(
      [
        { name: 'Tesouro', currentValue: 9000, expectedReturnRate: 0.1 },
        { name: 'Bitcoin', currentValue: 1000, expectedReturnRate: 0.45 },
      ],
      0.087,
      0
    )

    expect(result.cappedAssets).toEqual([
      { name: 'Bitcoin', informedRate: 0.45, usedRate: MAX_LONG_RUN_NOMINAL_RATE },
    ])
    expect(result.nominalUsed).toBeCloseTo(0.9 * 0.1 + 0.1 * MAX_LONG_RUN_NOMINAL_RATE, 10)
  })

  it('sem ativos usa a taxa da estratégia (regressão: antes caía em 0%)', () => {
    const result = blendRates([], 0.087, 0.045)

    expect(result.source).toBe('strategy')
    expect(result.nominalUsed).toBe(0.087)
    expect(result.realUsed).toBeCloseTo(toRealRate(0.087, 0.045), 12)
  })

  it('inflação 0 mantém a taxa nominal', () => {
    expect(blendRates(PERSONA_ASSETS, 0.087, 0).realUsed).toBeCloseTo(
      blendRates(PERSONA_ASSETS, 0.087, 0).nominalUsed,
      12
    )
  })
})

describe('calculateProjectionMetrics', () => {
  it('ponte: com taxa única, anos e valor no prazo batem o motor de taxa única', () => {
    const input = personaInput({ goalAmount: 3_000_000 })
    const metrics = calculateProjectionMetrics(input)
    const realRate = metrics.rates.realUsed

    const reference = calculateGoalTimeline({
      currentPatrimony: 41291,
      monthlyContribution: 1445.25,
      annualReturnRate: realRate,
      goalAmount: 3_000_000,
      maxYears: PROJECTION_HORIZON_YEARS,
    })
    expect(metrics.base.reachable).toBe(reference.reachable)
    expect(metrics.base.years).toBe(reference.years)

    const atDeadline = calculateCompoundInterest({
      principal: 41291,
      monthlyContribution: 1445.25,
      annualRate: realRate,
      months: 30 * 12,
    })
    expect(Math.abs(metrics.base.valueAtDeadline - atDeadline) / atDeadline).toBeLessThan(1e-9)
  })

  it('o aporte é o investmentsPlan, não renda − custo (regressão do M4)', () => {
    const withPlan = calculateProjectionMetrics(personaInput({ investmentsPlan: 3000 }))
    const withoutPlan = calculateProjectionMetrics(personaInput({ investmentsPlan: 0 }))

    expect(withPlan.base.valueAtDeadline).toBeGreaterThan(withoutPlan.base.valueAtDeadline)
    expect(withoutPlan.boosted).toBeNull()
    expect(withoutPlan.stepUp).toBeNull()
  })

  it('sem ativos o patrimônio estimado rende à estratégia (não a 0%)', () => {
    const metrics = calculateProjectionMetrics(
      personaInput({ assets: [], startingPatrimonyEstimate: 50000, investmentsPlan: 0, goalYears: 10 })
    )
    const expected = calculateCompoundInterest({
      principal: 50000,
      monthlyContribution: 0,
      annualRate: toRealRate(0.087, 0.045),
      months: 120,
    })

    expect(metrics.estimated).toBe(true)
    expect(metrics.startingPatrimony).toBe(50000)
    expect(Math.abs(metrics.base.valueAtDeadline - expected) / expected).toBeLessThan(1e-9)
  })

  it('cenários em ordem: conservador ≥ base ≥ otimista em anos, e ≤ em patrimônio', () => {
    const metrics = calculateProjectionMetrics(personaInput({ goalAmount: 5_000_000 }))
    const years = (variant: { years: number | null }) => variant.years ?? Infinity

    expect(years(metrics.conservative)).toBeGreaterThanOrEqual(years(metrics.base))
    expect(years(metrics.base)).toBeGreaterThanOrEqual(years(metrics.optimistic))

    metrics.base.series.forEach((value, year) => {
      expect(metrics.conservative.series[year]).toBeLessThanOrEqual(value + 1e-6)
      expect(metrics.optimistic.series[year]).toBeGreaterThanOrEqual(value - 1e-6)
    })
  })

  it('um Bitcoin pequeno a 45% não derruba o prazo (teto de longo prazo)', () => {
    const without = calculateProjectionMetrics(personaInput({ goalAmount: 5_000_000 }))
    const withBitcoin = calculateProjectionMetrics(
      personaInput({
        goalAmount: 5_000_000,
        assets: [...PERSONA_ASSETS, { name: 'Bitcoin', currentValue: 2000, expectedReturnRate: 0.45 }],
      })
    )

    expect(withBitcoin.rates.cappedAssets).toHaveLength(1)
    expect(Math.abs((withBitcoin.base.years ?? 0) - (without.base.years ?? 0))).toBeLessThan(2)
  })

  it('requiredContribution fecha a meta no prazo e bate o PMT fechado', () => {
    const metrics = calculateProjectionMetrics(personaInput())
    const required = metrics.requiredContribution.base
    const realRate = metrics.rates.realUsed

    expect(required).not.toBeNull()

    const reached = calculateCompoundInterest({
      principal: 41291,
      monthlyContribution: required ?? 0,
      annualRate: realRate,
      months: 360,
    })
    expect(reached).toBeGreaterThanOrEqual(20_000_000)
    expect(reached).toBeLessThan(20_000_000 + (required ?? 0)) // arredondou para cima no máximo R$ 1

    const underfunded = calculateCompoundInterest({
      principal: 41291,
      monthlyContribution: (required ?? 0) - 5,
      annualRate: realRate,
      months: 360,
    })
    expect(underfunded).toBeLessThan(20_000_000)
  })

  it('o aporte necessário no cenário conservador é maior que no base', () => {
    const { requiredContribution } = calculateProjectionMetrics(personaInput())

    expect(requiredContribution.conservative).toBeGreaterThan(requiredContribution.base ?? 0)
  })

  it('cenário da persona (R$ 20 mi em 30 anos): bate a simulação independente', () => {
    const metrics = calculateProjectionMetrics(personaInput())

    // Simulação independente do plano: ≈ R$ 1,77 mi no ano 30 (≈ 8,9% da meta) e meta fora do horizonte.
    expect(metrics.base.valueAtDeadline).toBeGreaterThan(1_700_000)
    expect(metrics.base.valueAtDeadline).toBeLessThan(1_850_000)
    expect(metrics.deadlineProgressPercent).toBeGreaterThan(8.5)
    expect(metrics.deadlineProgressPercent).toBeLessThan(9.3)
    expect(metrics.base.reachable).toBe(false)
    expect(metrics.meetsDeadline).toBe(false)
    expect(metrics.requiredContribution.base).toBeGreaterThan(17_000)
    expect(metrics.requiredContribution.base).toBeLessThan(21_000)
  })

  it('horizonte do gráfico: clamp 10–60 e prazo marcado mesmo com meta inatingível', () => {
    expect(calculateProjectionMetrics(personaInput()).chartYears).toBe(45) // 30 × 1,5

    const shortGoal = calculateProjectionMetrics(personaInput({ goalYears: 2, goalAmount: 60_000 }))
    expect(shortGoal.chartYears).toBeGreaterThanOrEqual(10)

    const longGoal = calculateProjectionMetrics(personaInput({ goalYears: 80 }))
    expect(longGoal.chartYears).toBe(60)
    expect(longGoal.horizonYears).toBe(80)
    expect(longGoal.base.valueAtDeadline).toBeGreaterThan(longGoal.base.series[60] ?? 0)
  })

  it('meta já atingida: sem aporte necessário, sem alavancas, sem NaN', () => {
    const metrics = calculateProjectionMetrics(personaInput({ goalAmount: 10_000 }))

    expect(metrics.base.years).toBe(0)
    expect(metrics.meetsDeadline).toBe(true)
    expect(metrics.requiredContribution.base).toBe(0)
    expect(metrics.boosted).toBeNull()
    expect(metrics.stepUp).toBeNull()
  })

  it('aporte zero e sem ativos: sem NaN nem Infinity', () => {
    const metrics = calculateProjectionMetrics(
      personaInput({ assets: [], startingPatrimonyEstimate: 0, investmentsPlan: 0 })
    )

    const numbers = [
      metrics.velocity,
      metrics.deadlineProgressPercent,
      metrics.base.valueAtDeadline,
      ...metrics.base.series,
    ]
    numbers.forEach((value) => expect(Number.isFinite(value)).toBe(true))
    expect(metrics.base.reachable).toBe(false)
    expect(metrics.requiredContribution.base).toBeGreaterThan(0)
  })

  it('alavancas melhoram o patrimônio no prazo', () => {
    const metrics = calculateProjectionMetrics(personaInput())

    expect(metrics.boosted?.valueAtDeadline).toBeGreaterThan(metrics.base.valueAtDeadline)
    expect(metrics.stepUp?.valueAtDeadline).toBeGreaterThan(metrics.base.valueAtDeadline)
  })
})
