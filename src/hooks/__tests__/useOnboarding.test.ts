import { describe, it, expect } from 'vitest'
import {
  firstInvalidStep,
  isOnboardingDirty,
  resolveCurrentPatrimony,
  validateAll,
  validateStep,
  type OnboardingData,
} from '../useOnboarding'

const valid: OnboardingData = {
  name: 'Rafael',
  goalAmount: 20_000_000,
  goalYears: 25,
  riskProfile: 'moderate',
  currentPatrimony: 41_291,
  monthlyIncomeNet: 5781,
  essentialMonthlyCost: 3179.55,
  payday1: 5,
  payday2: 20,
  darkMode: false,
}

describe('validateStep', () => {
  it('dados válidos não geram erro em nenhum passo', () => {
    for (let step = 1; step <= 5; step++) {
      expect(validateStep(step, valid)).toEqual({})
    }
  })

  it('passo 1: nome vazio, meta <= 0 e prazo fora de 1–100', () => {
    expect(validateStep(1, { ...valid, name: '   ' }).name).toBeDefined()
    expect(validateStep(1, { ...valid, goalAmount: 0 }).goalAmount).toBeDefined()
    expect(validateStep(1, { ...valid, goalYears: 0 }).goalYears).toBeDefined()
    expect(validateStep(1, { ...valid, goalYears: 101 }).goalYears).toBeDefined()
    expect(validateStep(1, { ...valid, goalYears: 100 }).goalYears).toBeUndefined()
  })

  it('passo 2: patrimônio negativo é erro; zero é aceito', () => {
    expect(validateStep(2, { ...valid, currentPatrimony: -1 }).currentPatrimony).toBeDefined()
    expect(validateStep(2, { ...valid, currentPatrimony: 0 }).currentPatrimony).toBeUndefined()
  })

  it('passo 3: renda > 0 e custo essencial entre 0 e a renda', () => {
    expect(validateStep(3, { ...valid, monthlyIncomeNet: 0 }).monthlyIncomeNet).toBeDefined()
    expect(validateStep(3, { ...valid, essentialMonthlyCost: -1 }).essentialMonthlyCost).toBeDefined()
    expect(validateStep(3, { ...valid, essentialMonthlyCost: 6000 }).essentialMonthlyCost).toBeDefined()
    expect(validateStep(3, { ...valid, essentialMonthlyCost: 5781 }).essentialMonthlyCost).toBeUndefined()
  })

  it('passo 4: dias entre 1 e 31, 2º dia opcional e diferente do 1º', () => {
    expect(validateStep(4, { ...valid, payday1: 0 }).payday1).toBeDefined()
    expect(validateStep(4, { ...valid, payday1: 32 }).payday1).toBeDefined()
    expect(validateStep(4, { ...valid, payday2: null })).toEqual({})
    expect(validateStep(4, { ...valid, payday2: 32 }).payday2).toBeDefined()
    expect(validateStep(4, { ...valid, payday2: 5 }).payday2).toBeDefined()
  })
})

describe('validateAll / firstInvalidStep', () => {
  it('dados válidos: sem erros e nenhum passo inválido', () => {
    expect(validateAll(valid)).toEqual({})
    expect(firstInvalidStep(valid)).toBeNull()
  })

  it('junta os erros de vários passos', () => {
    const errors = validateAll({ ...valid, goalAmount: 0, monthlyIncomeNet: 0 })

    expect(errors.goalAmount).toBeDefined()
    expect(errors.monthlyIncomeNet).toBeDefined()
  })

  it('aponta o menor passo com erro', () => {
    expect(firstInvalidStep({ ...valid, payday1: 0, essentialMonthlyCost: -1 })).toBe(3)
    expect(firstInvalidStep({ ...valid, name: '', payday1: 0 })).toBe(1)
    expect(firstInvalidStep({ ...valid, payday1: 0 })).toBe(4)
  })
})

describe('isOnboardingDirty', () => {
  it('cópia idêntica não é alteração', () => {
    expect(isOnboardingDirty(valid, { ...valid })).toBe(false)
  })

  it('detecta mudança em qualquer campo editável', () => {
    expect(isOnboardingDirty(valid, { ...valid, goalAmount: 5_000_000 })).toBe(true)
    expect(isOnboardingDirty(valid, { ...valid, name: 'Outro' })).toBe(true)
    expect(isOnboardingDirty(valid, { ...valid, riskProfile: 'aggressive' })).toBe(true)
    expect(isOnboardingDirty(valid, { ...valid, payday1: 6 })).toBe(true)
  })

  it('2º dia de pagamento: null ↔ número conta como alteração', () => {
    const single = { ...valid, payday2: null }

    expect(isOnboardingDirty(single, { ...single, payday2: 15 })).toBe(true)
    expect(isOnboardingDirty(valid, { ...valid, payday2: null })).toBe(true)
  })

  it('darkMode não é editável aqui, então não conta', () => {
    expect(isOnboardingDirty(valid, { ...valid, darkMode: true })).toBe(false)
  })
})

describe('resolveCurrentPatrimony', () => {
  it('com ativos no Portfólio usa o total deles (igual ao card do Radar), não o valor digitado no onboarding', () => {
    expect(resolveCurrentPatrimony(0, 3, 41_291)).toBe(41_291)
    expect(resolveCurrentPatrimony(10_000, 1, 25_000)).toBe(25_000)
  })

  it('sem ativos mantém o valor do onboarding (estimativa do Radar)', () => {
    expect(resolveCurrentPatrimony(10_000, 0, 0)).toBe(10_000)
  })

  it('arredonda a centavos (soma de ativos em ponto flutuante)', () => {
    expect(resolveCurrentPatrimony(0, 2, 0.1 + 0.2)).toBe(0.3)
    expect(resolveCurrentPatrimony(0, 2, 1234.5678)).toBe(1234.57)
  })

  it('ativos que somam zero (ex.: consórcio recém-contratado) valem zero, como no Radar', () => {
    expect(resolveCurrentPatrimony(41_291, 1, 0)).toBe(0)
  })
})
