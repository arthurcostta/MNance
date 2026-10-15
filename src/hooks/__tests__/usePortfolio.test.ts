import { describe, it, expect } from 'vitest'
import { calculateCommittedContribution, validateAssetForm, type AssetFormInput } from '../usePortfolio'

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

  // M5.8 Fase 2: aporte mensal programado (consórcio, CDB programado...).
  describe('aporte programado', () => {
    const consorcio: AssetFormInput = {
      ...validInput,
      name: 'Consórcio',
      currentValue: 0,
      expectedReturnRatePercent: 0,
      instrumentKey: 'CONSORCIO',
      monthlyContribution: 1500,
      remainingInstallments: 60,
    }

    it('aceita saldo 0 quando há aporte programado (ativo recém-contratado)', () => {
      expect(validateAssetForm(consorcio, 'add')).toEqual({})
    })

    it('continua exigindo saldo > 0 sem aporte programado', () => {
      const errors = validateAssetForm({ ...consorcio, monthlyContribution: 0, remainingInstallments: null }, 'add')
      expect(errors.currentValue).toBeDefined()
    })

    it('saldo negativo é erro mesmo com aporte', () => {
      expect(validateAssetForm({ ...consorcio, currentValue: -1 }, 'add').currentValue).toBeDefined()
    })

    it('aporte negativo ou NaN é erro', () => {
      expect(validateAssetForm({ ...consorcio, monthlyContribution: -10 }, 'add').monthlyContribution).toBeDefined()
      expect(validateAssetForm({ ...consorcio, monthlyContribution: NaN }, 'add').monthlyContribution).toBeDefined()
    })

    it('parcelas precisam ser um inteiro entre 1 e 600', () => {
      expect(validateAssetForm({ ...consorcio, remainingInstallments: 0 }, 'add').remainingInstallments).toBeDefined()
      expect(validateAssetForm({ ...consorcio, remainingInstallments: 1.5 }, 'add').remainingInstallments).toBeDefined()
      expect(validateAssetForm({ ...consorcio, remainingInstallments: 601 }, 'add').remainingInstallments).toBeDefined()
      expect(validateAssetForm({ ...consorcio, remainingInstallments: NaN }, 'add').remainingInstallments).toBeDefined()
      expect(validateAssetForm({ ...consorcio, remainingInstallments: 1 }, 'add').remainingInstallments).toBeUndefined()
      expect(validateAssetForm({ ...consorcio, remainingInstallments: 600 }, 'add').remainingInstallments).toBeUndefined()
    })

    it('sem prazo (null) é válido; parcelas sem aporte é erro', () => {
      expect(validateAssetForm({ ...consorcio, remainingInstallments: null }, 'add')).toEqual({})
      expect(
        validateAssetForm({ ...validInput, monthlyContribution: 0, remainingInstallments: 12 }, 'add').remainingInstallments
      ).toBeDefined()
    })
  })

  describe('calculateCommittedContribution', () => {
    const today = { year: 2026, month: 10 }

    it('soma só os aportes ativos hoje', () => {
      const total = calculateCommittedContribution(
        [
          { monthlyContribution: 1500, contributionEndsAt: '2031-09' },
          { monthlyContribution: 300 }, // sem prazo
          { monthlyContribution: 500, contributionEndsAt: '2026-09' }, // encerrado
          { monthlyContribution: 0, contributionEndsAt: '2030-01' },
          {},
        ],
        today
      )
      expect(total).toBe(1800)
    })

    it('lista vazia = 0', () => {
      expect(calculateCommittedContribution([], today)).toBe(0)
    })
  })
})
