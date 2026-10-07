/**
 * Gancho de projeção: combina ativos reais + aporte planejado + modelagem de inflação
 * para uma simulação única e confiável do patrimônio futuro (Motor por Fluxos).
 *
 * Fase 3 (M5.8): corrige o Radar que antes usava renda - custo essencial como proxy.
 * Agora a projeção é baseada em ativos reais + plano de distribuição.
 */

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { usePortfolio } from './usePortfolio'
import { calculateGoalTimelineFromStreams, yearlySeries, type PatrimonyStream } from '../core/streamProjection'
import { toRealRate, DEFAULT_INFLATION_RATE } from '../core/inflation'
import { calculateModelExpectedReturn, modelKeyForRiskProfile, ALLOCATION_MODELS } from '../core/allocationModels'
import type { GoalTimelineResult } from '../core/goalTimeline'

interface ProjectionMetrics {
  base: GoalTimelineResult
  boosted: GoalTimelineResult | null
  showBoostInsight: boolean
  series: number[]
  boostedSeries: number[] | null
  velocity: number
  meetsDeadline: boolean
  deadlineGapYears: number | null
}

/**
 * Constrói os fluxos de patrimônio para a projeção
 * @param assets Ativos reais do portfólio
 * @param startingPatrimonyEstimate Patrimônio inicial caso sem ativos cadastrados
 * @param investmentsPlan Aporte mensal planejado (fatia + saldo roteado)
 * @param contributionRate Taxa de retorno do aporte livre (média ponderada carteira ou estratégia)
 * @param assetClassFallbackRate Taxa padrão se não tiver ativos e sem estratégia
 * @param inflationRate Taxa de inflação (para conversão para taxa real)
 * @param boost Multiplicador do aporte livre (1 = base, 1.2 = +20%)
 */
function buildProjectionStreams(
  assets: Array<{ currentValue: number; expectedReturnRate: number }> | null,
  startingPatrimonyEstimate: number | undefined,
  investmentsPlan: number,
  contributionRate: number,
  assetClassFallbackRate: number | undefined,
  inflationRate: number,
  boost: number = 1
): { streams: PatrimonyStream[]; estimated: boolean } {
  const streams: PatrimonyStream[] = []
  let estimated = false

  const realContributionRate = toRealRate(contributionRate, inflationRate)

  // Se há ativos cadastrados, cada um é um fluxo com sua taxa própria
  if (assets && assets.length > 0) {
    for (const asset of assets) {
      streams.push({
        initialBalance: asset.currentValue,
        monthlyAmount: 0, // ativos não recebem aporte novo (a projeção é do que já existe)
        annualRate: toRealRate(asset.expectedReturnRate, inflationRate),
      })
    }
  } else if (startingPatrimonyEstimate && startingPatrimonyEstimate > 0) {
    // Sem ativos, usa o patrimônio inicial (do onboarding) como único fluxo
    // e estima a taxa via estratégia
    estimated = true
    const fallbackRate = assetClassFallbackRate ?? 0
    streams.push({
      initialBalance: startingPatrimonyEstimate,
      monthlyAmount: 0,
      annualRate: toRealRate(fallbackRate, inflationRate),
    })
  }

  // Aporte planejado (flexível) rende à taxa escolhida
  streams.push({
    monthlyAmount: (investmentsPlan * boost),
    annualRate: realContributionRate,
  })

  return { streams, estimated }
}

/**
 * Calcula métricas da projeção a partir dos fluxos
 */
function calculateProjectionMetrics(
  streams: PatrimonyStream[],
  boostedStreams: PatrimonyStream[],
  startingPatrimony: number,
  investmentsPlan: number,
  nominalContributionRate: number,
  goalAmount: number,
  goalYears: number,
  _inflationRate: number
): ProjectionMetrics {
  const base = calculateGoalTimelineFromStreams({
    streams,
    goalAmount,
    maxYears: 100,
  })

  // Decidir se mostra o insight "+20%"
  const boostedTimeline = calculateGoalTimelineFromStreams({
    streams: boostedStreams,
    goalAmount,
    maxYears: 100,
  })

  // Suprime se: aporte flexible é 0, ou meta já atingida, ou resultado idêntico
  const showBoostInsight =
    investmentsPlan > 0 &&
    !(base.reachable && (base.months ?? 0) === 0) &&
    (boostedTimeline.years ?? 100) !== (base.years ?? 100)

  // Velocidade = o que entra agora (aporte planejado + rendimento do patrimônio atual na taxa nominal)
  const monthlyNominalReturn = startingPatrimony * ((Math.pow(1 + nominalContributionRate, 1 / 12) - 1))
  const velocity = investmentsPlan + monthlyNominalReturn

  // Série anual
  const series = yearlySeries(streams, 100)
  const boostedSeries = showBoostInsight ? yearlySeries(boostedStreams, 100) : null

  // Bate o prazo?
  const meetsDeadline = base.reachable && (base.years ?? 0) <= goalYears
  const deadlineGapYears = meetsDeadline ? null : (base.years ?? 100) - goalYears

  return {
    base,
    boosted: showBoostInsight ? boostedTimeline : null,
    showBoostInsight,
    series,
    boostedSeries,
    velocity,
    meetsDeadline,
    deadlineGapYears,
  }
}

/**
 * Hook useProjection: compõe todos os dados e oferece uma projeção única
 */
export function useProjection(investmentsPlan: number) {
  const { user, currentUser } = useAuth()
  const portfolio = usePortfolio(user?.uid)

  const inflationRate = currentUser?.inflationRate ?? DEFAULT_INFLATION_RATE

  const metrics = useMemo(() => {
    if (!currentUser) return null

    // Define a taxa do aporte livre (retorno da carteira real ou estratégia fallback)
    let contributionRate = 0

    if (portfolio.totalValue > 0 && portfolio.weightedReturn !== undefined) {
      // Tem ativos reais: usa a taxa média da carteira
      contributionRate = portfolio.weightedReturn
    } else {
      // Sem ativos: usa a taxa da estratégia do perfil de risco
      const modelKey = modelKeyForRiskProfile(currentUser.riskProfile as any)
      const model = ALLOCATION_MODELS[modelKey]
      contributionRate = calculateModelExpectedReturn(model)
    }

    // Constrói os fluxos
    const { streams } = buildProjectionStreams(
      portfolio.totalValue > 0
        ? portfolio.assets?.map((a) => ({
            currentValue: a.currentValue,
            expectedReturnRate: a.expectedReturnRate,
          })) ?? []
        : null,
      currentUser.currentPatrimony,
      investmentsPlan,
      contributionRate,
      undefined,
      inflationRate,
      1
    )

    // Constrói os fluxos boosted
    const { streams: boostedStreams } = buildProjectionStreams(
      portfolio.totalValue > 0
        ? portfolio.assets?.map((a) => ({
            currentValue: a.currentValue,
            expectedReturnRate: a.expectedReturnRate,
          })) ?? []
        : null,
      currentUser.currentPatrimony,
      investmentsPlan,
      contributionRate,
      undefined,
      inflationRate,
      1.2
    )

    // Calcula as métricas
    return calculateProjectionMetrics(
      streams,
      boostedStreams,
      portfolio.totalValue || currentUser.currentPatrimony || 0,
      investmentsPlan,
      contributionRate,
      currentUser.goalAmount,
      currentUser.goalYears,
      inflationRate
    )
  }, [currentUser, portfolio.totalValue, portfolio.assets, portfolio.weightedReturn, inflationRate, investmentsPlan])

  return {
    metrics,
    isEstimatedRate: portfolio.totalValue === 0,
    inflationRate,
    loading: !currentUser || portfolio.loadingInitial,
  }
}
