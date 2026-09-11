import { describe, expect, it } from 'vitest'
import { calculateWeightedReturn } from '../weightedReturn'

describe('calculateWeightedReturn', () => {
  it('lista vazia: retorna 0, sem NaN/Infinity', () => {
    expect(calculateWeightedReturn([])).toBe(0)
  })

  it('soma dos valores é zero: retorna 0, sem divisão por zero', () => {
    const result = calculateWeightedReturn([
      { amount: 0, expectedReturnRate: 0.1 },
      { amount: 0, expectedReturnRate: 0.2 },
    ])

    expect(result).toBe(0)
  })

  it('ativo único: retorno ponderado é a própria taxa do ativo', () => {
    const result = calculateWeightedReturn([{ amount: 15000, expectedReturnRate: 0.115 }])

    expect(result).toBeCloseTo(0.115, 10)
  })

  it('caso normal verificável à mão: 60% a 10% + 40% a 5% = 8%', () => {
    const result = calculateWeightedReturn([
      { amount: 6000, expectedReturnRate: 0.1 },
      { amount: 4000, expectedReturnRate: 0.05 },
    ])

    expect(result).toBeCloseTo(0.08, 10)
  })

  it('tolerância de ponto flutuante com divisões não exatas (CENÁRIO 38)', () => {
    const result = calculateWeightedReturn([
      { amount: 1000, expectedReturnRate: 0.115 },
      { amount: 1000, expectedReturnRate: 0.11 },
      { amount: 1000, expectedReturnRate: 0.08 },
    ])

    // Média simples de 3 partes iguais — soma exata em ponto flutuante pode divergir
    // na última casa, por isso toBeCloseTo em vez de comparação estrita.
    expect(result).toBeCloseTo((0.115 + 0.11 + 0.08) / 3, 10)
  })
})
