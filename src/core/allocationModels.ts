// Centraliza os modelos de alocação usados por Distribuição (#13), Recomendação (#7)
// e Priorização (#11) — única fonte de verdade, evita o drift que existia no PRD
// entre "All Weather" (seções 4.1/5) e a definição correta (seção 4.7).
// Ver decisão arquitetural: C02 - IA/Claude/Decissoes-e-Historico/2026-09-04_MNance-Arquitetura-v1.md

import { ASSET_RETURN_RATES, type AssetClass } from './assetReturnRates'
import { calculateWeightedReturn } from './weightedReturn'

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

// Feature #7 (Recomendação de Alocação) — retorno esperado de um modelo, derivado da taxa
// média por classe do catálogo já existente (assetReturnRates.ts), nunca uma taxa nova
// hardcoded — evita duplicar premissas de retorno em dois lugares do código.
// Exclui instrumentos com inClassAverage: false (ex: Bitcoin, outliers).
function averageRateByClass(assetClass: AssetClass): number {
  const rates = Object.values(ASSET_RETURN_RATES).filter(
    (r) => r.assetClass === assetClass && (r.inClassAverage !== false)
  )
  if (rates.length === 0) return 0
  return rates.reduce((sum, r) => sum + r.annualRate, 0) / rates.length
}

// M5.8 Fase 3: mapeia o tipo de risco do usuário para a chave de modelo. Usada quando não
// há ativos cadastrados e precisamos de uma taxa default para a projeção.
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

export function modelKeyForRiskProfile(profile: RiskProfile): AllocationModelKey {
  switch (profile) {
    case 'conservative':
      return 'CONSERVATIVE'
    case 'moderate':
      return 'ALL_WEATHER'
    case 'aggressive':
      return 'AGGRESSIVE'
  }
}

export function calculateModelExpectedReturn(model: AllocationModel): number {
  return calculateWeightedReturn([
    { amount: model.stocks, expectedReturnRate: averageRateByClass('stocks') },
    { amount: model.bonds, expectedReturnRate: averageRateByClass('bonds') },
    { amount: model.alternatives, expectedReturnRate: averageRateByClass('alternatives') },
    { amount: model.cash, expectedReturnRate: averageRateByClass('cash') },
  ])
}

// M5.6: Classifica a oscilação de um modelo baseado no peso em ações.
// Heurística simples: menos ações = menor oscilação = mais conservador.
export type OscillationLevel = 'low' | 'medium' | 'high'

export function classifyModelOscillation(model: AllocationModel): OscillationLevel {
  if (model.stocks <= 0.4) return 'low'
  if (model.stocks <= 0.6) return 'medium'
  return 'high'
}
