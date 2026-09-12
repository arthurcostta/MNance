import { describe, expect, it } from 'vitest'
import { calculateDashboardMetrics } from '../useDashboard'

const TOLERANCE = 0.02 // ±2% — mesma tolerância de precision.golden.test.ts (PRD §10)

function simulateMonthByMonth(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  months: number,
): number {
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
  let total = principal

  for (let i = 0; i < months; i++) {
    total = total * (1 + monthlyRate) + monthlyContribution
  }

  return total
}

describe('calculateDashboardMetrics', () => {
  it('CENÁRIO 31: patrimônio + aporte + taxa realistas → velocity e tempo até a meta batem cálculo manual (±2%)', () => {
    const currentPatrimony = 50000
    const monthlyIncomeNet = 4000
    const essentialMonthlyCost = 3000 // aporte = 1000
    const weightedReturn = 0.098
    const months = 120 // 10 anos

    const expectedFinalAmount = simulateMonthByMonth(
      currentPatrimony,
      monthlyIncomeNet - essentialMonthlyCost,
      weightedReturn,
      months,
    )

    const metrics = calculateDashboardMetrics({
      currentPatrimony,
      monthlyIncomeNet,
      essentialMonthlyCost,
      weightedReturn,
      goalAmount: expectedFinalAmount,
    })

    expect(metrics.monthlyContribution).toBe(1000)

    const expectedMonthlyRate = Math.pow(1 + weightedReturn, 1 / 12) - 1
    const expectedVelocity = 1000 + currentPatrimony * expectedMonthlyRate
    expect(metrics.velocity).toBeCloseTo(expectedVelocity, 6)

    expect(metrics.base.reachable).toBe(true)
    expect(metrics.base.months).not.toBeNull()
    const relativeError = Math.abs((metrics.base.months as number) - months) / months
    expect(relativeError).toBeLessThan(TOLERANCE)
  })

  it('CENÁRIO 32: meta já atingida → reachable true, months 0, sem insight de boost', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 100000,
      monthlyIncomeNet: 5000,
      essentialMonthlyCost: 3000,
      weightedReturn: 0.1,
      goalAmount: 50000,
    })

    expect(metrics.base.reachable).toBe(true)
    expect(metrics.base.months).toBe(0)
    expect(metrics.showBoostInsight).toBe(false)
    expect(metrics.boosted).toBeNull()
  })

  it('CENÁRIO 33: aporte zero (renda === custo) → sem NaN/Infinity, sem insight de boost, sem alerta de orçamento', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 20000,
      monthlyIncomeNet: 3000,
      essentialMonthlyCost: 3000,
      weightedReturn: 0.09,
      goalAmount: 1000000,
    })

    expect(metrics.monthlyContribution).toBe(0)
    expect(metrics.budgetAlert).toBe(false)
    expect(Number.isFinite(metrics.velocity)).toBe(true)
    expect(Number.isFinite(metrics.base.patrimonyAtCap)).toBe(true)
    expect(metrics.showBoostInsight).toBe(false)
    expect(metrics.boosted).toBeNull()
  })

  it('CENÁRIO 33: aporte negativo (custo > renda) → sem NaN/Infinity, budgetAlert true, sem insight de boost', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 20000,
      monthlyIncomeNet: 3000,
      essentialMonthlyCost: 3500,
      weightedReturn: 0.09,
      goalAmount: 1000000,
    })

    expect(metrics.monthlyContribution).toBe(-500)
    expect(metrics.budgetAlert).toBe(true)
    expect(Number.isFinite(metrics.velocity)).toBe(true)
    expect(Number.isFinite(metrics.base.patrimonyAtCap)).toBe(true)
    expect(metrics.showBoostInsight).toBe(false)
    expect(metrics.boosted).toBeNull()
  })

  it('CENÁRIO 34: aporte zero → insight de +20% suprimido mesmo quando a meta é alcançável só pelo retorno da carteira', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 10000,
      monthlyIncomeNet: 3000,
      essentialMonthlyCost: 3000,
      weightedReturn: 0.5,
      goalAmount: 50000,
    })

    expect(metrics.monthlyContribution).toBe(0)
    expect(metrics.showBoostInsight).toBe(false)
    expect(metrics.boosted).toBeNull()
  })

  it('CENÁRIO 35: patrimônio inicial zero → sem divisão por zero, velocity calculado só com o componente de aporte', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 0,
      monthlyIncomeNet: 4500,
      essentialMonthlyCost: 3000,
      weightedReturn: 0.1,
      goalAmount: 200000,
    })

    expect(metrics.monthlyContribution).toBe(1500)
    expect(metrics.velocity).toBe(1500)
    expect(Number.isFinite(metrics.base.patrimonyAtCap)).toBe(true)
  })

  it('Caso extra: cenário boosted numericamente idêntico ao base (meta batida no mesmo mês) → insight suprimido', () => {
    const metrics = calculateDashboardMetrics({
      currentPatrimony: 99999,
      monthlyIncomeNet: 3500,
      essentialMonthlyCost: 3000, // aporte = 500
      weightedReturn: 0.1,
      goalAmount: 100000,
    })

    expect(metrics.monthlyContribution).toBeGreaterThan(0)
    expect(metrics.base.reachable).toBe(true)
    expect(metrics.boosted).not.toBeNull()
    expect(metrics.boosted?.months).toBe(metrics.base.months)
    expect(metrics.showBoostInsight).toBe(false)
  })
})
