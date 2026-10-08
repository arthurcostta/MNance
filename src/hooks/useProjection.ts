// Casca fina do motor de projeção: busca os dados reais (usuário + ativos) e delega todo o cálculo para
// core/portfolioProjection.ts. Radar e painel de premissas leem do mesmo resultado, então não divergem.

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { calculateProjectionMetrics, type ProjectionMetrics } from '../core/portfolioProjection'
import { DEFAULT_INFLATION_RATE } from '../core/inflation'
import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  modelKeyForRiskProfile,
} from '../core/allocationModels'

export interface ProjectionAssumptionsData {
  assetCount: number
  startingPatrimony: number
  estimated: boolean
  rateSource: 'portfolio' | 'strategy'
  nominalRate: number
  realRate: number
  cappedAssets: ProjectionMetrics['rates']['cappedAssets']
  investmentsPlan: number
  inflationRate: number
}

export function useProjection(investmentsPlan: number) {
  const { user, currentUser } = useAuth()
  const portfolio = usePortfolio(user?.uid)

  const inflationRate = currentUser?.inflationRate ?? DEFAULT_INFLATION_RATE

  const metrics = useMemo(() => {
    if (!currentUser) return null

    const strategyNominalRate = calculateModelExpectedReturn(
      ALLOCATION_MODELS[modelKeyForRiskProfile(currentUser.riskProfile)]
    )

    return calculateProjectionMetrics({
      assets: portfolio.assets.map((asset) => ({
        name: asset.name,
        currentValue: asset.currentValue,
        expectedReturnRate: asset.expectedReturnRate,
      })),
      startingPatrimonyEstimate: currentUser.currentPatrimony,
      investmentsPlan,
      strategyNominalRate,
      inflationRate,
      goalAmount: currentUser.goalAmount,
      goalYears: currentUser.goalYears,
    })
  }, [currentUser, portfolio.assets, investmentsPlan, inflationRate])

  const assumptions: ProjectionAssumptionsData | null = metrics
    ? {
        assetCount: portfolio.assets.length,
        startingPatrimony: metrics.startingPatrimony,
        estimated: metrics.estimated,
        rateSource: metrics.rates.source,
        nominalRate: metrics.rates.nominalUsed,
        realRate: metrics.rates.realUsed,
        cappedAssets: metrics.rates.cappedAssets,
        investmentsPlan,
        inflationRate,
      }
    : null

  return {
    metrics,
    assumptions,
    inflationRate,
    loading: !currentUser || portfolio.loadingInitial,
  }
}
