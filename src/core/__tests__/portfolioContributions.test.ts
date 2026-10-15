// Aporte programado por ativo (M5.8 Fase 2): consórcio de R$ 1.500/mês a 0% ao lado de uma carteira que rende
// ~11% nominal. Cada valor é conferido contra uma fórmula fechada calculada fluxo a fluxo (sem o motor de fluxos).

import { describe, it, expect } from 'vitest'
import {
  calculateProjectionMetrics,
  MAX_LONG_RUN_NOMINAL_RATE,
  type ProjectionAssetInput,
  type ProjectionInput,
} from '../portfolioProjection'
import { calculateCompoundInterest } from '../compoundInterest'
import { toRealRate } from '../inflation'

const PERSONA_ASSETS: ProjectionAssetInput[] = [
  { name: 'Tesouro Selic', currentValue: 20000, expectedReturnRate: 0.115 },
  { name: 'CDB', currentValue: 15000, expectedReturnRate: 0.11 },
  { name: 'ETF', currentValue: 6291, expectedReturnRate: 0.105 },
]

const CONSORCIO: ProjectionAssetInput = {
  name: 'Consórcio',
  currentValue: 0,
  expectedReturnRate: 0,
  monthlyContribution: 1500,
  remainingMonths: 60,
}

const PLAN = 2878.8 // "Investir tudo": fatia de 25% + saldo das essenciais
const INFLATION = 0.045
const MONTHS = 360

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    assets: PERSONA_ASSETS,
    startingPatrimonyEstimate: 0,
    investmentsPlan: 1445.25,
    strategyNominalRate: 0.087,
    inflationRate: INFLATION,
    goalAmount: 20_000_000,
    goalYears: 30,
    ...overrides,
  }
}

function withConsorcio(overrides: Partial<ProjectionInput> = {}, consorcio: ProjectionAssetInput = CONSORCIO) {
  return input({ assets: [...PERSONA_ASSETS, consorcio], investmentsPlan: PLAN, ...overrides })
}

const permanentConsorcio: ProjectionAssetInput = { ...CONSORCIO, remainingMonths: null }

function fv(principal: number, monthlyContribution: number, annualRate: number, months: number) {
  return calculateCompoundInterest({ principal, monthlyContribution, annualRate, months })
}

function expectClose(actual: number, expected: number) {
  expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-9)
}

// Valor no prazo: patrimônio atual + aporte livre (taxa da carteira) + parcela (taxa própria) + valor liberado
// reinvestido na taxa da carteira depois da última parcela.
function independentValue(portfolioRate: number, consorcioRate: number, remaining: number | null, freeFactor = 1) {
  const free = (PLAN - 1500) * freeFactor
  const base = fv(41291, 0, portfolioRate, MONTHS) + fv(0, free, portfolioRate, MONTHS)

  if (remaining === null) return base + fv(0, 1500, consorcioRate, MONTHS)

  const paidAndGrown = fv(fv(0, 1500, consorcioRate, remaining), 0, consorcioRate, MONTHS - remaining)
  const reinvested = fv(0, 1500, portfolioRate, MONTHS - remaining)
  return base + paidAndGrown + reinvested
}

describe('divisão do aporte planejado', () => {
  it('separa parcela programada e aporte livre', () => {
    const { contributions } = calculateProjectionMetrics(withConsorcio())

    expect(contributions.committed).toBe(1500)
    expect(contributions.free).toBeCloseTo(1378.8, 6)
    expect(contributions.effectiveMonthly).toBeCloseTo(PLAN, 6)
    expect(contributions.shortfall).toBe(0)
    expect(contributions.programmed).toHaveLength(1)
  })

  it('parcela maior que a fatia: cobra o valor real, avisa a falta e some com as alavancas', () => {
    const metrics = calculateProjectionMetrics(withConsorcio({ investmentsPlan: 1445.25 }))

    expect(metrics.contributions.free).toBe(0)
    expect(metrics.contributions.effectiveMonthly).toBe(1500)
    expect(metrics.contributions.shortfall).toBeCloseTo(54.75, 6)
    expect(metrics.boosted).toBeNull()
    expect(metrics.stepUp).toBeNull()
    expect(metrics.velocity).toBeGreaterThanOrEqual(1500)
  })

  it('aporte encerrado (0 parcelas) sai dos totais e da projeção', () => {
    const ended = calculateProjectionMetrics(withConsorcio({}, { ...CONSORCIO, remainingMonths: 0 }))
    const none = calculateProjectionMetrics(input({ investmentsPlan: PLAN }))

    expect(ended.contributions.committed).toBe(0)
    expect(ended.contributions.programmed).toEqual([])
    expect(ended.base.valueAtDeadline).toBeCloseTo(none.base.valueAtDeadline, 6)
  })

  it('aporte programado de valor 0 é ignorado', () => {
    const { contributions } = calculateProjectionMetrics(withConsorcio({}, { ...CONSORCIO, monthlyContribution: 0 }))

    expect(contributions.committed).toBe(0)
    expect(contributions.programmed).toEqual([])
  })

  it('taxa do aporte programado também respeita o teto de longo prazo', () => {
    const metrics = calculateProjectionMetrics(
      withConsorcio({}, { ...CONSORCIO, name: 'Cripto programada', expectedReturnRate: 0.45 })
    )

    expect(metrics.contributions.programmed[0]?.usedNominalRate).toBe(MAX_LONG_RUN_NOMINAL_RATE)
  })
})

describe('projeção com aporte programado', () => {
  it('valor no prazo bate o cálculo independente (0% por 60 meses, depois reinvestido)', () => {
    const metrics = calculateProjectionMetrics(withConsorcio())

    expectClose(metrics.base.valueAtDeadline, independentValue(metrics.rates.realUsed, toRealRate(0, INFLATION), 60))
  })

  it('aporte sem prazo não gera continuação', () => {
    const metrics = calculateProjectionMetrics(withConsorcio({}, permanentConsorcio))

    expectClose(metrics.base.valueAtDeadline, independentValue(metrics.rates.realUsed, toRealRate(0, INFLATION), null))
    expect(metrics.contributions.programmed[0]?.remainingMonths).toBeNull()
  })

  it('o valor liberado reinvestido rende mais que manter o consórcio para sempre a 0%', () => {
    const withEnd = calculateProjectionMetrics(withConsorcio())
    const permanent = calculateProjectionMetrics(withConsorcio({}, permanentConsorcio))

    expect(withEnd.base.valueAtDeadline).toBeGreaterThan(permanent.base.valueAtDeadline)
  })

  it('a curva não cai quando a parcela termina', () => {
    const { base } = calculateProjectionMetrics(withConsorcio({ goalAmount: 1_000_000_000 }))

    for (let year = 1; year < base.series.length; year++) {
      expect(base.series[year] ?? 0).toBeGreaterThanOrEqual(base.series[year - 1] ?? 0)
    }
  })

  it('a parcela rende a taxa própria (0%), não a da carteira', () => {
    const portfolioOnly = calculateProjectionMetrics(input({ investmentsPlan: PLAN }))
    const withProgrammed = calculateProjectionMetrics(withConsorcio())

    expect(withProgrammed.base.valueAtDeadline).toBeLessThan(portfolioOnly.base.valueAtDeadline)
  })

  it('cenário conservador desloca a carteira, mas não o fluxo a 0%', () => {
    const metrics = calculateProjectionMetrics(withConsorcio())

    expectClose(
      metrics.conservative.valueAtDeadline,
      independentValue(metrics.rates.realUsed - 0.02, toRealRate(0, INFLATION), 60)
    )
  })

  it('+20% incide só sobre o aporte livre', () => {
    const metrics = calculateProjectionMetrics(withConsorcio())

    expect(metrics.boosted).not.toBeNull()
    expectClose(
      metrics.boosted?.valueAtDeadline ?? 0,
      independentValue(metrics.rates.realUsed, toRealRate(0, INFLATION), 60, 1.2)
    )
  })

  it('ativo novo com saldo 0 não é "estimativa" (taxa da estratégia, patrimônio real)', () => {
    const metrics = calculateProjectionMetrics(
      input({ assets: [CONSORCIO], startingPatrimonyEstimate: 50_000, investmentsPlan: PLAN })
    )

    expect(metrics.estimated).toBe(false)
    expect(metrics.startingPatrimony).toBe(0)
    expect(metrics.rates.source).toBe('strategy')
  })

  it('sem aporte programado o resultado é idêntico ao da Fase 3b (regressão)', () => {
    const plain = calculateProjectionMetrics(input())
    const zeroed = calculateProjectionMetrics(
      input({ assets: PERSONA_ASSETS.map((asset) => ({ ...asset, monthlyContribution: 0 })) })
    )

    expect(zeroed.base.valueAtDeadline).toBe(plain.base.valueAtDeadline)
    expect(zeroed.base.years).toBe(plain.base.years)
    expect(zeroed.requiredContribution).toEqual(plain.requiredContribution)
    expect(plain.contributions.committed).toBe(0)
    expect(plain.contributions.free).toBeCloseTo(1445.25, 6)
  })
})

describe('aporte necessário com parcelas programadas', () => {
  it('é o total mensal (parcelas + livre) e fecha a meta no prazo', () => {
    const required = calculateProjectionMetrics(withConsorcio()).requiredContribution.base

    expect(required).not.toBeNull()
    expect(required ?? 0).toBeGreaterThan(1500)

    const enough = calculateProjectionMetrics(withConsorcio({ investmentsPlan: required ?? 0 }))
    expect(enough.base.valueAtDeadline).toBeGreaterThanOrEqual(20_000_000)

    const short = calculateProjectionMetrics(withConsorcio({ investmentsPlan: (required ?? 0) - 5 }))
    expect(short.base.valueAtDeadline).toBeLessThan(20_000_000)
  })

  it('0 quando só com o que está programado a meta já fecha', () => {
    const metrics = calculateProjectionMetrics(withConsorcio({ goalAmount: 100_000 }))

    expect(metrics.requiredContribution.base).toBe(0)
  })
})
