// Motor de projeção por fluxos — simulação mês a mês onde cada fluxo (ativo, aporte livre, aporte
// programado com prazo etc.) rende e recebe aportes de forma independente, com sua própria taxa real.
// Fonte única para o gráfico e para o "tempo até a meta": os dois saem da mesma simulação, então
// não podem contradizer um ao outro.
//
// Diferente de calculateCompoundInterest/calculateProjection/calculateGoalTimeline (uma só taxa
// para tudo, aporte permanente — continuam servindo ao Simulador do M6 e ao golden test), aqui
// cada fluxo tem taxa e janela de aportes próprias. Isso é o que permite modelar, por exemplo, um
// consórcio a 0% por 60 meses ao lado de uma carteira que rende ~9% ao ano.
//
// O motor não conhece inflação: recebe taxas já reais (ver core/inflation.ts → toRealRate).

import { annualToMonthlyRate } from './compoundInterest'
import type { GoalTimelineResult } from './goalTimeline'

export interface PatrimonyStream {
  // Saldo inicial deste fluxo (ex: o valor atual de um ativo). Ausente = começa em 0.
  initialBalance?: number
  // Aporte mensal em R$ (constante em valores de hoje — acompanha a inflação por construção).
  monthlyAmount: number
  // Taxa anual REAL (já convertida por toRealRate quando a taxa de origem é nominal).
  annualRate: number
  // Primeiro mês com aporte (1-based; 1 = o mês seguinte a hoje). Ausente = mês 1.
  fromMonth?: number
  // Último mês com aporte, inclusive (1-based). Ausente = permanente.
  // Ex.: consórcio com 60 parcelas restantes tem toMonth = 60 — aporta no mês 60, não no 61.
  toMonth?: number
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

// Retorna o patrimônio total nos meses 0..totalMonths (length = totalMonths + 1).
// Cada mês, para cada fluxo: saldo = saldo × (1 + taxa mensal) + aporte (se o mês está na janela).
// Aportes entram no fim do mês, mesma convenção de calculateCompoundInterest. Taxa 0 e taxa
// real negativa (retorno nominal abaixo da inflação) funcionam sem caso especial.
export function simulateStreams(streams: PatrimonyStream[], totalMonths: number): number[] {
  const balances = streams.map((stream) => stream.initialBalance ?? 0)
  const totals: number[] = [sum(balances)]

  for (let month = 1; month <= totalMonths; month++) {
    for (const [index, stream] of streams.entries()) {
      const monthlyRate = annualToMonthlyRate(stream.annualRate)
      const receivesContribution =
        month >= (stream.fromMonth ?? 1) && month <= (stream.toMonth ?? Infinity)

      balances[index] =
        (balances[index] ?? 0) * (1 + monthlyRate) + (receivesContribution ? stream.monthlyAmount : 0)
    }
    totals.push(sum(balances))
  }

  return totals
}

export interface GoalTimelineFromStreamsInput {
  streams: PatrimonyStream[]
  goalAmount: number
  maxYears?: number
}

const DEFAULT_MAX_YEARS = 100

// Mesmo contrato de calculateGoalTimeline (inclusive patrimonyAtCap/shortfallAtCap, que sustentam
// a mensagem "convite à ação" do Radar quando a meta não é alcançada dentro do teto).
export function calculateGoalTimelineFromStreams({
  streams,
  goalAmount,
  maxYears = DEFAULT_MAX_YEARS,
}: GoalTimelineFromStreamsInput): GoalTimelineResult {
  const capMonths = maxYears * 12
  const series = simulateStreams(streams, capMonths)
  const valueAt = (month: number) => series[month] ?? 0

  const reachedMonth = series.findIndex((total) => total >= goalAmount)
  if (reachedMonth !== -1) {
    return {
      reachable: true,
      months: reachedMonth,
      years: reachedMonth / 12,
      patrimonyAtCap: valueAt(reachedMonth),
      shortfallAtCap: goalAmount - valueAt(reachedMonth),
      capYears: maxYears,
    }
  }

  return {
    reachable: false,
    months: null,
    years: null,
    patrimonyAtCap: valueAt(capMonths),
    shortfallAtCap: goalAmount - valueAt(capMonths),
    capYears: maxYears,
  }
}

// Snapshots anuais (ano 0, 1, ..., N) da mesma simulação usada em calculateGoalTimelineFromStreams.
export function yearlySeries(streams: PatrimonyStream[], years: number): number[] {
  const series = simulateStreams(streams, years * 12)
  return Array.from({ length: years + 1 }, (_, year) => series[year * 12] ?? 0)
}
