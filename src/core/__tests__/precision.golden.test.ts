// Métrica de sucesso do PRD (§10): a projeção deve bater um cálculo manual dentro de ±2%.
//
// O "cálculo manual" aqui é uma simulação mês a mês escrita direto neste teste — um método
// independente da fórmula fechada usada em compoundInterest.ts (que soma valor futuro do
// capital + valor futuro de anuidade em vez de iterar mês a mês). Se as duas abordagens
// divergirem, é sinal de bug na fórmula fechada, não coincidência de implementação.
//
// Cenário fixo (mesmo do PRD §5, retorno ponderado-exemplo ≈ 9,8% a.a.):
// principal = R$ 50.000, aporte mensal = R$ 1.000, taxa anual = 9,8%, prazo = 10 anos.
// Resultado esperado (verificado à mão): ≈ R$ 325.000.

import { describe, expect, it } from 'vitest'
import { calculateGoalTimeline } from '../goalTimeline'
import { calculateProjection } from '../projection'

const PRINCIPAL = 50000
const MONTHLY_CONTRIBUTION = 1000
const ANNUAL_RATE = 0.098
const YEARS = 10
const MONTHS = YEARS * 12
const TOLERANCE = 0.02 // ±2% — métrica de sucesso do PRD §10

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

describe('precision.golden — projeção bate cálculo manual em ±2% (CENÁRIO 31)', () => {
  const expectedFinalAmount = simulateMonthByMonth(
    PRINCIPAL,
    MONTHLY_CONTRIBUTION,
    ANNUAL_RATE,
    MONTHS,
  )

  it('o cálculo manual de referência está na faixa esperada (~R$ 325.000)', () => {
    expect(expectedFinalAmount).toBeGreaterThan(300000)
    expect(expectedFinalAmount).toBeLessThan(350000)
  })

  it('calculateProjection bate o cálculo manual dentro de ±2%', () => {
    const projection = calculateProjection({
      currentPatrimony: PRINCIPAL,
      monthlyContribution: MONTHLY_CONTRIBUTION,
      annualReturnRate: ANNUAL_RATE,
      years: YEARS,
    })

    const relativeError =
      Math.abs(projection.finalAmount - expectedFinalAmount) / expectedFinalAmount

    expect(relativeError).toBeLessThan(TOLERANCE)
  })

  it('calculateGoalTimeline, com a meta = valor final esperado, converge para ~10 anos dentro de ±2%', () => {
    const timeline = calculateGoalTimeline({
      currentPatrimony: PRINCIPAL,
      monthlyContribution: MONTHLY_CONTRIBUTION,
      annualReturnRate: ANNUAL_RATE,
      goalAmount: expectedFinalAmount,
    })

    expect(timeline.reachable).toBe(true)
    expect(timeline.months).not.toBeNull()

    const relativeError = Math.abs((timeline.months as number) - MONTHS) / MONTHS
    expect(relativeError).toBeLessThan(TOLERANCE)
  })
})
