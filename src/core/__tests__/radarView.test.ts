import { describe, it, expect } from 'vitest'
import { leverDelta, leverResultText, niceAxis, progressPercent, sharePercentLabel, timelineMarkers } from '../radarView'
import { formatYears, formatYearsShort } from '../../utils/formatYears'
import { formatCompactBRL } from '../../utils/formatCurrency'

describe('timelineMarkers', () => {
  it('meta dentro do prazo: o marco da meta fica antes do prazo', () => {
    const m = timelineMarkers({ goalYears: 30, baseYears: 22, optimisticYears: 20, conservativeYears: 25, horizonYears: 60 })
    expect(m.base!).toBeLessThan(m.deadline)
    expect(m.band).toEqual({ start: m.optimistic, end: m.conservative })
  })

  it('meta fora do prazo: o marco da meta fica depois do prazo', () => {
    const m = timelineMarkers({ goalYears: 25, baseYears: 55, optimisticYears: 41, conservativeYears: 58, horizonYears: 60 })
    expect(m.base!).toBeGreaterThan(m.deadline)
    expect(m.base!).toBeLessThanOrEqual(100)
  })

  it('meta inalcançável: sem marco da meta, a escala cobre o prazo e o horizonte', () => {
    const m = timelineMarkers({ goalYears: 30, baseYears: null, optimisticYears: null, conservativeYears: null, horizonYears: 60 })
    expect(m.base).toBeNull()
    expect(m.band).toBeNull()
    expect(m.scaleYears).toBeGreaterThanOrEqual(30)
    expect(m.deadline).toBeGreaterThan(0)
    expect(m.deadline).toBeLessThanOrEqual(100)
  })

  it('posições ficam entre 0 e 100 mesmo com valores fora da escala', () => {
    const m = timelineMarkers({ goalYears: 10, baseYears: 500, optimisticYears: 1, conservativeYears: 500, horizonYears: 60 })
    for (const v of [m.deadline, m.base, m.optimistic, m.conservative]) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('leverDelta', () => {
  it('alavanca que encurta o prazo devolve quantos anos economiza', () => {
    const d = leverDelta({ years: 55.5, valueAtDeadline: 1 }, { years: 52.8, valueAtDeadline: 2 })
    expect(d.kind).toBe('faster')
    expect(d.deltaYears).toBeCloseTo(2.7, 6)
  })

  it('alavanca sem efeito não vira chip', () => {
    expect(leverDelta({ years: 40, valueAtDeadline: 1 }, { years: 40, valueAtDeadline: 1 }).kind).toBe('same')
  })

  it('alavanca que torna a meta alcançável', () => {
    expect(leverDelta({ years: null, valueAtDeadline: 1 }, { years: 28, valueAtDeadline: 2 }).kind).toBe('reachable')
  })

  it('alavanca que continua fora mostra o valor no prazo', () => {
    expect(leverDelta({ years: null, valueAtDeadline: 1 }, { years: null, valueAtDeadline: 3 }).kind).toBe('value')
  })
})

describe('progressPercent', () => {
  it('proporção simples', () => {
    expect(progressPercent(46_573, 5_000_000)).toBeCloseTo(0.9315, 3)
  })

  it('limita a 0–100 e nunca devolve NaN', () => {
    expect(progressPercent(10, 0)).toBe(0)
    expect(progressPercent(-5, 100)).toBe(0)
    expect(progressPercent(300, 100)).toBe(100)
    expect(progressPercent(NaN, 100)).toBe(0)
  })
})

describe('niceAxis', () => {
  it('meta de R$ 5 mi (com folga de 10%) vira eixo de 0 a 6 mi em degraus de 1 mi', () => {
    expect(niceAxis(5_500_000)).toEqual({ max: 6_000_000, step: 1_000_000 })
  })

  it('meta de R$ 20 mi usa degraus redondos e cobre o valor pedido', () => {
    const { max, step } = niceAxis(22_000_000)
    expect(max).toBeGreaterThanOrEqual(22_000_000)
    expect(max % step).toBe(0)
    expect(step).toBe(5_000_000)
  })

  it('valores pequenos e inválidos não quebram', () => {
    expect(niceAxis(0)).toEqual({ max: 1, step: 1 })
    expect(niceAxis(NaN)).toEqual({ max: 1, step: 1 })
    expect(niceAxis(1_000).max).toBeGreaterThanOrEqual(1_000)
  })
})

describe('sharePercentLabel', () => {
  it('fatia sobre o total, arredondada a inteiro', () => {
    expect(sharePercentLabel(3_179.88, 7_234.5)).toBe('44%')
    expect(sharePercentLabel(100, 100)).toBe('100%')
  })

  it('fatia pequena positiva vira "<1%" e zero vira "0%"', () => {
    expect(sharePercentLabel(10, 10_000)).toBe('<1%')
    expect(sharePercentLabel(0, 10_000)).toBe('0%')
  })

  it('total zero ou inválido não gera NaN', () => {
    expect(sharePercentLabel(50, 0)).toBe('0%')
    expect(sharePercentLabel(NaN, 100)).toBe('0%')
  })
})

describe('leverResultText', () => {
  it('alavanca que encurta o prazo mostra o novo prazo e quanto economiza', () => {
    const d = leverDelta({ years: 55.5, valueAtDeadline: 1 }, { years: 52.83, valueAtDeadline: 2 })
    expect(leverResultText(d)).toBe('meta em 52 anos e 10 meses (2 anos e 8 meses antes)')
  })

  it('meta que passa a ser alcançável', () => {
    const d = leverDelta({ years: null, valueAtDeadline: 1 }, { years: 28, valueAtDeadline: 2 })
    expect(leverResultText(d)).toBe('passa a alcançar a meta em 28 anos')
  })

  it('meta que continua fora mostra o valor no prazo', () => {
    const d = leverDelta({ years: null, valueAtDeadline: 1 }, { years: null, valueAtDeadline: 1_290_000 })
    expect(leverResultText(d)).toBe('chega a R$ 1,29 mi no prazo')
  })

  it('alavanca sem efeito não gera texto', () => {
    expect(leverResultText(leverDelta({ years: 40, valueAtDeadline: 1 }, { years: 40, valueAtDeadline: 1 }))).toBe('')
  })
})

describe('formatação curta', () => {
  it('anos e meses por extenso e curto', () => {
    expect(formatYears(55.5)).toBe('55 anos e 6 meses')
    expect(formatYearsShort(55.5)).toBe('55a 6m')
    expect(formatYearsShort(0.5)).toBe('6m')
    expect(formatYearsShort(2)).toBe('2a')
  })

  it('11,96 anos vira 12 anos exatos, sem "12 meses"', () => {
    expect(formatYears(11.96)).toBe('12 anos')
    expect(formatYearsShort(11.96)).toBe('12a')
  })

  it('valor compacto em reais', () => {
    expect(formatCompactBRL(46_573.97)).toBe('R$ 46,6 mil')
    expect(formatCompactBRL(1_290_000)).toBe('R$ 1,29 mi')
    expect(formatCompactBRL(850).replace(/ /g, ' ')).toBe('R$ 850,00')
  })
})
