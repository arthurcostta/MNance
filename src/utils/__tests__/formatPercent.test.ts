import { describe, it, expect } from 'vitest'
import { formatPercent } from '../formatPercent'

describe('formatPercent', () => {
  it('usa vírgula decimal e uma casa por padrão', () => {
    expect(formatPercent(12.1)).toBe('12,1%')
    expect(formatPercent(11.8)).toBe('11,8%')
  })

  it('completa casas decimais (inteiro vira 100,0%)', () => {
    expect(formatPercent(100)).toBe('100,0%')
    expect(formatPercent(0)).toBe('0,0%')
  })

  it('respeita o número de casas pedido', () => {
    expect(formatPercent(11.1667, 2)).toBe('11,17%')
    expect(formatPercent(9.8, 0)).toBe('10%')
  })

  it('separa milhar no padrão brasileiro', () => {
    expect(formatPercent(1234.5)).toBe('1.234,5%')
  })

  it('aceita negativo (taxa real abaixo de zero)', () => {
    expect(formatPercent(-4.3)).toBe('-4,3%')
  })
})
