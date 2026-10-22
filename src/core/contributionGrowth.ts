// Simulador educativo "quanto seu aporte rende" (Investimentos). Começa do zero: não inclui o patrimônio atual.
// Mesma convenção do motor: aporte no fim de cada mês e taxa mensal equivalente à anual.
import { annualToMonthlyRate } from './compoundInterest'

export interface ContributionGrowthInput {
  monthlyContribution: number
  annualRate: number // fração, real (valores de hoje)
  years: number // inteiro, 1–50
}

export interface YearlyGrowthPoint {
  year: number
  contributed: number
  interest: number // juros acumulados até o fim do ano
  total: number
}

export interface ContributionGrowthResult {
  yearly: YearlyGrowthPoint[]
  totals: {
    contributed: number
    interest: number
    total: number
    // Quanto do total saiu do bolso, em % (0–100).
    pocketSharePercent: number
  }
  milestones: {
    // Primeiro mês em que os juros creditados no mês passam o aporte mensal. null = não ocorre no período.
    monthlyInterestPassesContribution: number | null
    // Primeiro mês em que os juros acumulados passam tudo o que saiu do bolso. null = não ocorre no período.
    totalInterestPassesContributed: number | null
  }
  // Um mês de exemplo para a leitura "juros do mês X": juros creditados nesse mês e o aporte do mês.
  monthExample: { month: number; monthlyInterest: number; contribution: number }
}

export const MAX_GROWTH_YEARS = 50
export const MAX_GROWTH_RATE = 0.3

export function simulateContributionGrowth({
  monthlyContribution,
  annualRate,
  years,
}: ContributionGrowthInput): ContributionGrowthResult {
  const months = years * 12
  const monthlyRate = annualRate === 0 ? 0 : annualToMonthlyRate(annualRate)
  const yearly: YearlyGrowthPoint[] = []

  let balance = 0
  let contributed = 0
  let interest = 0
  let monthlyInterestMilestone: number | null = null
  let totalInterestMilestone: number | null = null
  let example: ContributionGrowthResult['monthExample'] = { month: 1, monthlyInterest: 0, contribution: monthlyContribution }

  for (let month = 1; month <= months; month++) {
    // Juros do mês incidem sobre o saldo que chegou ao mês (aporte deste mês entra no fim).
    const monthlyInterest = balance * monthlyRate
    balance += monthlyInterest + monthlyContribution
    contributed += monthlyContribution
    interest += monthlyInterest

    if (monthlyInterestMilestone === null && monthlyInterest > monthlyContribution) {
      monthlyInterestMilestone = month
    }
    if (totalInterestMilestone === null && interest > contributed) {
      totalInterestMilestone = month
    }
    if (month === Math.min(12, months)) {
      example = { month, monthlyInterest, contribution: monthlyContribution }
    }
    if (month % 12 === 0) {
      yearly.push({ year: month / 12, contributed, interest, total: balance })
    }
  }

  const total = balance
  return {
    yearly,
    totals: {
      contributed,
      interest,
      total,
      pocketSharePercent: total > 0 ? (contributed / total) * 100 : 0,
    },
    milestones: {
      monthlyInterestPassesContribution: monthlyInterestMilestone,
      totalInterestPassesContributed: totalInterestMilestone,
    },
    monthExample: example,
  }
}

export function validateGrowthInput(input: ContributionGrowthInput): Partial<Record<keyof ContributionGrowthInput, string>> {
  const errors: Partial<Record<keyof ContributionGrowthInput, string>> = {}
  if (!Number.isFinite(input.monthlyContribution) || input.monthlyContribution < 0) {
    errors.monthlyContribution = 'Informe um valor de zero ou mais.'
  }
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > MAX_GROWTH_YEARS) {
    errors.years = `Escolha entre 1 e ${MAX_GROWTH_YEARS} anos.`
  }
  if (!Number.isFinite(input.annualRate) || input.annualRate < 0 || input.annualRate > MAX_GROWTH_RATE) {
    errors.annualRate = 'A taxa precisa estar entre 0% e 30% ao ano.'
  }
  return errors
}
