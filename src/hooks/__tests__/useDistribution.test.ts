import { describe, it, expect } from 'vitest'
import {
  validateNivelUm,
  validateCustomAllocation,
  calculateDistributionAmounts,
  resolveAllocationModel,
  resolveStoredDistribution,
  calculateEssentialsComparison,
  calculateMonthlyFlow,
  validateSurplusPercent,
  splitIncomeByShare,
  shareFromAmounts,
  validatePaydayAmounts,
  type DistributionAmounts,
  type NivelUmInput,
  type PaydayAmountInput,
} from '../useDistribution'
import { ALLOCATION_MODELS } from '../../core/allocationModels'
import type { CustomAllocation, Distribution } from '../../types/distribution'

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

describe('resolveStoredDistribution', () => {
  const context = { hasSecondPayday: false }

  it('should use a current-shape document directly, keeping the surplus rule', () => {
    const stored = {
      payday1Split: {
        essentialsPercent: 50,
        educationPercent: 15,
        leisurePercent: 15,
        investmentsPercent: 20,
        companyCashPercent: 0,
      },
      surplusInvestmentsPercent: 70,
    } as unknown as Distribution

    const resolved = resolveStoredDistribution(stored, context)
    expect(resolved.payday1Split.essentialsPercent).toBe(50)
    expect(resolved.surplusInvestmentsPercent).toBe(70)
  })

  it('should accept a current-shape document that still carries the retired investmentBuckets field', () => {
    const stored = {
      payday1Split: {
        essentialsPercent: 55,
        educationPercent: 10,
        leisurePercent: 10,
        investmentsPercent: 25,
        companyCashPercent: 0,
      },
      investmentBuckets: [{ id: 'x', name: 'Casa', percentOfInvestments: 100, allocationModel: 'AGGRESSIVE' }],
    } as unknown as Distribution

    const resolved = resolveStoredDistribution(stored, context)
    expect(resolved.payday1Split.investmentsPercent).toBe(25)
    expect(resolved.surplusInvestmentsPercent).toBeUndefined()
  })

  it('should fall back to the default when the document is missing, with the surplus decision pending', () => {
    const resolved = resolveStoredDistribution(null, context)
    expect(resolved.payday1Split.essentialsPercent).toBe(55)
    expect(resolved.payday2Split).toBeUndefined()
    expect(resolved.surplusInvestmentsPercent).toBeUndefined()
  })

  it('should create the second payday split in the default when the user has two paydays', () => {
    const resolved = resolveStoredDistribution(null, { hasSecondPayday: true })
    expect(resolved.payday2Split).toBeDefined()
    expect(resolved.payday1IncomeSharePercent).toBe(50)
  })

  it('should fall back to the default for an old M2 (3-category) or M5 (flat) document', () => {
    const m2Doc = { essentialsPercent: 50, freedomPercent: 30, investmentsPercent: 20 } as unknown as Distribution
    const m5Doc = {
      essentialsPercent: 55,
      educationPercent: 10,
      leisurePercent: 10,
      investmentsPercent: 25,
      allocationModel: 'CONSERVATIVE',
    } as unknown as Distribution

    expect(resolveStoredDistribution(m2Doc, context).payday1Split.essentialsPercent).toBe(55)
    expect(resolveStoredDistribution(m5Doc, context).payday1Split.essentialsPercent).toBe(55)
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

// M5.8: Destino do saldo das essenciais
describe('calculateMonthlyFlow', () => {
  // Renda R$ 5.781 com o split padrão 55/10/10/25: orçado de essenciais R$ 3.179,55,
  // fatia de Investimentos R$ 1.445,25, lazer R$ 578,10. Lista de essenciais real = R$ 1.746
  // ⇒ saldo R$ 1.433,55.
  const persona: DistributionAmounts = calculateDistributionAmounts(
    [
      {
        split: {
          essentialsPercent: 55,
          educationPercent: 10,
          leisurePercent: 10,
          investmentsPercent: 25,
          companyCashPercent: 0,
        },
        incomeShareFraction: 1,
      },
    ],
    5781
  )
  const base = { amounts: persona, essentialsReal: 1746, hasEssentialsList: true }

  it('should compute the surplus as budget minus real spending', () => {
    const flow = calculateMonthlyFlow(base)
    expect(flow.balance).toBeCloseTo(1433.55, 2)
    expect(flow.surplus).toBeCloseTo(1433.55, 2)
    expect(flow.deficit).toBe(0)
  })

  it('should route nothing while the decision is pending, and flag it', () => {
    const flow = calculateMonthlyFlow({ ...base, surplusInvestmentsPercent: undefined })
    expect(flow.surplusPending).toBe(true)
    expect(flow.surplusToInvestments).toBe(0)
    expect(flow.surplusToLeisure).toBe(0)
    expect(flow.investmentsPlan).toBeCloseTo(1445.25, 2)
    expect(flow.leisureTotal).toBeCloseTo(578.1, 2)
  })

  it('should send the whole surplus to investments when the rule is 100%', () => {
    const flow = calculateMonthlyFlow({ ...base, surplusInvestmentsPercent: 100 })
    expect(flow.surplusPending).toBe(false)
    expect(flow.investmentsPlan).toBeCloseTo(2878.8, 2)
    expect(flow.leisureTotal).toBeCloseTo(578.1, 2)
  })

  it('should send the whole surplus to leisure when the rule is 0%', () => {
    const flow = calculateMonthlyFlow({ ...base, surplusInvestmentsPercent: 0 })
    expect(flow.investmentsPlan).toBeCloseTo(1445.25, 2)
    expect(flow.leisureTotal).toBeCloseTo(2011.65, 2)
  })

  it('should split the surplus 70/30 and never lose or create money', () => {
    const flow = calculateMonthlyFlow({ ...base, surplusInvestmentsPercent: 70 })
    expect(flow.surplusToInvestments).toBeCloseTo(1003.485, 1)
    expect(flow.surplusToInvestments + flow.surplusToLeisure).toBeCloseTo(flow.surplus, 8)
    expect(flow.investmentsPlan).toBeCloseTo(1445.25 + flow.surplusToInvestments, 8)
  })

  it('should have no surplus without a detailed list (real = 0 would fake the whole budget as surplus)', () => {
    const flow = calculateMonthlyFlow({
      amounts: persona,
      essentialsReal: 0,
      hasEssentialsList: false,
      surplusInvestmentsPercent: 100,
    })
    expect(flow.balance).toBe(0)
    expect(flow.surplus).toBe(0)
    expect(flow.surplusPending).toBe(false)
    expect(flow.investmentsPlan).toBeCloseTo(1445.25, 2)
  })

  it('should route nothing when real spending exceeds the budget, even with a saved rule', () => {
    const flow = calculateMonthlyFlow({ ...base, essentialsReal: 3500, surplusInvestmentsPercent: 100 })
    expect(flow.surplus).toBe(0)
    expect(flow.deficit).toBeCloseTo(320.45, 2)
    expect(flow.surplusPending).toBe(false)
    expect(flow.investmentsPlan).toBeCloseTo(1445.25, 2)
  })

  it('should treat real spending equal to the budget as no surplus and no deficit', () => {
    const flow = calculateMonthlyFlow({ ...base, essentialsReal: persona.essentials })
    expect(flow.balance).toBe(0)
    expect(flow.surplusPending).toBe(false)
  })

  it('should ignore floating-point residue below one cent (3179.5500000000002 vs 3179.55)', () => {
    const flow = calculateMonthlyFlow({
      amounts: { ...persona, essentials: 3179.5500000000002 },
      essentialsReal: 3179.55,
      hasEssentialsList: true,
      surplusInvestmentsPercent: undefined,
    })
    expect(flow.balance).toBe(0)
    expect(flow.surplusPending).toBe(false)
  })

  it('should not produce NaN or Infinity with zero income', () => {
    const zero = calculateDistributionAmounts(
      [{ split: { essentialsPercent: 55, educationPercent: 10, leisurePercent: 10, investmentsPercent: 25, companyCashPercent: 0 }, incomeShareFraction: 1 }],
      0
    )
    const flow = calculateMonthlyFlow({ amounts: zero, essentialsReal: 100, hasEssentialsList: true, surplusInvestmentsPercent: 50 })
    const numbers = Object.values(flow).filter((value): value is number => typeof value === 'number')
    expect(numbers.every(Number.isFinite)).toBe(true)
    expect(flow.deficit).toBe(100)
  })
})

describe('validateSurplusPercent', () => {
  it('should accept 0, 100 and values in between', () => {
    expect(validateSurplusPercent(0)).toBeUndefined()
    expect(validateSurplusPercent(70)).toBeUndefined()
    expect(validateSurplusPercent(100)).toBeUndefined()
  })

  it('should reject negatives, values above 100 and non-finite numbers', () => {
    expect(validateSurplusPercent(-1)).toBeDefined()
    expect(validateSurplusPercent(100.5)).toBeDefined()
    expect(validateSurplusPercent(NaN)).toBeDefined()
    expect(validateSurplusPercent(Infinity)).toBeDefined()
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

describe('valores reais por pagamento (% com muitas casas decimais)', () => {
  it('R$ 3.315,00 + R$ 2.466,66 voltam exatos após % → R$, sem arredondar o %', () => {
    const share = shareFromAmounts(3315, 2466.66)
    const back = splitIncomeByShare(3315 + 2466.66, share)

    expect(share).not.toBe(Math.round(share * 10) / 10)
    expect(Math.abs(back.payday1Amount - 3315)).toBeLessThan(0.01)
    expect(Math.abs(back.payday2Amount - 2466.66)).toBeLessThan(0.01)
  })
})
