import { describe, expect, it } from 'vitest'
import { ALLOCATION_MODELS, calculateModelExpectedReturn } from '../allocationModels'

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
    // alternatives: (10.5% + 45%) / 2 = 27.75% · cash: 0%
    // 0.3*9.25 + 0.4*9.5 + 0.2*27.75 + 0.1*0 = 12.125%
    expect(calculateModelExpectedReturn(ALLOCATION_MODELS.ALL_WEATHER)).toBeCloseTo(0.12125, 5)
  })

  it('modelo 100% concentrado numa classe retorna a taxa média daquela classe', () => {
    const cashOnly = { label: 'Só caixa', stocks: 0, bonds: 0, alternatives: 0, cash: 1 }
    expect(calculateModelExpectedReturn(cashOnly)).toBe(0)

    const stocksOnly = { label: 'Só ações', stocks: 1, bonds: 0, alternatives: 0, cash: 0 }
    expect(calculateModelExpectedReturn(stocksOnly)).toBeCloseTo(0.0925, 5)
  })
})
