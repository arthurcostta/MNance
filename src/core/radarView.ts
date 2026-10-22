// Apresentação do Radar (22/10/2026): posições e deltas para os elementos visuais. TS puro, sem números novos:
// só reorganiza o que o motor já calculou.

import { formatYears } from '../utils/formatYears'
import { formatCompactBRL } from '../utils/formatCurrency'

export interface TimelineInput {
  goalYears: number
  baseYears: number | null
  optimisticYears: number | null
  conservativeYears: number | null
  horizonYears: number
}

export interface TimelineMarkers {
  // Escala do eixo (anos): um pouco além do maior marco, para o último rótulo não colar na borda.
  scaleYears: number
  deadline: number // posição em % (0–100)
  base: number | null // null = meta não alcançada dentro do horizonte
  optimistic: number | null
  conservative: number | null
  // Faixa sombreada entre otimista e conservador (sempre em ordem crescente).
  band: { start: number; end: number } | null
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

export function timelineMarkers(input: TimelineInput): TimelineMarkers {
  const reachable = [input.goalYears, input.baseYears, input.optimisticYears, input.conservativeYears].filter(
    (v): v is number => v !== null && Number.isFinite(v)
  )
  const longest = reachable.length > 0 ? Math.max(...reachable) : input.horizonYears
  const scaleYears = Math.max(1, longest * 1.1)
  const toPercent = (years: number | null) =>
    years === null || !Number.isFinite(years) ? null : clampPercent((years / scaleYears) * 100)

  const optimistic = toPercent(input.optimisticYears)
  const conservative = toPercent(input.conservativeYears)
  const band =
    optimistic !== null && conservative !== null
      ? { start: Math.min(optimistic, conservative), end: Math.max(optimistic, conservative) }
      : null

  return {
    scaleYears,
    deadline: clampPercent((input.goalYears / scaleYears) * 100),
    base: toPercent(input.baseYears),
    optimistic,
    conservative,
    band,
  }
}

export interface LeverVariant {
  years: number | null
  valueAtDeadline: number
}

export type LeverKind = 'faster' | 'same' | 'reachable' | 'value'

export interface LeverDelta {
  kind: LeverKind
  years: number | null
  // Anos a menos que o plano atual (positivo = mais rápido). Só em 'faster'.
  deltaYears: number | null
  valueAtDeadline: number
}

// Efeito de uma alavanca, em anos economizados. 'same' = a alavanca não muda o prazo (não deve virar chip).
// 'reachable' = a meta passa a ser alcançada; 'value' = continua fora, mas mostramos o valor no prazo.
export function leverDelta(base: LeverVariant, lever: LeverVariant): LeverDelta {
  const common = { years: lever.years, valueAtDeadline: lever.valueAtDeadline }
  if (lever.years !== null && base.years !== null) {
    const delta = base.years - lever.years
    if (Math.abs(delta) < 1 / 12) return { kind: 'same', deltaYears: 0, ...common }
    return { kind: 'faster', deltaYears: delta, ...common }
  }
  if (lever.years !== null) return { kind: 'reachable', deltaYears: null, ...common }
  return { kind: 'value', deltaYears: null, ...common }
}

// Progresso da meta em [0, 100]. Meta zero ou valores inválidos viram 0 (sem NaN nem Infinity).
export function progressPercent(current: number, goal: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0) return 0
  return clampPercent((current / goal) * 100)
}

const NICE_FACTORS = [1, 2, 2.5, 5, 10]

// Eixo do gráfico com degraus redondos (1, 2, 2,5 ou 5 × 10ⁿ). O topo é o primeiro múltiplo do passo que cobre maxValue.
export function niceAxis(maxValue: number, divisions = 6): { max: number; step: number } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1, step: 1 }
  const rough = maxValue / divisions
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = (NICE_FACTORS.find((factor) => factor >= normalized) ?? 10) * magnitude
  // O -1e-9 evita que uma soma de ponto flutuante vire um passo a mais.
  const max = Math.ceil(maxValue / step - 1e-9) * step
  return { max, step }
}

// Porcentagem de uma fatia sobre o total mostrado (inteiro). Fatia pequena e positiva vira "<1%", para não parecer zero.
export function sharePercentLabel(value: number, total: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return '0%'
  const percent = (value / total) * 100
  if (percent > 0 && percent < 1) return '<1%'
  return `${Math.round(percent)}%`
}

// Texto do chip de alavanca, em linguagem direta. Vazio quando a alavanca não muda nada (o chip não aparece).
export function leverResultText(delta: LeverDelta): string {
  if (delta.kind === 'faster') {
    return `meta em ${formatYears(delta.years ?? 0)} (${formatYears(delta.deltaYears ?? 0)} antes)`
  }
  if (delta.kind === 'reachable') return `passa a alcançar a meta em ${formatYears(delta.years ?? 0)}`
  if (delta.kind === 'value') return `chega a ${formatCompactBRL(delta.valueAtDeadline)} no prazo`
  return ''
}
