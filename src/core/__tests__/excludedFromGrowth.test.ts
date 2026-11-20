import { describe, it, expect } from 'vitest'
import { calculateProjectionMetrics, type ProjectionAssetInput, type ProjectionInput } from '../portfolioProjection'
import { calculateCompoundInterest } from '../compoundInterest'

// Ativo que rende 10% a.a. (o único que conta para o crescimento) e um consórcio imobiliário de 60 parcelas de
// R$ 1.500 que NÃO conta para o crescimento. Inflação 0 para comparar com as fórmulas fechadas sem ajuste.
const CDB: ProjectionAssetInput = { name: 'CDB', currentValue: 10_000, expectedReturnRate: 0.1 }
const CONSORCIO: ProjectionAssetInput = {
  name: 'Consórcio imobiliário',
  currentValue: 0,
  expectedReturnRate: 0,
  monthlyContribution: 1500,
  remainingMonths: 60,
  excludedFromGrowth: true,
}

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    assets: [CDB, CONSORCIO],
    startingPatrimonyEstimate: 0,
    investmentsPlan: 3000,
    strategyNominalRate: 0.08,
    inflationRate: 0,
    goalAmount: 1_000_000,
    goalYears: 10,
    ...overrides,
  }
}

describe('ativo fora do crescimento (consórcio imobiliário)', () => {
  it('não entra no patrimônio inicial nem na taxa da carteira', () => {
    const metrics = calculateProjectionMetrics(input())
    expect(metrics.startingPatrimony).toBe(10_000)
    expect(metrics.rates.nominalUsed).toBeCloseTo(0.1, 12)
    expect(metrics.estimated).toBe(false)
  })

  it('o saldo do ativo fora do crescimento também fica de fora', () => {
    const metrics = calculateProjectionMetrics(
      input({ assets: [CDB, { name: 'Imóvel', currentValue: 50_000, expectedReturnRate: 0.05, excludedFromGrowth: true }] })
    )
    expect(metrics.startingPatrimony).toBe(10_000)
    expect(metrics.rates.nominalUsed).toBeCloseTo(0.1, 12)
  })

  it('a parcela continua saindo da fatia de Investimentos: abate o aporte livre', () => {
    const metrics = calculateProjectionMetrics(input())
    expect(metrics.contributions.committed).toBe(1500)
    expect(metrics.contributions.committedOutsideGrowth).toBe(1500)
    expect(metrics.contributions.free).toBe(1500)
  })

  it('durante o prazo, a projeção é a mesma de uma carteira sem o consórcio e com o aporte livre', () => {
    // Sem o consórcio, o aporte livre é o plano inteiro (1.500). Nos primeiros 60 meses os dois precisam coincidir.
    const withConsorcio = calculateProjectionMetrics(input()).base.series.slice(0, 6)
    const reference = calculateProjectionMetrics(input({ assets: [CDB], investmentsPlan: 1500 })).base.series.slice(0, 6)
    expect(withConsorcio).toHaveLength(6)
    withConsorcio.forEach((value, year) => expect(value).toBeCloseTo(reference[year]!, 6))
  })

  it('depois do fim das parcelas, o valor liberado volta a ser investido na taxa da carteira', () => {
    // Patrimônio no prazo (120 meses): o aporte livre de 1.500 o tempo todo, mais a continuação de 1.500 nos
    // meses 61 a 120, ambos a 10% a.a.
    const metrics = calculateProjectionMetrics(input())
    const expected =
      calculateCompoundInterest({ principal: 10_000, monthlyContribution: 1500, annualRate: 0.1, months: 120 }) +
      calculateCompoundInterest({ principal: 0, monthlyContribution: 1500, annualRate: 0.1, months: 60 })
    expect(metrics.base.valueAtDeadline).toBeCloseTo(expected, 2)
  })

  it('sem prazo, a parcela nunca vira fluxo de crescimento', () => {
    const metrics = calculateProjectionMetrics(
      input({ assets: [CDB, { ...CONSORCIO, remainingMonths: null }] })
    )
    const expected = calculateCompoundInterest({ principal: 10_000, monthlyContribution: 1500, annualRate: 0.1, months: 120 })
    expect(metrics.base.valueAtDeadline).toBeCloseTo(expected, 2)
  })

  it('só com ativos fora do crescimento, o patrimônio é a estimativa do onboarding', () => {
    const metrics = calculateProjectionMetrics(input({ assets: [CONSORCIO], startingPatrimonyEstimate: 12_000 }))
    expect(metrics.estimated).toBe(true)
    expect(metrics.startingPatrimony).toBe(12_000)
    expect(metrics.rates.source).toBe('strategy')
  })

  it('a velocidade desconta a parcela de quem está fora do crescimento', () => {
    const metrics = calculateProjectionMetrics(input())
    const monthlyNominalReturn = 10_000 * (Math.pow(1.1, 1 / 12) - 1)
    expect(metrics.velocity).toBeCloseTo(3000 - 1500 + monthlyNominalReturn, 6)
  })
})
