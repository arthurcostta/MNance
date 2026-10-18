// Casca fina do motor de projeção: busca os dados reais (usuário + ativos) e delega todo o cálculo para
// core/portfolioProjection.ts. Radar e painel de premissas leem do mesmo resultado, então não divergem.

import { useMemo } from 'react'
import type { User } from '../types/user'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { calculateProjectionMetrics, type ProjectionMetrics } from '../core/portfolioProjection'
import { DEFAULT_INFLATION_RATE } from '../core/inflation'
import {
  endsAtFromRemaining,
  formatEndMonthLabel,
  resolveRemainingMonths,
  yearMonthOf,
  type YearMonth,
} from '../core/installments'
import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  modelKeyForRiskProfile,
} from '../core/allocationModels'

export interface ProgrammedContributionData {
  name: string
  monthlyAmount: number
  usedNominalRate: number
  // Parcelas restantes (mês corrente incluso) e o mês da última, "mm/aaaa"; null = sem prazo.
  remainingMonths: number | null
  endsLabel: string | null
}

export interface ContributionAssumptionsData {
  committed: number
  free: number
  effectiveMonthly: number
  shortfall: number
  // Quanto subir a fatia de Investimentos (em p.p. da renda líquida) para cobrir o que falta; null sem renda.
  shortfallPercentPoints: number | null
  programmed: ProgrammedContributionData[]
}

export interface ProjectionAssumptionsData {
  assetCount: number
  startingPatrimony: number
  estimated: boolean
  rateSource: 'portfolio' | 'strategy'
  nominalRate: number
  realRate: number
  cappedAssets: ProjectionMetrics['rates']['cappedAssets']
  investmentsPlan: number
  // Aderência dos últimos check-ins (1 = 100%); aplicada a todos os aportes futuros.
  adherence: number
  inflationRate: number
  contributions: ContributionAssumptionsData
}

export interface ProjectionAssetSnapshot {
  name: string
  currentValue: number
  expectedReturnRate: number
  monthlyContribution?: number
  contributionEndsAt?: string
}

export interface BuildProjectionInput {
  assets: ProjectionAssetSnapshot[]
  currentUser: Pick<
    User,
    'currentPatrimony' | 'goalAmount' | 'goalYears' | 'riskProfile' | 'monthlyIncomeNet' | 'inflationRate'
  >
  investmentsPlan: number
  // Fração (1 = 100%). Escala o aporte planejado e os aportes programados juntos: a parte livre
  // continua sendo a diferença entre os dois, só que na mesma proporção.
  adherence: number
  today: YearMonth
}

// Cálculo puro do Radar: usado pelo hook e pela tela Investimentos (antes/depois de um check-in),
// para que os dois números nunca venham de caminhos diferentes.
export function buildProjectionMetrics({
  assets,
  currentUser,
  investmentsPlan,
  adherence,
  today,
}: BuildProjectionInput): ProjectionMetrics {
  const strategyNominalRate = calculateModelExpectedReturn(
    ALLOCATION_MODELS[modelKeyForRiskProfile(currentUser.riskProfile)]
  )
  const inflationRate = currentUser.inflationRate ?? DEFAULT_INFLATION_RATE

  return calculateProjectionMetrics({
    assets: assets.map((asset) => ({
      name: asset.name,
      currentValue: asset.currentValue,
      expectedReturnRate: asset.expectedReturnRate,
      ...(asset.monthlyContribution !== undefined
        ? {
            monthlyContribution: asset.monthlyContribution * adherence,
            remainingMonths: resolveRemainingMonths(asset.contributionEndsAt, today),
          }
        : {}),
    })),
    startingPatrimonyEstimate: currentUser.currentPatrimony,
    investmentsPlan: investmentsPlan * adherence,
    strategyNominalRate,
    inflationRate,
    goalAmount: currentUser.goalAmount,
    goalYears: currentUser.goalYears,
  })
}

export function useProjection(investmentsPlan: number, adherence = 1) {
  const { user, currentUser } = useAuth()
  const portfolio = usePortfolio(user?.uid)

  const inflationRate = currentUser?.inflationRate ?? DEFAULT_INFLATION_RATE

  const today = useMemo(() => yearMonthOf(new Date()), [])

  const metrics = useMemo(() => {
    if (!currentUser) return null
    return buildProjectionMetrics({
      assets: portfolio.assets,
      currentUser,
      investmentsPlan,
      adherence,
      today,
    })
  }, [currentUser, portfolio.assets, investmentsPlan, adherence, today])

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
        adherence,
        inflationRate,
        contributions: {
          committed: metrics.contributions.committed,
          free: metrics.contributions.free,
          effectiveMonthly: metrics.contributions.effectiveMonthly,
          shortfall: metrics.contributions.shortfall,
          shortfallPercentPoints:
            currentUser && currentUser.monthlyIncomeNet > 0
              ? (metrics.contributions.shortfall / currentUser.monthlyIncomeNet) * 100
              : null,
          programmed: metrics.contributions.programmed.map((item) => ({
            name: item.name ?? 'Ativo',
            monthlyAmount: item.monthlyAmount,
            usedNominalRate: item.usedNominalRate,
            remainingMonths: item.remainingMonths,
            endsLabel:
              item.remainingMonths === null
                ? null
                : formatEndMonthLabel(endsAtFromRemaining(item.remainingMonths, today)),
          })),
        },
      }
    : null

  return {
    metrics,
    assumptions,
    inflationRate,
    loading: !currentUser || portfolio.loadingInitial,
  }
}
