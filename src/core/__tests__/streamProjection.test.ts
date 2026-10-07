import { describe, it, expect } from 'vitest'
import {
  simulateStreams,
  calculateGoalTimelineFromStreams,
  yearlySeries,
  type PatrimonyStream,
} from '../streamProjection'
import { calculateCompoundInterest } from '../compoundInterest'
import { calculateGoalTimeline } from '../goalTimeline'

describe('streamProjection', () => {
  describe('simulateStreams', () => {
    it('fluxo único com taxa 0% = soma linear (principal + aportes)', () => {
      const streams: PatrimonyStream[] = [{ initialBalance: 1000, monthlyAmount: 100, annualRate: 0 }]
      const result = simulateStreams(streams, 12)

      expect(result).toHaveLength(13)
      expect(result[0]).toBe(1000)
      expect(result[1]).toBeCloseTo(1100, 2) // 1000 + 100
      expect(result[12]).toBeCloseTo(2200, 2) // 1000 + 100*12
    })

    it('fluxo sem saldo inicial, com aporte permanente', () => {
      const result = simulateStreams([{ monthlyAmount: 1000, annualRate: 0 }], 12)

      expect(result[0]).toBe(0)
      expect(result[1]).toBeCloseTo(1000, 2)
      expect(result[12]).toBeCloseTo(12000, 2)
    })

    it('fluxo com aporte finito (toMonth): aporta no mês N, não no N+1', () => {
      const result = simulateStreams([{ monthlyAmount: 100, annualRate: 0, toMonth: 5 }], 12)

      expect(result[4]).toBeCloseTo(400, 2)
      expect(result[5]).toBeCloseTo(500, 2) // última parcela, inclusive
      expect(result[6]).toBeCloseTo(500, 2) // para de aportar
      expect(result[12]).toBeCloseTo(500, 2) // fica congelado (taxa 0)
    })

    it('fluxo com aporte que começa depois (fromMonth)', () => {
      const streams: PatrimonyStream[] = [
        { initialBalance: 1000, monthlyAmount: 100, annualRate: 0, fromMonth: 4 },
      ]
      const result = simulateStreams(streams, 12)

      expect(result[3]).toBeCloseTo(1000, 2) // ainda não recebeu aporte
      expect(result[4]).toBeCloseTo(1100, 2) // começou a receber
      expect(result[12]).toBeCloseTo(1900, 2) // 1000 + 100*9 (meses 4 a 12)
    })

    it('janela fechada (fromMonth + toMonth) aporta só dentro dela', () => {
      const result = simulateStreams([{ monthlyAmount: 100, annualRate: 0, fromMonth: 3, toMonth: 5 }], 8)

      expect(result[2]).toBe(0)
      expect(result[3]).toBeCloseTo(100, 2)
      expect(result[5]).toBeCloseTo(300, 2)
      expect(result[6]).toBeCloseTo(300, 2)
      expect(result[8]).toBeCloseTo(300, 2)
    })

    it('cada fluxo rende à sua própria taxa (mensal exata de 1% vs 0%)', () => {
      const annualOnePercentMonthly = Math.pow(1.01, 12) - 1
      const streams: PatrimonyStream[] = [
        { initialBalance: 1000, monthlyAmount: 0, annualRate: annualOnePercentMonthly },
        { monthlyAmount: 100, annualRate: 0 },
      ]
      const result = simulateStreams(streams, 12)

      // 1000 × 1,01^12 (juros) + 100 × 12 (aportes sem rendimento)
      expect(result[12]).toBeCloseTo(1000 * Math.pow(1.01, 12) + 1200, 6)
    })

    it('múltiplos fluxos = soma das fórmulas fechadas de cada fluxo', () => {
      const streams: PatrimonyStream[] = [
        { initialBalance: 10000, monthlyAmount: 0, annualRate: 0.098 }, // principal capitalizado
        { monthlyAmount: 500, annualRate: 0.098 }, // aporte livre
        { monthlyAmount: 200, annualRate: 0, toMonth: 12 }, // consórcio sem rendimento, 12 meses
      ]
      const result = simulateStreams(streams, 12)

      const expected =
        calculateCompoundInterest({ principal: 10000, monthlyContribution: 0, annualRate: 0.098, months: 12 }) +
        calculateCompoundInterest({ principal: 0, monthlyContribution: 500, annualRate: 0.098, months: 12 }) +
        200 * 12
      expect(result[12]).toBeCloseTo(expected, 6)
    })

    it('taxa real negativa perde poder de compra no ritmo da taxa (sem NaN)', () => {
      // 0% nominal com 4,5% de inflação: R$ 1.000 de hoje viram 1000 / 1,045 em 1 ano
      const result = simulateStreams([{ initialBalance: 1000, monthlyAmount: 0, annualRate: 1 / 1.045 - 1 }], 12)

      expect(result[12]).toBeCloseTo(1000 / 1.045, 6)
    })

    it('sem fluxos nenhum: tudo zero, sem NaN', () => {
      const result = simulateStreams([], 12)

      expect(result).toHaveLength(13)
      expect(result.every((value) => value === 0)).toBe(true)
    })
  })

  describe('calculateGoalTimelineFromStreams', () => {
    it('meta já atingida no mês 0', () => {
      const streams: PatrimonyStream[] = [{ initialBalance: 100000, monthlyAmount: 0, annualRate: 0 }]
      const result = calculateGoalTimelineFromStreams({ streams, goalAmount: 50000 })

      expect(result.reachable).toBe(true)
      expect(result.months).toBe(0)
      expect(result.years).toBe(0)
      expect(result.patrimonyAtCap).toBe(100000)
      expect(result.shortfallAtCap).toBeLessThan(0)
    })

    it('meta inatingível (aporte 0, taxa 0)', () => {
      const streams: PatrimonyStream[] = [{ initialBalance: 1000, monthlyAmount: 0, annualRate: 0 }]
      const result = calculateGoalTimelineFromStreams({ streams, goalAmount: 100000, maxYears: 10 })

      expect(result.reachable).toBe(false)
      expect(result.months).toBeNull()
      expect(result.years).toBeNull()
      expect(result.patrimonyAtCap).toBe(1000) // fica congelado
      expect(result.shortfallAtCap).toBe(99000)
      expect(result.capYears).toBe(10)
    })

    it('sem nenhum fluxo: inatingível, sem NaN nem Infinity', () => {
      const result = calculateGoalTimelineFromStreams({ streams: [], goalAmount: 100, maxYears: 1 })

      expect(result.reachable).toBe(false)
      expect(result.patrimonyAtCap).toBe(0)
      expect(result.shortfallAtCap).toBe(100)
    })

    it('meta atingível (aporte permanente, taxa 0): 20 aportes de 1.000 = 20.000', () => {
      const streams: PatrimonyStream[] = [{ monthlyAmount: 1000, annualRate: 0 }]
      const result = calculateGoalTimelineFromStreams({ streams, goalAmount: 20000 })

      expect(result.reachable).toBe(true)
      expect(result.months).toBe(20)
      expect(result.years).toBeCloseTo(20 / 12, 10)
      expect(result.patrimonyAtCap).toBeGreaterThanOrEqual(20000)
    })

    it('aporte com prazo que não sustenta a meta: inatingível, patrimônio congela', () => {
      const streams: PatrimonyStream[] = [{ monthlyAmount: 1000, annualRate: 0, toMonth: 12 }]
      const result = calculateGoalTimelineFromStreams({ streams, goalAmount: 20000, maxYears: 5 })

      expect(result.reachable).toBe(false)
      expect(result.patrimonyAtCap).toBeCloseTo(12000, 2)
      expect(result.shortfallAtCap).toBeCloseTo(8000, 2)
    })
  })

  describe('yearlySeries', () => {
    it('snapshots anuais de um fluxo simples', () => {
      const series = yearlySeries([{ monthlyAmount: 1000, annualRate: 0 }], 3)

      expect(series).toHaveLength(4) // ano 0, 1, 2, 3
      expect(series[0]).toBe(0)
      expect(series[1]).toBeCloseTo(12000, 0)
      expect(series[2]).toBeCloseTo(24000, 0)
      expect(series[3]).toBeCloseTo(36000, 0)
    })

    it('coincide com simulateStreams nos múltiplos de 12 (gráfico e meta não divergem)', () => {
      const streams: PatrimonyStream[] = [
        { initialBalance: 41291, monthlyAmount: 0, annualRate: 0.067 },
        { monthlyAmount: 1378.8, annualRate: 0.04 },
        { monthlyAmount: 1500, annualRate: -0.043, toMonth: 60 },
      ]
      const monthly = simulateStreams(streams, 25 * 12)
      const yearly = yearlySeries(streams, 25)

      yearly.forEach((value, year) => {
        expect(value).toBe(monthly[year * 12])
      })
    })
  })

  describe('ponte: compatibilidade com calculateCompoundInterest', () => {
    it('um fluxo equivalente a calculateCompoundInterest bate o resultado (erro relativo < 1e-9)', () => {
      const principal = 50000
      const monthlyContribution = 1000
      const annualRate = 0.098
      const months = 120

      const closedForm = calculateCompoundInterest({ principal, monthlyContribution, annualRate, months })
      const simulated = simulateStreams(
        [{ initialBalance: principal, monthlyAmount: monthlyContribution, annualRate }],
        months
      )[months]

      expect(simulated).toBeDefined()
      expect(Math.abs((simulated ?? 0) - closedForm) / closedForm).toBeLessThan(1e-9)
    })
  })

  describe('ponte: compatibilidade com calculateGoalTimeline', () => {
    it('meta atingível: mesmo número de meses', () => {
      const principal = 50000
      const monthlyContribution = 1000
      const annualRate = 0.098
      const goalAmount = 500000

      const single = calculateGoalTimeline({
        currentPatrimony: principal,
        monthlyContribution,
        annualReturnRate: annualRate,
        goalAmount,
      })
      const fromStreams = calculateGoalTimelineFromStreams({
        streams: [{ initialBalance: principal, monthlyAmount: monthlyContribution, annualRate }],
        goalAmount,
      })

      expect(fromStreams.reachable).toBe(single.reachable)
      expect(fromStreams.months).toBe(single.months)
    })

    it('meta inatingível: mesmo patrimônio no teto', () => {
      const single = calculateGoalTimeline({
        currentPatrimony: 1000,
        monthlyContribution: 10,
        annualReturnRate: 0.02,
        goalAmount: 10_000_000,
        maxYears: 30,
      })
      const fromStreams = calculateGoalTimelineFromStreams({
        streams: [{ initialBalance: 1000, monthlyAmount: 10, annualRate: 0.02 }],
        goalAmount: 10_000_000,
        maxYears: 30,
      })

      expect(fromStreams.reachable).toBe(false)
      expect(fromStreams.patrimonyAtCap).toBeCloseTo(single.patrimonyAtCap, 6)
    })
  })
})
