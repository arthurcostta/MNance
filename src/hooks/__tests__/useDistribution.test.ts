import { describe, it, expect } from 'vitest'
import {
  validateNivelUm,
  validateCustomAllocation,
  calculateDistributionAmounts,
  resolveAllocationModel,
  validateInvestmentBuckets,
  calculateBlendedExpectedReturn,
  resolveStoredDistribution,
  calculateEssentialsComparison,
  splitIncomeByShare,
  shareFromAmounts,
  validatePaydayAmounts,
  type NivelUmInput,
  type PaydayAmountInput,
} from '../useDistribution'
import { ALLOCATION_MODELS, calculateModelExpectedReturn } from '../../core/allocationModels'
import type { CustomAllocation, Distribution, InvestmentBucket } from '../../types/distribution'

describe('validateNivelUm', () => {
  const valid: NivelUmInput = {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
    companyCashPercent: 0,
  }

  it('should pass when the sum is exactly 100', () => {
    expect(Object.keys(validateNivelUm(valid)).length).toBe(0)
  })

  it('should error with the exact shortfall when the sum is 95', () => {
    const input = { ...valid, investmentsPercent: 20 }
    const errors = validateNivelUm(input)
    expect(errors.total).toBe('Faltam 5,0% para completar 100%.')
  })

  it('should error with the exact excess when the sum is 105', () => {
    const input = { ...valid, investmentsPercent: 30 }
    const errors = validateNivelUm(input)
    expect(errors.total).toBe('A soma excedeu 100% em 5,0%.')
  })

  it('should tolerate floating-point rounding (33.33 + 33.33 + 33.34 + 0 + 0)', () => {
    const input: NivelUmInput = {
      essentialsPercent: 33.33,
      educationPercent: 33.33,
      leisurePercent: 33.34,
      investmentsPercent: 0,
      companyCashPercent: 0,
    }
    expect(validateNivelUm(input).total).toBeUndefined()
  })

  it('should error when a field is negative or above 100', () => {
    expect(validateNivelUm({ ...valid, essentialsPercent: -5 }).essentialsPercent).toBeDefined()
    expect(validateNivelUm({ ...valid, essentialsPercent: 105 }).essentialsPercent).toBeDefined()
  })

  it('should validate companyCashPercent (5th category, new in M5.5) the same as the other fields', () => {
    expect(validateNivelUm({ ...valid, companyCashPercent: -1 }).companyCashPercent).toBeDefined()
    const withCompanyCash = { ...valid, investmentsPercent: 15, companyCashPercent: 10 }
    expect(Object.keys(validateNivelUm(withCompanyCash)).length).toBe(0)
  })
})

describe('validateCustomAllocation', () => {
  const valid: CustomAllocation = { stocks: 30, bonds: 40, alternatives: 20, cash: 10 }

  it('should pass when the sum is exactly 100', () => {
    expect(Object.keys(validateCustomAllocation(valid)).length).toBe(0)
  })

  it('should error when the sum is not 100', () => {
    const errors = validateCustomAllocation({ ...valid, cash: 20 })
    expect(errors.total).toBeDefined()
  })

  it('should error when a field is out of [0, 100]', () => {
    expect(validateCustomAllocation({ ...valid, stocks: -1 }).stocks).toBeDefined()
  })
})

describe('calculateDistributionAmounts', () => {
  const split: NivelUmInput = {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
    companyCashPercent: 0,
  }

  it('should split monthlyIncomeNet according to each percentage for a single payday', () => {
    const amounts = calculateDistributionAmounts([{ split, incomeShareFraction: 1 }], 4000)
    expect(amounts.essentials).toBeCloseTo(2200, 5)
    expect(amounts.education).toBeCloseTo(400, 5)
    expect(amounts.leisure).toBeCloseTo(400, 5)
    expect(amounts.investments).toBeCloseTo(1000, 5)
    expect(amounts.companyCash).toBeCloseTo(0, 5)
  })

  it('should not produce NaN when monthlyIncomeNet is 0', () => {
    const amounts = calculateDistributionAmounts([{ split, incomeShareFraction: 1 }], 0)
    expect(amounts.essentials).toBe(0)
    expect(amounts.investments).toBe(0)
  })

  it('should aggregate two paydays with the same split and 50/50 share into the same total as one payday at 100%', () => {
    const paydays: PaydayAmountInput[] = [
      { split, incomeShareFraction: 0.5 },
      { split, incomeShareFraction: 0.5 },
    ]
    const twoPaydayAmounts = calculateDistributionAmounts(paydays, 4000)
    const onePaydayAmounts = calculateDistributionAmounts([{ split, incomeShareFraction: 1 }], 4000)
    expect(twoPaydayAmounts.essentials).toBeCloseTo(onePaydayAmounts.essentials, 5)
    expect(twoPaydayAmounts.investments).toBeCloseTo(onePaydayAmounts.investments, 5)
  })

  it('should aggregate two paydays with different splits and an uneven income share, matching a manual calculation', () => {
    const payday1Split: NivelUmInput = {
      essentialsPercent: 60,
      educationPercent: 5,
      leisurePercent: 5,
      investmentsPercent: 20,
      companyCashPercent: 10,
    }
    const payday2Split: NivelUmInput = {
      essentialsPercent: 40,
      educationPercent: 20,
      leisurePercent: 20,
      investmentsPercent: 20,
      companyCashPercent: 0,
    }
    const monthlyIncomeNet = 5000
    const amounts = calculateDistributionAmounts(
      [
        { split: payday1Split, incomeShareFraction: 0.7 },
        { split: payday2Split, incomeShareFraction: 0.3 },
      ],
      monthlyIncomeNet
    )

    const payday1Income = monthlyIncomeNet * 0.7
    const payday2Income = monthlyIncomeNet * 0.3
    const expectedEssentials = payday1Income * 0.6 + payday2Income * 0.4
    const expectedCompanyCash = payday1Income * 0.1

    expect(amounts.essentials).toBeCloseTo(expectedEssentials, 5)
    expect(amounts.companyCash).toBeCloseTo(expectedCompanyCash, 5)
  })
})

describe('resolveAllocationModel', () => {
  it('should return the exact preset for a preset key', () => {
    expect(resolveAllocationModel('ALL_WEATHER')).toEqual(ALLOCATION_MODELS.ALL_WEATHER)
    expect(resolveAllocationModel('CONSERVATIVE')).toEqual(ALLOCATION_MODELS.CONSERVATIVE)
    expect(resolveAllocationModel('AGGRESSIVE')).toEqual(ALLOCATION_MODELS.AGGRESSIVE)
  })

  it('should convert CUSTOM percentages to fractions', () => {
    const custom: CustomAllocation = { stocks: 30, bonds: 40, alternatives: 20, cash: 10 }
    expect(resolveAllocationModel('CUSTOM', custom)).toEqual({
      label: 'Personalizado',
      stocks: 0.3,
      bonds: 0.4,
      alternatives: 0.2,
      cash: 0.1,
    })
  })

  it('should default CUSTOM to zeros when no allocation is provided', () => {
    expect(resolveAllocationModel('CUSTOM')).toEqual({
      label: 'Personalizado',
      stocks: 0,
      bonds: 0,
      alternatives: 0,
      cash: 0,
    })
  })
})

describe('validateInvestmentBuckets', () => {
  function makeBucket(overrides: Partial<InvestmentBucket> = {}): InvestmentBucket {
    return {
      id: 'bucket-1',
      name: 'Meus Investimentos',
      percentOfInvestments: 100,
      allocationModel: 'ALL_WEATHER',
      ...overrides,
    }
  }

  it('should pass with a single bucket at 100%', () => {
    const errors = validateInvestmentBuckets([makeBucket()])
    expect(errors.total).toBeUndefined()
    expect(Object.keys(errors.byBucket).length).toBe(0)
  })

  it('should error when there are no buckets at all', () => {
    const errors = validateInvestmentBuckets([])
    expect(errors.total).toBe('Adicione pelo menos um objetivo de investimento.')
  })

  it('should error on the total when percentOfInvestments does not sum to 100', () => {
    const errors = validateInvestmentBuckets([
      makeBucket({ id: 'a', percentOfInvestments: 60 }),
      makeBucket({ id: 'b', percentOfInvestments: 30 }),
    ])
    expect(errors.total).toBeDefined()
  })

  it('should error per-bucket when the name is missing', () => {
    const errors = validateInvestmentBuckets([makeBucket({ name: '   ' })])
    expect(errors.byBucket['bucket-1']?.name).toBeDefined()
  })

  it('should error per-bucket when percentOfInvestments is out of [0, 100]', () => {
    const errors = validateInvestmentBuckets([makeBucket({ percentOfInvestments: -10 })])
    expect(errors.byBucket['bucket-1']?.percentOfInvestments).toBeDefined()
  })
})

describe('calculateBlendedExpectedReturn', () => {
  it('should return 0 for an empty list (safety net, never NaN)', () => {
    expect(calculateBlendedExpectedReturn([])).toBe(0)
  })

  it('should match calculateModelExpectedReturn exactly for a single bucket at 100% (regression vs. M5 behavior)', () => {
    const buckets: InvestmentBucket[] = [
      { id: '1', name: 'Único', percentOfInvestments: 100, allocationModel: 'ALL_WEATHER' },
    ]
    expect(calculateBlendedExpectedReturn(buckets)).toBeCloseTo(
      calculateModelExpectedReturn(ALLOCATION_MODELS.ALL_WEATHER),
      10
    )
  })

  it('should compute a weighted average across buckets with different models', () => {
    const buckets: InvestmentBucket[] = [
      { id: '1', name: 'A', percentOfInvestments: 50, allocationModel: 'ALL_WEATHER' },
      { id: '2', name: 'B', percentOfInvestments: 50, allocationModel: 'CONSERVATIVE' },
    ]
    const expected =
      (calculateModelExpectedReturn(ALLOCATION_MODELS.ALL_WEATHER) +
        calculateModelExpectedReturn(ALLOCATION_MODELS.CONSERVATIVE)) /
      2
    expect(calculateBlendedExpectedReturn(buckets)).toBeCloseTo(expected, 10)
  })
})

describe('resolveStoredDistribution', () => {
  const context = { riskProfile: 'moderate' as const, hasSecondPayday: false }

  it('should use the new-shape document directly (case 1)', () => {
    const stored = {
      payday1Split: {
        essentialsPercent: 50,
        educationPercent: 15,
        leisurePercent: 15,
        investmentsPercent: 20,
        companyCashPercent: 0,
      },
      investmentBuckets: [
        { id: 'x', name: 'Casa', percentOfInvestments: 100, allocationModel: 'AGGRESSIVE' as const },
      ],
    } as unknown as Distribution

    const resolved = resolveStoredDistribution(stored, context)
    expect(resolved.payday1Split.essentialsPercent).toBe(50)
    expect(resolved.investmentBuckets[0]?.name).toBe('Casa')
  })

  it('should convert an M5 flat document without a second payday into 1 split + 1 bucket (case 2)', () => {
    const stored = {
      essentialsPercent: 55,
      educationPercent: 10,
      leisurePercent: 10,
      investmentsPercent: 25,
      allocationModel: 'CONSERVATIVE',
    } as unknown as Distribution

    const resolved = resolveStoredDistribution(stored, { riskProfile: 'moderate', hasSecondPayday: false })
    expect(resolved.payday1Split).toEqual({
      essentialsPercent: 55,
      educationPercent: 10,
      leisurePercent: 10,
      investmentsPercent: 25,
      companyCashPercent: 0,
    })
    expect(resolved.investmentBuckets).toHaveLength(1)
    expect(resolved.investmentBuckets[0]?.allocationModel).toBe('CONSERVATIVE')
    expect(resolved.payday2Split).toBeUndefined()
  })

  it('should fall back to the new default when an M5 flat document exists but the user now has a second payday (case 3)', () => {
    const stored = {
      essentialsPercent: 55,
      educationPercent: 10,
      leisurePercent: 10,
      investmentsPercent: 25,
      allocationModel: 'CONSERVATIVE',
    } as unknown as Distribution

    const resolved = resolveStoredDistribution(stored, { riskProfile: 'aggressive', hasSecondPayday: true })
    expect(resolved.payday2Split).toBeDefined()
    expect(resolved.payday1IncomeSharePercent).toBe(50)
    expect(resolved.investmentBuckets[0]?.allocationModel).toBe('AGGRESSIVE')
  })

  it('should fall back to the new default for an M2 (3-category) document or null (case 4)', () => {
    const m2Doc = {
      essentialsPercent: 50,
      freedomPercent: 30,
      investmentsPercent: 20,
    } as unknown as Distribution

    const resolvedFromM2 = resolveStoredDistribution(m2Doc, context)
    expect(resolvedFromM2.payday1Split.essentialsPercent).toBe(55)

    const resolvedFromNull = resolveStoredDistribution(null, context)
    expect(resolvedFromNull.payday1Split.essentialsPercent).toBe(55)
    expect(resolvedFromNull.investmentBuckets).toHaveLength(1)
  })
})

describe('calculateEssentialsComparison', () => {
  it('should return a positive balance when budget exceeds real spending', () => {
    expect(calculateEssentialsComparison(2000, 1500)).toEqual({ budget: 2000, real: 1500, balance: 500 })
  })

  it('should return a negative balance when real spending exceeds budget', () => {
    expect(calculateEssentialsComparison(2000, 2500)).toEqual({ budget: 2000, real: 2500, balance: -500 })
  })

  it('should return a zero balance when they match exactly', () => {
    expect(calculateEssentialsComparison(2000, 2000).balance).toBe(0)
  })
})

// M5.6: Valor recebido por pagamento
describe('splitIncomeByShare', () => {
  it('should split income according to a percentage', () => {
    const result = splitIncomeByShare(4900, 60)
    expect(Math.abs(result.payday1Amount - 2940) < 0.01).toBe(true)
    expect(Math.abs(result.payday2Amount - 1960) < 0.01).toBe(true)
  })

  it('should return both as 0 when total is 0', () => {
    const result = splitIncomeByShare(0, 50)
    expect(result.payday1Amount).toBe(0)
    expect(result.payday2Amount).toBe(0)
  })

  it('should have exact sum at centavos precision', () => {
    const result = splitIncomeByShare(3890.57, 61.2)
    const sum = Math.round((result.payday1Amount + result.payday2Amount) * 100) / 100
    expect(Math.abs(sum - 3890.57) < 0.01).toBe(true)
  })
})

describe('shareFromAmounts', () => {
  it('should calculate the percentage of payday1', () => {
    const share = shareFromAmounts(3000, 1900)
    expect(Math.abs(share - 61.22) < 0.1).toBe(true)
  })

  it('should return 50 when total is 0', () => {
    const share = shareFromAmounts(0, 0)
    expect(share).toBe(50)
  })

  it('should return 100 when only payday1 exists', () => {
    const share = shareFromAmounts(5000, 0)
    expect(share).toBe(100)
  })

  it('should return 0 when only payday2 exists', () => {
    const share = shareFromAmounts(0, 5000)
    expect(share).toBe(0)
  })
})

describe('validatePaydayAmounts', () => {
  it('should pass with valid 1-payday income', () => {
    const errors = validatePaydayAmounts({ payday1Amount: 5000, payday2Amount: 0 }, false)
    expect(Object.keys(errors).length).toBe(0)
  })

  it('should pass with valid 2-payday income', () => {
    const errors = validatePaydayAmounts({ payday1Amount: 3000, payday2Amount: 2000 }, true)
    expect(Object.keys(errors).length).toBe(0)
  })

  it('should error when 1-payday amount is <= 0', () => {
    const errors = validatePaydayAmounts({ payday1Amount: 0, payday2Amount: 0 }, false)
    expect(errors.total).toBeDefined()
  })

  it('should error when 2-payday sum is <= 0', () => {
    const errors = validatePaydayAmounts({ payday1Amount: 0, payday2Amount: 0 }, true)
    expect(errors.total).toBeDefined()
  })

  it('should allow 2nd payday = 0 (all in 1st)', () => {
    const errors = validatePaydayAmounts({ payday1Amount: 5000, payday2Amount: 0 }, true)
    expect(Object.keys(errors).length).toBe(0)
  })

  it('should error when values are negative', () => {
    const errors = validatePaydayAmounts({ payday1Amount: -100, payday2Amount: 0 }, false)
    expect(errors.payday1Amount).toBeDefined()
  })

  it('should error when values are not finite (NaN, Infinity)', () => {
    const errors = validatePaydayAmounts({ payday1Amount: NaN, payday2Amount: 0 }, false)
    expect(errors.payday1Amount).toBeDefined()
  })
})
