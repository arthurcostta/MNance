// Feature #11 (Priorização) — classifica um gasto em quatro níveis de alinhamento.
//
// O PRD não define uma regra determinística para isso, só exemplos — o mapa categoria→
// alinhamento e a ordem de prioridade abaixo são uma decisão de design desta implementação,
// não uma regra extraída do PRD:
//   1. userOverride, se presente, sempre vence (usuário conhece o próprio contexto melhor
//      que qualquer heurística — CENÁRIO 53).
//   2. Sem override, isZombie vence a categoria (um gasto zumbi é desalinhado por definição,
//      independente do que a categoria sugeriria).
//   3. Sem override nem zumbi, usa o mapa fixo de categoria.
//   4. Categoria desconhecida cai em 'discussible' — fallback seguro que deixa a decisão
//      para o usuário em vez de presumir.

export type ExpenseAlignment = 'essential' | 'quality' | 'discussible' | 'misaligned'

export interface ExpenseClassificationInput {
  category: string
  isZombie: boolean
  userOverride?: ExpenseAlignment
}

const CATEGORY_ALIGNMENT_MAP: Record<string, ExpenseAlignment> = {
  housing: 'essential',
  food: 'essential',
  transport: 'essential',
  utilities: 'essential',
  health_basic: 'essential',
  education: 'quality',
  fitness: 'quality',
  courses: 'quality',
  health_dev: 'quality',
  entertainment: 'discussible',
  leisure: 'discussible',
  subscriptions_misc: 'discussible',
}

export function classifyExpense({
  category,
  isZombie,
  userOverride,
}: ExpenseClassificationInput): ExpenseAlignment {
  if (userOverride) {
    return userOverride
  }

  if (isZombie) {
    return 'misaligned'
  }

  return CATEGORY_ALIGNMENT_MAP[category] ?? 'discussible'
}
