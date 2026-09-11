import { describe, expect, it } from 'vitest'
import { ASSET_RETURN_RATES } from '../assetReturnRates'

const VALID_ASSET_CLASSES = ['stocks', 'bonds', 'alternatives', 'cash']

describe('ASSET_RETURN_RATES', () => {
  it.each(Object.entries(ASSET_RETURN_RATES))(
    '%s: taxa é uma fração válida entre 0 e 1, com assetClass reconhecida',
    (_key, rate) => {
      expect(rate.annualRate).toBeGreaterThanOrEqual(0)
      expect(rate.annualRate).toBeLessThanOrEqual(1)
      expect(VALID_ASSET_CLASSES).toContain(rate.assetClass)
    },
  )

  it('taxas batem com a tabela do PRD §4.2', () => {
    expect(ASSET_RETURN_RATES.TESOURO_SELIC.annualRate).toBeCloseTo(0.115, 10)
    expect(ASSET_RETURN_RATES.CDB_LCI_LCA.annualRate).toBeCloseTo(0.11, 10)
    expect(ASSET_RETURN_RATES.ACOES_IBOVESPA.annualRate).toBeCloseTo(0.08, 10)
    expect(ASSET_RETURN_RATES.ETF_INTERNACIONAL.annualRate).toBeCloseTo(0.105, 10)
    expect(ASSET_RETURN_RATES.FII.annualRate).toBeCloseTo(0.105, 10)
    expect(ASSET_RETURN_RATES.BITCOIN.annualRate).toBeCloseTo(0.45, 10)
    expect(ASSET_RETURN_RATES.PREVIDENCIA.annualRate).toBeCloseTo(0.06, 10)
    expect(ASSET_RETURN_RATES.CAIXA.annualRate).toBe(0)
  })
})
