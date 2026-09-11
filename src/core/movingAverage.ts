// Feature #4 (Previsão Comportamental) — média móvel de gastos e alerta de desvio orçamentário.
//
// O schema do Firestore (PRD §6.1) não tem uma coleção genérica de "gastos" — só
// `installments` para recorrentes. Por isso a função recebe uma lista genérica já pronta,
// desacoplada da fonte de dados; a decisão de qual coleção alimenta essa lista fica para
// quando a Feature #4 for implementada (M13/Fase 3).

import { differenceInCalendarDays } from 'date-fns'

export interface Expense {
  date: Date
  amount: number
  category?: string
}

const DEFAULT_WINDOW_DAYS = 90
const DAYS_PER_MONTH = 30

export function calculateMonthlyMovingAverage(
  expenses: Expense[],
  referenceDate: Date,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): number {
  const totalInWindow = expenses
    .filter((expense) => {
      const daysSince = differenceInCalendarDays(referenceDate, expense.date)
      return daysSince >= 0 && daysSince <= windowDays
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  return totalInWindow / (windowDays / DAYS_PER_MONTH)
}

export interface BudgetDeviationResult {
  deviationPercent: number
  exceedsThreshold: boolean
}

const DEFAULT_DEVIATION_THRESHOLD = 0.2

export function checkBudgetDeviation(
  averageMonthly: number,
  budgetedAmount: number,
  thresholdPercent: number = DEFAULT_DEVIATION_THRESHOLD,
): BudgetDeviationResult {
  const deviationPercent = (averageMonthly - budgetedAmount) / budgetedAmount

  return {
    deviationPercent,
    // PRD §4.4: alerta se desvio > 20% — para mais ou para menos do orçamento.
    exceedsThreshold: Math.abs(deviationPercent) > thresholdPercent,
  }
}
