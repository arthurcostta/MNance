// Projeção do patrimônio com cenários e análise de lacuna (M5.8 Fase 3b). TS puro: sem React/Firebase.
//
// Um único motor (streamProjection.ts) alimenta tudo — tempo até a meta, gráfico, cenários e alavancas —,
// então os números exibidos não podem se contradizer. As variantes mudam só a taxa real (cenários),
// o tamanho do aporte (+20%) ou o crescimento do aporte (alavanca de 3% a.a.).

import { toRealRate } from './inflation'
import {
  calculateGoalTimelineFromStreams,
  simulateStreams,
  yearlySeries,
  type PatrimonyStream,
} from './streamProjection'

export const PROJECTION_HORIZON_YEARS = 60

// Nenhum ativo é projetado acima disso por décadas (pega Bitcoin 45% e taxas digitadas absurdas).
// Em termos nominais, para que inflação 0% continue significando "projeção nominal".
export const MAX_LONG_RUN_NOMINAL_RATE = 0.14

// Deslocamento do retorno REAL por cenário. O conservador cobre ≈ IR (~1 p.p.) + arrasto de volatilidade (~1 p.p.),
// já que os retornos do modelo são brutos; o otimista é menor porque o base já é otimista frente ao histórico.
export const SCENARIO_REAL_RATE_SHIFT = {
  conservative: -0.02,
  base: 0,
  optimistic: 0.01,
} as const

export const BOOST_FACTOR = 1.2
export const STEP_UP_RATE = 0.03

const MIN_CHART_YEARS = 10

export interface ProjectionAssetInput {
  name?: string
  currentValue: number
  expectedReturnRate: number
}

export interface CappedAsset {
  name?: string
  informedRate: number
  usedRate: number
}

export interface BlendedRates {
  nominalUsed: number
  realUsed: number
  source: 'portfolio' | 'strategy'
  cappedAssets: CappedAsset[]
}

// Taxa única da carteira: pondera por valor (já com o teto aplicado a cada ativo) e converte para real.
// Sem ativos (ou com valor total 0), usa a taxa da estratégia do perfil.
export function blendRates(
  assets: ProjectionAssetInput[],
  strategyNominalRate: number,
  inflationRate: number
): BlendedRates {
  const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0)

  if (assets.length === 0 || totalValue <= 0) {
    return {
      nominalUsed: strategyNominalRate,
      realUsed: toRealRate(strategyNominalRate, inflationRate),
      source: 'strategy',
      cappedAssets: [],
    }
  }

  const cappedAssets: CappedAsset[] = []
  let nominalUsed = 0

  for (const asset of assets) {
    const usedRate = Math.min(asset.expectedReturnRate, MAX_LONG_RUN_NOMINAL_RATE)
    nominalUsed += (asset.currentValue / totalValue) * usedRate

    if (asset.expectedReturnRate > MAX_LONG_RUN_NOMINAL_RATE) {
      cappedAssets.push({
        ...(asset.name !== undefined ? { name: asset.name } : {}),
        informedRate: asset.expectedReturnRate,
        usedRate,
      })
    }
  }

  return {
    nominalUsed,
    realUsed: toRealRate(nominalUsed, inflationRate),
    source: 'portfolio',
    cappedAssets,
  }
}

export interface ProjectionInput {
  assets: ProjectionAssetInput[]
  // Patrimônio informado no onboarding — só usado quando não há ativos cadastrados.
  startingPatrimonyEstimate: number
  // Aporte mensal planejado (fatia de Investimentos + saldo roteado), em valores de hoje.
  investmentsPlan: number
  // Retorno nominal da estratégia do perfil de risco (fallback sem ativos).
  strategyNominalRate: number
  inflationRate: number
  goalAmount: number
  goalYears: number
}

export interface ProjectionVariant {
  reachable: boolean
  // Anos até a meta dentro do horizonte; null = não alcançada.
  years: number | null
  // Snapshots anuais (ano 0..chartYears), em valores de hoje.
  series: number[]
  // Patrimônio projetado no prazo da meta (goalYears), mesmo se for além do gráfico.
  valueAtDeadline: number
}

export interface ProjectionMetrics {
  rates: BlendedRates
  estimated: boolean
  startingPatrimony: number
  base: ProjectionVariant
  conservative: ProjectionVariant
  optimistic: ProjectionVariant
  // Alavancas (null quando não há aporte para alavancar ou a meta já foi atingida).
  boosted: ProjectionVariant | null
  stepUp: ProjectionVariant | null
  chartYears: number
  horizonYears: number
  meetsDeadline: boolean
  // % da meta que o plano atual alcança no prazo (pode passar de 100).
  deadlineProgressPercent: number
  // Aporte mensal necessário para fechar a meta no prazo; 0 = já fecha sem aportar; null = inviável.
  requiredContribution: { base: number | null; conservative: number | null }
  // "O que entra por mês agora": aporte planejado + rendimento mensal nominal do patrimônio atual.
  velocity: number
}

interface VariantOptions {
  rateShift?: number
  contributionBoost?: number
  contributionGrowth?: number
  // Sobrescreve o aporte (usado na busca do aporte necessário).
  contributionAmount?: number
}

function buildStreams(
  rates: BlendedRates,
  startingPatrimony: number,
  investmentsPlan: number,
  options: VariantOptions = {}
): PatrimonyStream[] {
  const realRate = rates.realUsed + (options.rateShift ?? 0)
  const monthlyAmount = options.contributionAmount ?? investmentsPlan * (options.contributionBoost ?? 1)

  return [
    { initialBalance: startingPatrimony, monthlyAmount: 0, annualRate: realRate },
    {
      monthlyAmount,
      annualRate: realRate,
      ...(options.contributionGrowth ? { annualGrowth: options.contributionGrowth } : {}),
    },
  ]
}

function projectVariant(
  streams: PatrimonyStream[],
  goalAmount: number,
  goalYears: number,
  chartYears: number,
  horizonYears: number
): ProjectionVariant {
  const timeline = calculateGoalTimelineFromStreams({ streams, goalAmount, maxYears: horizonYears })
  const deadlineMonths = goalYears * 12

  return {
    reachable: timeline.reachable,
    years: timeline.years,
    series: yearlySeries(streams, chartYears),
    valueAtDeadline: simulateStreams(streams, deadlineMonths)[deadlineMonths] ?? 0,
  }
}

// Aporte mensal necessário para o patrimônio atingir a meta em goalYears. O patrimônio final é monótono no
// aporte, então uma bissecção sobre o próprio motor basta (sem segunda fórmula para divergir do gráfico).
function findRequiredContribution(
  rates: BlendedRates,
  startingPatrimony: number,
  goalAmount: number,
  goalYears: number,
  rateShift: number
): number | null {
  const months = goalYears * 12
  if (months <= 0) return null

  const finalValue = (contributionAmount: number) => {
    const streams = buildStreams(rates, startingPatrimony, 0, { rateShift, contributionAmount })
    return simulateStreams(streams, months)[months] ?? 0
  }

  if (finalValue(0) >= goalAmount) return 0

  // Aportar a meta inteira num único mês sempre basta; se nem isso fecha, é inviável.
  let high = goalAmount
  if (finalValue(high) < goalAmount) return null

  let low = 0
  for (let iteration = 0; iteration < 60; iteration++) {
    const middle = (low + high) / 2
    if (finalValue(middle) >= goalAmount) {
      high = middle
    } else {
      low = middle
    }
  }

  return Math.ceil(high)
}

export function calculateProjectionMetrics(input: ProjectionInput): ProjectionMetrics {
  const { assets, investmentsPlan, goalAmount, goalYears, inflationRate } = input

  const rates = blendRates(assets, input.strategyNominalRate, inflationRate)
  const estimated = rates.source === 'strategy'
  const startingPatrimony = estimated
    ? input.startingPatrimonyEstimate
    : assets.reduce((sum, asset) => sum + asset.currentValue, 0)

  const horizonYears = Math.max(PROJECTION_HORIZON_YEARS, goalYears)
  const stream = (options?: VariantOptions) => buildStreams(rates, startingPatrimony, investmentsPlan, options)

  // O horizonte do gráfico depende da resposta do cenário base: primeiro o tempo, depois a série.
  const baseTimeline = calculateGoalTimelineFromStreams({
    streams: stream(),
    goalAmount,
    maxYears: horizonYears,
  })
  const chartYears = Math.min(
    PROJECTION_HORIZON_YEARS,
    Math.max(MIN_CHART_YEARS, Math.ceil(Math.max(goalYears * 1.5, (baseTimeline.years ?? 0) * 1.15)))
  )

  const project = (options?: VariantOptions) =>
    projectVariant(stream(options), goalAmount, goalYears, chartYears, horizonYears)

  const base = project()
  const conservative = project({ rateShift: SCENARIO_REAL_RATE_SHIFT.conservative })
  const optimistic = project({ rateShift: SCENARIO_REAL_RATE_SHIFT.optimistic })

  const canLeverage = investmentsPlan > 0 && !(base.reachable && base.years === 0)
  const boosted = canLeverage ? project({ contributionBoost: BOOST_FACTOR }) : null
  const stepUp = canLeverage ? project({ contributionGrowth: STEP_UP_RATE }) : null

  const meetsDeadline = base.reachable && (base.years ?? 0) <= goalYears
  const monthlyNominalReturn = startingPatrimony * (Math.pow(1 + rates.nominalUsed, 1 / 12) - 1)

  return {
    rates,
    estimated,
    startingPatrimony,
    base,
    conservative,
    optimistic,
    boosted,
    stepUp,
    chartYears,
    horizonYears,
    meetsDeadline,
    deadlineProgressPercent: goalAmount > 0 ? (base.valueAtDeadline / goalAmount) * 100 : 100,
    requiredContribution: {
      base: findRequiredContribution(rates, startingPatrimony, goalAmount, goalYears, 0),
      conservative: findRequiredContribution(
        rates,
        startingPatrimony,
        goalAmount,
        goalYears,
        SCENARIO_REAL_RATE_SHIFT.conservative
      ),
    },
    velocity: investmentsPlan + monthlyNominalReturn,
  }
}
