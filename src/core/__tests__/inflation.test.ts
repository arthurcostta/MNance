import { describe, it, expect } from 'vitest'
import { toRealRate, inflationFactor, DEFAULT_INFLATION_RATE } from '../inflation'

describe('inflation', () => {
  describe('toRealRate', () => {
    it('com inflação 0%, taxa real = taxa nominal', () => {
      expect(toRealRate(0.115, 0)).toBeCloseTo(0.115, 10)
      expect(toRealRate(0.08, 0)).toBeCloseTo(0.08, 10)
      expect(toRealRate(0, 0)).toBeCloseTo(0, 10)
    })

    it('11,5% nominal com 4,5% inflação ≈ 6,70% real', () => {
      // 1,115 / 1,045 − 1 = 0,066986 (não 0,067: a conta é exata, sem arredondar)
      expect(toRealRate(0.115, 0.045)).toBeCloseTo(0.066986, 5)
    })

    it('0% nominal com 4,5% inflação ≈ -4,31% real (perde poder de compra)', () => {
      // 1 / 1,045 − 1 = −0,043062
      expect(toRealRate(0, 0.045)).toBeCloseTo(-0.043062, 5)
    })

    it('retorno nominal igual à inflação = taxa real zero', () => {
      expect(toRealRate(0.045, 0.045)).toBeCloseTo(0, 12)
    })

    it('default inflation 4,5%', () => {
      expect(DEFAULT_INFLATION_RATE).toBe(0.045)
    })
  })

  describe('inflationFactor', () => {
    it('inflação 0% → fator 1 (sem erosão)', () => {
      expect(inflationFactor(0, 10)).toBeCloseTo(1, 10)
    })

    it('4,5% a.a. por 10 anos ≈ 0,644 (R$ 1 vale ≈ R$ 0,64)', () => {
      // 1,045^-10 = 1 / 1,552969 = 0,643928
      expect(inflationFactor(0.045, 10)).toBeCloseTo(0.643928, 5)
    })

    it('10% a.a. por 1 ano = 0,909', () => {
      expect(inflationFactor(0.1, 1)).toBeCloseTo(0.909, 3)
    })

    it('é o inverso do crescimento dos preços', () => {
      expect(inflationFactor(0.045, 25) * Math.pow(1.045, 25)).toBeCloseTo(1, 12)
    })
  })
})
