// Centraliza os modelos de alocação usados por Distribuição (#13), Recomendação (#7)
// e Priorização (#11) — única fonte de verdade, evita o drift que existia no PRD
// entre "All Weather" (seções 4.1/5) e a definição correta (seção 4.7).
// Ver decisão arquitetural: C02 - IA/Claude/Decissoes-e-Historico/2026-09-04_MNance-Arquitetura-v1.md

export type AllocationModelKey = 'ALL_WEATHER' | 'CONSERVATIVE' | 'AGGRESSIVE'

export interface AllocationModel {
  label: string
  stocks: number
  bonds: number
  alternatives: number
  cash: number
}

export const ALLOCATION_MODELS: Record<AllocationModelKey, AllocationModel> = {
  ALL_WEATHER: {
    label: 'All Weather (Ray Dalio)',
    stocks: 0.3,
    bonds: 0.4,
    alternatives: 0.2,
    cash: 0.1,
  },
  CONSERVATIVE: {
    label: 'Conservador',
    stocks: 0.5,
    bonds: 0.3,
    alternatives: 0.15,
    cash: 0.05,
  },
  AGGRESSIVE: {
    label: 'Agressivo',
    stocks: 0.7,
    bonds: 0.2,
    alternatives: 0.1,
    cash: 0,
  },
}
