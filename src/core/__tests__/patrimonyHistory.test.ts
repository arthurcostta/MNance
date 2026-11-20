import { describe, it, expect } from 'vitest'
import {
  activeAssetsTotal,
  buildHistorySeries,
  formatMonthLabel,
  historyAxis,
  summarizeHistory,
  type HistoryPoint,
} from '../patrimonyHistory'

const NOV_2026 = { year: 2026, month: 11 }

describe('activeAssetsTotal', () => {
  it('ignora ativos arquivados', () => {
    expect(
      activeAssetsTotal([
        { status: 'active', currentValue: 100 },
        { status: 'archived', currentValue: 500 },
      ])
    ).toBe(100)
  })

  it('soma em centavos sem erro de ponto flutuante', () => {
    expect(
      activeAssetsTotal([
        { status: 'active', currentValue: 0.1 },
        { status: 'active', currentValue: 0.2 },
      ])
    ).toBe(0.3)
  })

  it('sem nenhum ativo ativo devolve null (não grava zero)', () => {
    expect(activeAssetsTotal([])).toBeNull()
    expect(activeAssetsTotal([{ status: 'archived', currentValue: 300 }])).toBeNull()
  })

  it('ignora ativos fora do crescimento (consórcio imobiliário)', () => {
    expect(
      activeAssetsTotal([
        { status: 'active', currentValue: 41_291 },
        { status: 'active', currentValue: 5_000, excludedFromGrowth: true },
      ])
    ).toBe(41_291)
  })

  it('só com ativos fora do crescimento não há total para registrar', () => {
    expect(activeAssetsTotal([{ status: 'active', currentValue: 5_000, excludedFromGrowth: true }])).toBeNull()
  })

  it('ignora valores não finitos', () => {
    expect(
      activeAssetsTotal([
        { status: 'active', currentValue: 200 },
        { status: 'active', currentValue: Number.NaN },
      ])
    ).toBe(200)
  })
})

describe('formatMonthLabel', () => {
  it('formata AAAA-MM como MM/AA', () => {
    expect(formatMonthLabel('2026-11')).toBe('11/26')
    expect(formatMonthLabel('2027-01')).toBe('01/27')
  })

  it('devolve a entrada inválida como veio', () => {
    expect(formatMonthLabel('2026-13')).toBe('2026-13')
    expect(formatMonthLabel('abc')).toBe('abc')
  })
})

describe('buildHistorySeries', () => {
  it('sem retratos e sem total vivo não há série', () => {
    expect(buildHistorySeries([], NOV_2026, null)).toEqual([])
  })

  it('sem retratos, o total vivo vira um único ponto no mês corrente', () => {
    expect(buildHistorySeries([], NOV_2026, 41291)).toEqual([
      { month: '2026-11', label: '11/26', total: 41291, carried: false },
    ])
  })

  it('um retrato e nada mais: não inventa meses até hoje', () => {
    expect(buildHistorySeries([{ month: '2026-09', total: 100 }], NOV_2026, null)).toEqual([
      { month: '2026-09', label: '09/26', total: 100, carried: false },
    ])
  })

  it('mês sem retrato repete o saldo anterior e vem marcado como carried', () => {
    const series = buildHistorySeries(
      [
        { month: '2026-09', total: 100 },
        { month: '2026-11', total: 150 },
      ],
      NOV_2026,
      null
    )
    expect(series).toEqual([
      { month: '2026-09', label: '09/26', total: 100, carried: false },
      { month: '2026-10', label: '10/26', total: 100, carried: true },
      { month: '2026-11', label: '11/26', total: 150, carried: false },
    ])
  })

  it('o total vivo substitui o retrato do mês corrente', () => {
    const series = buildHistorySeries(
      [
        { month: '2026-09', total: 100 },
        { month: '2026-11', total: 150 },
      ],
      NOV_2026,
      120
    )
    expect(series[series.length - 1]).toEqual({ month: '2026-11', label: '11/26', total: 120, carried: false })
  })

  it('último retrato antigo estende até o mês corrente quando há total vivo', () => {
    const series = buildHistorySeries([{ month: '2026-09', total: 100 }], NOV_2026, 130)
    expect(series).toEqual([
      { month: '2026-09', label: '09/26', total: 100, carried: false },
      { month: '2026-10', label: '10/26', total: 100, carried: true },
      { month: '2026-11', label: '11/26', total: 130, carried: false },
    ])
  })

  it('sem total vivo não inventa ponto para o mês corrente', () => {
    const series = buildHistorySeries([{ month: '2026-09', total: 100 }], NOV_2026, null)
    expect(series.map((p) => p.month)).toEqual(['2026-09'])
  })

  it('ordena retratos fora de ordem', () => {
    const series = buildHistorySeries(
      [
        { month: '2026-11', total: 150 },
        { month: '2026-09', total: 100 },
      ],
      NOV_2026,
      null
    )
    expect(series.map((p) => p.month)).toEqual(['2026-09', '2026-10', '2026-11'])
  })

  it('ignora mês ou valor inválido', () => {
    const series = buildHistorySeries(
      [
        { month: '2026-13', total: 999 },
        { month: 'xx', total: 999 },
        { month: '2026-09', total: Number.NaN },
        { month: '2026-09', total: 100 },
      ],
      NOV_2026,
      null
    )
    expect(series).toEqual([{ month: '2026-09', label: '09/26', total: 100, carried: false }])
  })

  it('no mesmo mês, vale o último retrato da lista', () => {
    const series = buildHistorySeries(
      [
        { month: '2026-09', total: 100 },
        { month: '2026-09', total: 200 },
      ],
      NOV_2026,
      null
    )
    expect(series).toEqual([{ month: '2026-09', label: '09/26', total: 200, carried: false }])
  })

  it('vira o ano sem pular nem repetir meses', () => {
    const series = buildHistorySeries([{ month: '2026-12', total: 100 }], { year: 2027, month: 2 }, 110)
    expect(series.map((p) => p.label)).toEqual(['12/26', '01/27', '02/27'])
    expect(series.map((p) => p.total)).toEqual([100, 100, 110])
    expect(series.map((p) => p.carried)).toEqual([false, true, false])
  })
})

describe('summarizeHistory', () => {
  it('sem pontos não há resumo', () => {
    expect(summarizeHistory([])).toBeNull()
  })

  it('mede a alta desde o primeiro ponto', () => {
    const points: HistoryPoint[] = [
      { month: '2026-09', label: '09/26', total: 100, carried: false },
      { month: '2026-10', label: '10/26', total: 100, carried: true },
      { month: '2026-11', label: '11/26', total: 150, carried: false },
    ]
    expect(summarizeHistory(points)).toEqual({ firstLabel: '09/26', delta: 50, percent: 50, months: 2 })
  })

  it('mede a queda com sinal negativo', () => {
    const points: HistoryPoint[] = [
      { month: '2026-09', label: '09/26', total: 200, carried: false },
      { month: '2026-10', label: '10/26', total: 150, carried: false },
    ]
    expect(summarizeHistory(points)).toEqual({ firstLabel: '09/26', delta: -50, percent: -25, months: 1 })
  })

  it('com primeiro valor zero, a porcentagem é null', () => {
    const points: HistoryPoint[] = [
      { month: '2026-09', label: '09/26', total: 0, carried: false },
      { month: '2026-10', label: '10/26', total: 500, carried: false },
    ]
    expect(summarizeHistory(points)?.percent).toBeNull()
  })

  it('um ponto só: sem variação e zero meses', () => {
    const points: HistoryPoint[] = [{ month: '2026-11', label: '11/26', total: 100, carried: false }]
    expect(summarizeHistory(points)).toEqual({ firstLabel: '11/26', delta: 0, percent: 0, months: 0 })
  })
})

describe('historyAxis', () => {
  it('não começa em zero: 40 mil a 44 mil vira eixo de 39 mil a 45 mil, degrau de 1 mil', () => {
    expect(historyAxis([40000, 44000])).toEqual({ min: 39000, max: 45000, step: 1000 })
  })

  it('série plana ganha uma folga e não colapsa', () => {
    const axis = historyAxis([1000, 1000])
    expect(axis.min).toBeLessThanOrEqual(1000)
    expect(axis.max).toBeGreaterThanOrEqual(1000)
    expect(axis.step).toBeGreaterThan(0)
    expect(axis.max).toBeGreaterThan(axis.min)
  })

  it('um ponto só gera eixo válido', () => {
    const axis = historyAxis([41291])
    expect(axis.min).toBeLessThanOrEqual(41291)
    expect(axis.max).toBeGreaterThanOrEqual(41291)
    expect(axis.step).toBeGreaterThan(0)
  })

  it('sem valores devolve um eixo padrão, sem NaN', () => {
    expect(historyAxis([])).toEqual({ min: 0, max: 1, step: 1 })
  })

  it('nunca desce abaixo de zero', () => {
    const axis = historyAxis([5000, 6000])
    expect(axis.min).toBeGreaterThanOrEqual(0)
  })

  it('zeros não geram NaN', () => {
    const axis = historyAxis([0, 0])
    expect(Number.isFinite(axis.min) && Number.isFinite(axis.max) && Number.isFinite(axis.step)).toBe(true)
    expect(axis.max).toBeGreaterThan(axis.min)
  })
})
