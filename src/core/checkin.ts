// Check-in mensal de investimentos (M5.9). TS puro: sem Firebase, sem React.

export type CheckinStatus = 'on_plan' | 'below' | 'above' | 'skipped'

// Tolerância de R$ 1,00: diferença de centavos não vira "investi menos".
export const CHECKIN_TOLERANCE = 1

export function deriveCheckinStatus(planned: number, invested: number): CheckinStatus {
  const diff = invested - planned
  if (Math.abs(diff) < CHECKIN_TOLERANCE) return 'on_plan'
  return diff < 0 ? 'below' : 'above'
}

export interface AnsweredCheckin {
  plannedTotal: number
  investedTotal: number
  status: CheckinStatus
}

export const ADHERENCE_WINDOW = 3
export const ADHERENCE_MIN = 0
export const ADHERENCE_MAX = 1.5

// Média de investido ÷ programado dos últimos `window` check-ins respondidos (mais recentes primeiro).
// "Não investi" conta como 0%. Sem histórico = 100%: não penaliza quem ainda não respondeu nada.
export function calculateAdherence(checkins: AnsweredCheckin[], window = ADHERENCE_WINDOW): number {
  const ratios = checkins
    .filter((c) => c.plannedTotal > 0)
    .slice(0, window)
    .map((c) => c.investedTotal / c.plannedTotal)
  if (ratios.length === 0) return 1
  const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
  return Math.min(ADHERENCE_MAX, Math.max(ADHERENCE_MIN, average))
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

// Divide o plano mensal entre os dias de investir. Com 2 dias e 2 pagamentos, segue a renda de cada
// pagamento (% do 1º); com 2 dias sem 2º pagamento, 50/50. A soma fecha exata em centavos.
export function splitPlanAcrossDays(
  plan: number,
  dayCount: number,
  firstPaydayShare: number | null
): number[] {
  if (dayCount <= 1) return [roundCents(plan)]
  const share = firstPaydayShare ?? 50
  const first = roundCents((plan * share) / 100)
  return [first, roundCents(plan - first)]
}

export interface ClassAmounts {
  stocks: number
  bonds: number
  alternatives: number
  cash: number
}

// Sugestão (nunca automática): distribui o aporte do mês pelas classes que estão mais abaixo da
// composição-alvo, para a carteira se aproximar do modelo. Soma = aporte; nunca negativa.
export function calculateGuidedContribution(
  currentByClass: ClassAmounts,
  targetFractions: ClassAmounts,
  amount: number
): ClassAmounts {
  const keys: (keyof ClassAmounts)[] = ['stocks', 'bonds', 'alternatives', 'cash']
  const empty: ClassAmounts = { stocks: 0, bonds: 0, alternatives: 0, cash: 0 }
  if (amount <= 0) return empty

  const total = keys.reduce((sum, k) => sum + currentByClass[k], 0) + amount
  const gaps = keys.map((k) => Math.max(0, targetFractions[k] * total - currentByClass[k]))
  const gapSum = gaps.reduce((sum, g) => sum + g, 0)

  // Carteira vazia ou já acima do alvo em todas as classes: segue a própria composição-alvo.
  const weights = gapSum > 0 ? gaps : keys.map((k) => targetFractions[k])
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  if (weightSum <= 0) return empty

  const result = { ...empty }
  let allocated = 0
  keys.forEach((k, i) => {
    const value = roundCents((amount * weights[i]!) / weightSum)
    result[k] = value
    allocated += value
  })
  // O arredondamento pode deixar centavos de diferença: vai para a maior fatia.
  const largest = keys.reduce((best, k) => (result[k] > result[best] ? k : best), keys[0]!)
  result[largest] = roundCents(result[largest] + (amount - allocated))
  return result
}
