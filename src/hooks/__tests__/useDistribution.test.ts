import { describe, it, expect } from 'vitest'
import {
  validateNivelUm,
  validateCustomAllocation,
  calculateDistributionAmounts,
  resolveAllocationModel,
  type NivelUmInput,
} from '../useDistribution'
import { ALLOCATION_MODELS } from '../../core/allocationModels'
import type { CustomAllocation } from '../../types/distribution'

describe('validateNivelUm', () => {
  const valid: NivelUmInput = {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
  }

  it('should pass when the sum is exactly 100', () => {
    expect(Object.keys(validateNivelUm(valid)).length).toBe(0)
  })

  it('should error with the exact shortfall when the sum is 95', () => {
    const input = { ...valid, investmentsPercent: 20 }
    const errors = validateNivelUm(input)
    expect(errors.total).toContain('5.0%')
  })

  it('should error with the exact excess when the sum is 105', () => {
    const input = { ...valid, investmentsPercent: 30 }
    const errors = validateNivelUm(input)
    expect(errors.total).toContain('5.0%')
  })

  it('should tolerate floating-point rounding (33.33 + 33.33 + 33.34 + 0)', () => {
    const input: NivelUmInput = {
      essentialsPercent: 33.33,
      educationPercent: 33.33,
      leisurePercent: 33.34,
      investmentsPercent: 0,
    }
    expect(validateNivelUm(input).total).toBeUndefined()
  })

  it('should error when a field is negative or above 100', () => {
    expect(validateNivelUm({ ...valid, essentialsPercent: -5 }).essentialsPercent).toBeDefined()
    expect(validateNivelUm({ ...valid, essentialsPercent: 105 }).essentialsPercent).toBeDefined()
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
  const nivelUm: NivelUmInput = {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
  }

  it('should split monthlyIncomeNet according to each percentage', () => {
    const amounts = calculateDistributionAmounts(nivelUm, 4000)
    expect(amounts.essentials).toBeCloseTo(2200, 5)
    expect(amounts.education).toBeCloseTo(400, 5)
    expect(amounts.leisure).toBeCloseTo(400, 5)
    expect(amounts.investments).toBeCloseTo(1000, 5)
  })

  it('should not produce NaN when monthlyIncomeNet is 0', () => {
    const amounts = calculateDistributionAmounts(nivelUm, 0)
    expect(amounts.essentials).toBe(0)
    expect(amounts.investments).toBe(0)
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
