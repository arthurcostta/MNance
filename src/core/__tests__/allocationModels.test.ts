import { describe, expect, it } from 'vitest'
import { ALLOCATION_MODELS } from '../allocationModels'

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
