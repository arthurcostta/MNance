// Histórico do patrimônio ao longo do tempo (tela Portfólio). TS puro, sem React nem Firebase: o core não
// conhece o Firestore, então recebe só o que precisa (status e valor, mês e total).
//
// O app guarda um retrato por mês (users/{uid}/patrimonySnapshots/{YYYY-MM}). Um mês sem retrato repete o
// saldo do mês anterior e aparece marcado como `carried`: é um saldo mantido, não uma medição.

import { formatYearMonth, parseYearMonth, type YearMonth } from './installments'
import { niceAxis } from './radarView'

export interface AssetTotalInput {
  status: string
  currentValue: number
  // Fora do crescimento (ex.: consórcio imobiliário) não entra no patrimônio registrado.
  excludedFromGrowth?: boolean
}

export interface PatrimonySnapshotInput {
  month: string // 'YYYY-MM'
  total: number
}

export interface HistoryPoint {
  month: string // 'YYYY-MM'
  label: string // 'MM/AA'
  total: number
  // true = mês sem retrato gravado; o valor é o do mês anterior, repetido.
  carried: boolean
}

export interface HistorySummary {
  firstLabel: string
  delta: number
  // null quando o primeiro valor é zero ou negativo (a variação em % não faz sentido).
  percent: number | null
  // Quantos meses separam o primeiro do último ponto.
  months: number
}

// Soma dos ativos que contam para o crescimento (ativos e fora do crescimento ficam de fora), arredondada a
// centavos. null quando nenhum conta (não grava zero).
export function activeAssetsTotal(assets: AssetTotalInput[]): number | null {
  let cents = 0
  let count = 0
  for (const asset of assets) {
    if (asset.status !== 'active' || asset.excludedFromGrowth === true || !Number.isFinite(asset.currentValue)) continue
    cents += Math.round(asset.currentValue * 100)
    count += 1
  }
  return count === 0 ? null : cents / 100
}

// 'AAAA-MM' → 'MM/AA' (ex.: '2026-11' → '11/26'). Entrada inválida volta como veio.
export function formatMonthLabel(month: string): string {
  const parsed = parseYearMonth(month)
  if (!parsed) return month
  return `${String(parsed.month).padStart(2, '0')}/${String(parsed.year % 100).padStart(2, '0')}`
}

function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1)
}

function fromIndex(index: number): YearMonth {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// Série mensal do patrimônio, do primeiro retrato até o mês corrente.
//  - liveTotal: o total vivo agora (null = sem ativo ativo). Quando existe, ele é o ponto do mês corrente
//    (é o mesmo número do cartão do topo, mesmo antes de o retrato do mês ser regravado).
//  - Sem liveTotal, a série termina no último retrato: não se inventa um ponto para o mês corrente.
//  - Retrato duplicado no mesmo mês: vale o último da lista.
export function buildHistorySeries(
  snapshots: PatrimonySnapshotInput[],
  current: YearMonth,
  liveTotal: number | null
): HistoryPoint[] {
  const byIndex = new Map<number, number>()
  for (const snapshot of snapshots) {
    const parsed = parseYearMonth(snapshot.month)
    if (!parsed || !Number.isFinite(snapshot.total)) continue
    byIndex.set(monthIndex(parsed), snapshot.total)
  }

  const recorded = [...byIndex.keys()].sort((a, b) => a - b)
  const currentIndex = monthIndex(current)
  const live = liveTotal !== null && Number.isFinite(liveTotal) ? liveTotal : null

  if (recorded.length === 0 && live === null) return []

  const first = recorded.length > 0 ? recorded[0]! : currentIndex
  const last = recorded.length > 0 ? recorded[recorded.length - 1]! : currentIndex
  const start = live !== null ? Math.min(first, currentIndex) : first
  const end = live !== null ? Math.max(last, currentIndex) : last

  const points: HistoryPoint[] = []
  let previous = 0

  for (let index = start; index <= end; index += 1) {
    const own = byIndex.get(index)
    let total: number
    let carried: boolean

    if (index === currentIndex && live !== null) {
      total = live
      carried = false
    } else if (own !== undefined) {
      total = own
      carried = false
    } else {
      // Sem retrato neste mês: repete o saldo anterior. O primeiro mês da série sempre tem retrato
      // (ou é o mês corrente com liveTotal), então há sempre um valor anterior.
      total = previous
      carried = true
    }

    const month = formatYearMonth(fromIndex(index))
    points.push({ month, label: formatMonthLabel(month), total, carried })
    previous = total
  }

  return points
}

// Resumo do que mudou desde o primeiro ponto. null quando não há pontos.
export function summarizeHistory(points: HistoryPoint[]): HistorySummary | null {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return null
  const delta = last.total - first.total
  return {
    firstLabel: first.label,
    delta,
    percent: first.total > 0 ? (delta / first.total) * 100 : null,
    months: points.length - 1,
  }
}

// Eixo do gráfico sem começar em zero (a variação precisa aparecer). Os degraus são redondos (niceAxis).
export function historyAxis(values: number[]): { min: number; max: number; step: number } {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return { min: 0, max: 1, step: 1 }

  const low = Math.min(...finite)
  const high = Math.max(...finite)
  const spread = high - low
  // Série plana (ou um ponto só): folga de 10% do valor, para a linha não ficar colada na borda.
  const pad = spread > 0 ? spread * 0.2 : Math.max(Math.abs(high) * 0.1, 1)

  const rawMin = Math.max(0, low - pad)
  const rawMax = high + pad
  const { step } = niceAxis(rawMax - rawMin)
  const min = Math.floor(rawMin / step + 1e-9) * step
  const max = Math.ceil(rawMax / step - 1e-9) * step
  return { min, max: Math.max(max, min + step), step }
}
