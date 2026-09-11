// Feature #2 (Radar) — "quantos anos até a meta?". Não há inversa trivial da fórmula de
// anuidade para isolar o número de meses, então simulamos mês a mês até o patrimônio
// alcançar a meta, com um teto de segurança (maxYears) para evitar loop efetivamente infinito
// quando aporte e/ou taxa não sustentam a meta.
//
// Decisão de produto (não só técnica): quando a meta não é alcançada dentro do teto, a UI
// (M4/Dashboard) não deve tratar isso como veredito — o tom é "convite à ação" (ajustar
// aporte, prazo ou meta). Por isso o retorno aqui, mesmo no caso inatingível, carrega
// patrimonyAtCap/shortfallAtCap: dados suficientes para a mensagem dar contexto numérico
// sem a IA (nem o app) precisar simular de novo.

import { annualToMonthlyRate } from './compoundInterest'

export interface GoalTimelineInput {
  currentPatrimony: number
  monthlyContribution: number
  annualReturnRate: number
  goalAmount: number
  maxYears?: number
}

export interface GoalTimelineResult {
  reachable: boolean
  months: number | null // null quando reachable === false
  years: number | null // null quando reachable === false
  patrimonyAtCap: number // patrimônio projetado no ponto em que a simulação parou
  shortfallAtCap: number // goalAmount - patrimonyAtCap (pode ser <= 0 se a meta já foi batida)
  capYears: number // o maxYears efetivamente usado, para a UI referenciar no texto
}

const DEFAULT_MAX_YEARS = 100

export function calculateGoalTimeline({
  currentPatrimony,
  monthlyContribution,
  annualReturnRate,
  goalAmount,
  maxYears = DEFAULT_MAX_YEARS,
}: GoalTimelineInput): GoalTimelineResult {
  if (currentPatrimony >= goalAmount) {
    return {
      reachable: true,
      months: 0,
      years: 0,
      patrimonyAtCap: currentPatrimony,
      shortfallAtCap: goalAmount - currentPatrimony,
      capYears: maxYears,
    }
  }

  const monthlyRate = annualReturnRate === 0 ? 0 : annualToMonthlyRate(annualReturnRate)
  const capMonths = maxYears * 12
  let patrimony = currentPatrimony

  for (let month = 1; month <= capMonths; month++) {
    patrimony = patrimony * (1 + monthlyRate) + monthlyContribution

    if (patrimony >= goalAmount) {
      return {
        reachable: true,
        months: month,
        years: month / 12,
        patrimonyAtCap: patrimony,
        shortfallAtCap: goalAmount - patrimony,
        capYears: maxYears,
      }
    }
  }

  return {
    reachable: false,
    months: null,
    years: null,
    patrimonyAtCap: patrimony,
    shortfallAtCap: goalAmount - patrimony,
    capYears: maxYears,
  }
}
