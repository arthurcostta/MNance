import { describe, expect, it } from 'vitest'
import { ALLOCATION_MODELS, calculateModelExpectedReturn, classifyModelOscillation } from '../allocationModels'

describe('allocationModels', () => {
  it.each(Object.entries(ALLOCATION_MODELS))(
    '%s: soma das alocações é 100%%',
    (_key, model) => {
      const total = model.stocks + model.bonds + model.alternatives + model.cash
      expect(total).toBeCloseTo(1, 5)
    },
  )

  it('All Weather segue a definição canônica de Ray Dalio (30/40/20/10)', () => {
    expect(ALLOCATION_MODELS.ALL_WEATHER).toMatchObject({
      stocks: 0.3,
      bonds: 0.4,
      alternatives: 0.2,
      cash: 0.1,
    })
  })
})

describe('calculateModelExpectedReturn', () => {
  it('All Weather bate o cálculo manual das taxas médias por classe (ASSET_RETURN_RATES)', () => {
    // stocks: (8% + 10.5%) / 2 = 9.25% · bonds: (11.5% + 11% + 6%) / 3 = 9.5%
    // alternatives: 10.5% (FII only; Bitcoin excluído por inClassAverage: false) · cash: 0%
    // 0.3*9.25 + 0.4*9.5 + 0.2*10.5 + 0.1*0 = 8.675%
    expect(calculateModelExpectedReturn(ALLOCATION_MODELS.ALL_WEATHER)).toBeCloseTo(0.08675, 5)
  })

  it('modelo 100% concentrado numa classe retorna a taxa média daquela classe', () => {
    const cashOnly = { label: 'Só caixa', stocks: 0, bonds: 0, alternatives: 0, cash: 1 }
    expect(calculateModelExpectedReturn(cashOnly)).toBe(0)

    const stocksOnly = { label: 'Só ações', stocks: 1, bonds: 0, alternatives: 0, cash: 0 }
    expect(calculateModelExpectedReturn(stocksOnly)).toBeCloseTo(0.0925, 5)
  })
})

// M5.6: Classificação de oscilação
describe('classifyModelOscillation', () => {
  it('All Weather (30% ações) tem oscilação baixa', () => {
    expect(classifyModelOscillation(ALLOCATION_MODELS.ALL_WEATHER)).toBe('low')
  })

  it('Conservador (50% ações) tem oscilação média', () => {
    expect(classifyModelOscillation(ALLOCATION_MODELS.CONSERVATIVE)).toBe('medium')
  })

  it('Agressivo (70% ações) tem oscilação alta', () => {
    expect(classifyModelOscillation(ALLOCATION_MODELS.AGGRESSIVE)).toBe('high')
  })

  it('Modelo com exatamente 40% ações tem oscilação baixa', () => {
    const model = { label: 'Test', stocks: 0.4, bonds: 0.4, alternatives: 0.1, cash: 0.1 }
    expect(classifyModelOscillation(model)).toBe('low')
  })

  it('Modelo com exatamente 60% ações tem oscilação média', () => {
    const model = { label: 'Test', stocks: 0.6, bonds: 0.2, alternatives: 0.1, cash: 0.1 }
    expect(classifyModelOscillation(model)).toBe('medium')
  })

  it('Modelo com 61% ações tem oscilação alta', () => {
    const model = { label: 'Test', stocks: 0.61, bonds: 0.2, alternatives: 0.1, cash: 0.09 }
    expect(classifyModelOscillation(model)).toBe('high')
  })
})
