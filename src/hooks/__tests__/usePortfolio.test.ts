import { describe, it, expect } from 'vitest'
import { validateAssetForm, type AssetFormInput } from '../usePortfolio'

describe('validateAssetForm', () => {
  const validInput: AssetFormInput = {
    name: 'Tesouro Selic',
    assetClass: 'bonds',
    currentValue: 1000,
    expectedReturnRatePercent: 11.5,
    instrumentKey: 'TESOURO_SELIC',
  }

  describe('name validation', () => {
    it('should error if name is empty', () => {
      const input = { ...validInput, name: '' }
      const errors = validateAssetForm(input, 'add')
      expect(errors.name).toBeDefined()
    })

    it('should error if name is only whitespace', () => {
      const input = { ...validInput, name: '   ' }
      const errors = validateAssetForm(input, 'add')
      expect(errors.name).toBeDefined()
    })

    it('should pass with non-empty name', () => {
      const input = { ...validInput, name: 'My Asset' }
      const errors = validateAssetForm(input, 'add')
      expect(errors.name).toBeUndefined()
    })
  })

  describe('currentValue validation', () => {
    it('should error if currentValue is zero', () => {
      const input = { ...validInput, currentValue: 0 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.currentValue).toBeDefined()
    })

    it('should error if currentValue is negative', () => {
      const input = { ...validInput, currentValue: -100 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.currentValue).toBeDefined()
    })

    it('should pass with positive currentValue', () => {
      const input = { ...validInput, currentValue: 100 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.currentValue).toBeUndefined()
    })
  })

  describe('expectedReturnRatePercent validation', () => {
    it('should error if rate is NaN', () => {
      const input = { ...validInput, expectedReturnRatePercent: NaN }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeDefined()
    })

    it('should error if rate is Infinity', () => {
      const input = { ...validInput, expectedReturnRatePercent: Infinity }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeDefined()
    })

    it('should error if rate is negative', () => {
      const input = { ...validInput, expectedReturnRatePercent: -5 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeDefined()
    })

    it('should error if rate exceeds 200%', () => {
      const input = { ...validInput, expectedReturnRatePercent: 201 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeDefined()
    })

    it('should pass with rate in [0, 200]', () => {
      const input = { ...validInput, expectedReturnRatePercent: 45 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeUndefined()
    })

    it('should pass with rate at boundary 0%', () => {
      const input = { ...validInput, expectedReturnRatePercent: 0 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeUndefined()
    })

    it('should pass with rate at boundary 200%', () => {
      const input = { ...validInput, expectedReturnRatePercent: 200 }
      const errors = validateAssetForm(input, 'add')
      expect(errors.expectedReturnRatePercent).toBeUndefined()
    })
  })

  describe('instrumentKey validation', () => {
    it('should error if instrumentKey is missing in add mode', () => {
      const input = { ...validInput, instrumentKey: undefined }
      const errors = validateAssetForm(input, 'add')
      expect(errors.instrumentKey).toBeDefined()
    })

    it('should error if instrumentKey is missing in seed mode', () => {
      const input = { ...validInput, instrumentKey: undefined }
      const errors = validateAssetForm(input, 'seed')
      expect(errors.instrumentKey).toBeDefined()
    })

    it('should not require instrumentKey in edit mode', () => {
      const input = { ...validInput, instrumentKey: undefined }
      const errors = validateAssetForm(input, 'edit')
      expect(errors.instrumentKey).toBeUndefined()
    })

    it('should pass with instrumentKey in add mode', () => {
      const input = { ...validInput, instrumentKey: 'TESOURO_SELIC' }
      const errors = validateAssetForm(input, 'add')
      expect(errors.instrumentKey).toBeUndefined()
    })
  })

  describe('combined validation', () => {
    it('should return multiple errors when multiple fields are invalid', () => {
      const input: AssetFormInput = {
        name: '',
        assetClass: 'bonds',
        currentValue: -50,
        expectedReturnRatePercent: 300,
        instrumentKey: undefined,
      }
      const errors = validateAssetForm(input, 'add')
      expect(Object.keys(errors).length).toBeGreaterThan(1)
      expect(errors.name).toBeDefined()
      expect(errors.currentValue).toBeDefined()
      expect(errors.expectedReturnRatePercent).toBeDefined()
      expect(errors.instrumentKey).toBeDefined()
    })

    it('should pass validation with all valid fields', () => {
      const errors = validateAssetForm(validInput, 'add')
      expect(Object.keys(errors).length).toBe(0)
    })
  })
})
