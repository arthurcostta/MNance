// Apresentação do Radar (22/10/2026): posições e deltas para os elementos visuais. TS puro, sem números novos:
// só reorganiza o que o motor já calculou.

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
