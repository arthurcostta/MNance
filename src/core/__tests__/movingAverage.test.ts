import { describe, expect, it } from 'vitest'
import { calculateMonthlyMovingAverage, checkBudgetDeviation } from '../movingAverage'

describe('calculateMonthlyMovingAverage', () => {
  const referenceDate = new Date('2026-04-01')

  it('lista vazia: retorna 0', () => {
    expect(calculateMonthlyMovingAverage([], referenceDate)).toBe(0)
  })

  it('soma apenas gastos dentro da janela e normaliza para média mensal', () => {
    const expenses = [
      { date: new Date('2026-03-15'), amount: 300 }, // dentro da janela de 90 dias
      { date: new Date('2026-02-01'), amount: 300 }, // dentro da janela de 90 dias
      { date: new Date('2025-10-01'), amount: 9999 }, // fora da janela — deve ser ignorado
    ]

    const result = calculateMonthlyMovingAverage(expenses, referenceDate, 90)

    // soma = 600, normalizado para mês: 600 / (90/30) = 200
    expect(result).toBeCloseTo(200, 6)
  })

  it('ignora gastos com data futura em relação à referência', () => {
    const expenses = [{ date: new Date('2026-05-01'), amount: 500 }]

    expect(calculateMonthlyMovingAverage(expenses, referenceDate, 90)).toBe(0)
  })

  it('janela customizada de 30 dias: soma não é normalizada (janela == 1 mês)', () => {
    const expenses = [{ date: new Date('2026-03-20'), amount: 450 }]

    const result = calculateMonthlyMovingAverage(expenses, referenceDate, 30)

    expect(result).toBeCloseTo(450, 6)
  })
})

describe('checkBudgetDeviation', () => {
  it('dentro do limite: não excede o threshold', () => {
    const result = checkBudgetDeviation(1100, 1000)

    expect(result.deviationPercent).toBeCloseTo(0.1, 6)
    expect(result.exceedsThreshold).toBe(false)
  })

  it('exatamente 20%: não excede — regra é "> 20%", não ">= 20%"', () => {
    const result = checkBudgetDeviation(1200, 1000)

    expect(result.deviationPercent).toBeCloseTo(0.2, 6)
    expect(result.exceedsThreshold).toBe(false)
  })

  it('acima de 20%: excede o threshold', () => {
    const result = checkBudgetDeviation(1300, 1000)

    expect(result.deviationPercent).toBeCloseTo(0.3, 6)
    expect(result.exceedsThreshold).toBe(true)
  })

  it('desvio para baixo (gastou bem menos que o orçado) também é sinalizado', () => {
    const result = checkBudgetDeviation(700, 1000)

    expect(result.deviationPercent).toBeCloseTo(-0.3, 6)
    expect(result.exceedsThreshold).toBe(true)
  })
})
