import { describe, it, expect } from 'vitest'
import {
  calculateAdherence,
  calculateGuidedContribution,
  deriveCheckinStatus,
  splitPlanAcrossDays,
} from '../checkin'

describe('deriveCheckinStatus', () => {
  it('tolerância de R$ 1: diferença de centavos continua "como programado"', () => {
    expect(deriveCheckinStatus(1000, 1000)).toBe('on_plan')
    expect(deriveCheckinStatus(1000, 999.5)).toBe('on_plan')
    expect(deriveCheckinStatus(1000, 1000.9)).toBe('on_plan')
  })

  it('exatamente R$ 1 de diferença já sai da tolerância', () => {
    expect(deriveCheckinStatus(1000, 999)).toBe('below')
    expect(deriveCheckinStatus(1000, 1001)).toBe('above')
  })

  it('investiu menos e investiu mais', () => {
    expect(deriveCheckinStatus(2878.8, 1500)).toBe('below')
    expect(deriveCheckinStatus(2878.8, 3500)).toBe('above')
  })

  it('zero investido de um plano zero é "como programado"', () => {
    expect(deriveCheckinStatus(0, 0)).toBe('on_plan')
  })
})

describe('calculateAdherence', () => {
  const answered = (planned: number, invested: number) => ({
    plannedTotal: planned,
    investedTotal: invested,
    status: 'on_plan' as const,
  })

  it('sem histórico = 100%', () => {
    expect(calculateAdherence([])).toBe(1)
  })

  it('um mês só: investido ÷ programado', () => {
    expect(calculateAdherence([answered(1000, 800)])).toBeCloseTo(0.8, 10)
  })

  it('usa só os 3 check-ins mais recentes', () => {
    // mais recentes primeiro: 100%, 100%, 100% — o mês antigo (0%) não entra
    const history = [answered(1000, 1000), answered(1000, 1000), answered(1000, 1000), answered(1000, 0)]
    expect(calculateAdherence(history)).toBeCloseTo(1, 10)
  })

  it('"Não investi" (0 investido) conta como 0% no cálculo', () => {
    const history = [answered(1000, 0), answered(1000, 1000)]
    expect(calculateAdherence(history)).toBeCloseTo(0.5, 10)
  })

  it('limita a 150%', () => {
    expect(calculateAdherence([answered(1000, 5000)])).toBe(1.5)
  })

  it('planejado zero não entra na média', () => {
    expect(calculateAdherence([answered(0, 0), answered(1000, 500)])).toBeCloseTo(0.5, 10)
  })
})

describe('splitPlanAcrossDays', () => {
  it('um dia recebe o plano inteiro', () => {
    expect(splitPlanAcrossDays(2878.8, 1, null)).toEqual([2878.8])
  })

  it('dois dias seguem a renda de cada pagamento', () => {
    // 61,2% no 1º: 2.878,80 × 61,2% = 1.761,83 (arredondado a centavos) e o resto
    const [first, second] = splitPlanAcrossDays(2878.8, 2, 61.2)
    expect(first).toBeCloseTo(1761.83, 2)
    expect(first! + second!).toBeCloseTo(2878.8, 2)
  })

  it('dois dias sem 2º pagamento dividem 50/50', () => {
    expect(splitPlanAcrossDays(1000, 2, null)).toEqual([500, 500])
  })

  it('a soma fecha exata em centavos mesmo com dízima', () => {
    const parts = splitPlanAcrossDays(1000, 2, 33.33)
    expect(parts.reduce((sum, v) => sum + v, 0)).toBeCloseTo(1000, 10)
  })
})

describe('calculateGuidedContribution', () => {
  const target = { stocks: 0.3, bonds: 0.4, alternatives: 0.2, cash: 0.1 }

  it('a soma das sugestões é exatamente o aporte e nunca é negativa', () => {
    const suggestion = calculateGuidedContribution(
      { stocks: 9000, bonds: 1000, alternatives: 0, cash: 0 },
      target,
      1000
    )
    const values = Object.values(suggestion)
    expect(values.every((v) => v >= 0)).toBe(true)
    expect(values.reduce((sum, v) => sum + v, 0)).toBeCloseTo(1000, 2)
  })

  it('direciona para as classes mais abaixo da meta', () => {
    // total = 10.000 + 1.000 = 11.000; alvo renda fixa = 4.400; já tem 1.000 → falta 3.400 (é o que mais falta)
    const suggestion = calculateGuidedContribution(
      { stocks: 9000, bonds: 1000, alternatives: 0, cash: 0 },
      target,
      1000
    )
    expect(suggestion.bonds).toBeGreaterThan(suggestion.stocks)
    expect(suggestion.stocks).toBe(0)
  })

  it('carteira vazia segue a composição-alvo', () => {
    const suggestion = calculateGuidedContribution(
      { stocks: 0, bonds: 0, alternatives: 0, cash: 0 },
      target,
      1000
    )
    expect(suggestion.stocks).toBeCloseTo(300, 2)
    expect(suggestion.bonds).toBeCloseTo(400, 2)
  })

  it('aporte zero = tudo zero', () => {
    expect(calculateGuidedContribution({ stocks: 1, bonds: 1, alternatives: 1, cash: 1 }, target, 0)).toEqual({
      stocks: 0,
      bonds: 0,
      alternatives: 0,
      cash: 0,
    })
  })
})
