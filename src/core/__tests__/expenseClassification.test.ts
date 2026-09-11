import { describe, expect, it } from 'vitest'
import { classifyExpense } from '../expenseClassification'

describe('classifyExpense', () => {
  it.each([
    ['housing', 'essential'],
    ['food', 'essential'],
    ['transport', 'essential'],
    ['utilities', 'essential'],
    ['health_basic', 'essential'],
    ['education', 'quality'],
    ['fitness', 'quality'],
    ['courses', 'quality'],
    ['health_dev', 'quality'],
    ['entertainment', 'discussible'],
    ['leisure', 'discussible'],
    ['subscriptions_misc', 'discussible'],
  ] as const)('categoria "%s" classifica como "%s"', (category, expected) => {
    expect(classifyExpense({ category, isZombie: false })).toBe(expected)
  })

  it('categoria desconhecida cai no fallback seguro "discussible"', () => {
    expect(classifyExpense({ category: 'categoria_nunca_vista', isZombie: false })).toBe(
      'discussible',
    )
  })

  it('zumbi vence a categoria (mesmo uma essencial)', () => {
    expect(classifyExpense({ category: 'housing', isZombie: true })).toBe('misaligned')
  })

  it('override do usuário vence o zumbi (CENÁRIO 53)', () => {
    expect(
      classifyExpense({ category: 'housing', isZombie: true, userOverride: 'essential' }),
    ).toBe('essential')
  })

  it('override do usuário vence a categoria mesmo sem zumbi (CENÁRIO 53)', () => {
    expect(
      classifyExpense({
        category: 'entertainment',
        isZombie: false,
        userOverride: 'quality',
      }),
    ).toBe('quality')
  })
})
