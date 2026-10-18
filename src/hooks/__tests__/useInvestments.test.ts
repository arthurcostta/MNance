import { describe, it, expect } from 'vitest'
import {
  answeredHistory,
  buildAssetPlanRows,
  buildCheckinSlots,
  summarizeCheckinEffect,
} from '../useInvestments'
import type { InvestmentCheckinWithId } from '../../types/checkin'
import type { AssetWithId } from '../../types/asset'
import { buildProjectionMetrics } from '../useProjection'

const asset = (over: Partial<AssetWithId> & { id: string; name: string }): AssetWithId =>
  ({
    assetClass: 'bonds',
    currentValue: 1000,
    expectedReturnRate: 0.1,
    status: 'active',
    ...over,
  }) as AssetWithId

const checkin = (id: string, planned: number, invested: number): InvestmentCheckinWithId =>
  ({
    id,
    month: id.slice(0, 7),
    slot: Number(id.slice(-1)),
    day: 1,
    plannedTotal: planned,
    investedTotal: invested,
    status: invested < planned ? 'below' : 'on_plan',
    allocations: [],
  }) as unknown as InvestmentCheckinWithId

const today = { year: 2026, month: 10, day: 15 }

describe('buildCheckinSlots', () => {
  it('um dia que já chegou e não foi respondido fica aberto', () => {
    const [slot] = buildCheckinSlots({
      today,
      investmentDays: [15],
      investmentsPlan: 2713.53,
      firstPaydayShare: null,
      checkins: [],
    })
    expect(slot?.state).toBe('open')
    expect(slot?.plannedTotal).toBe(2713.53)
  })

  it('dia futuro fica "upcoming"', () => {
    const [slot] = buildCheckinSlots({
      today,
      investmentDays: [20],
      investmentsPlan: 1000,
      firstPaydayShare: null,
      checkins: [],
    })
    expect(slot?.state).toBe('upcoming')
  })

  it('check-in já respondido aparece como "answered", com o id do mês e slot', () => {
    const [slot] = buildCheckinSlots({
      today,
      investmentDays: [5],
      investmentsPlan: 1000,
      firstPaydayShare: null,
      checkins: [checkin('2026-10-1', 1000, 1000)],
    })
    expect(slot?.state).toBe('answered')
    expect(slot?.checkin?.id).toBe('2026-10-1')
  })

  it('"fim do mês" vence no último dia útil do mês', () => {
    const [slot] = buildCheckinSlots({
      today,
      investmentDays: [],
      investmentsPlan: 1000,
      firstPaydayShare: null,
      checkins: [],
    })
    expect(slot?.effective).toEqual({ year: 2026, month: 10, day: 30 })
    expect(slot?.state).toBe('upcoming')
  })

  it('dia no fim de semana cai no próximo dia útil (dia 17 é sábado → 19)', () => {
    const [slot] = buildCheckinSlots({
      today: { year: 2026, month: 10, day: 19 },
      investmentDays: [17],
      investmentsPlan: 1000,
      firstPaydayShare: null,
      checkins: [],
    })
    expect(slot?.effective.day).toBe(19)
    expect(slot?.state).toBe('open')
  })

  it('dois dias dividem o plano pela renda de cada pagamento (61,2% no 1º) e somam o total', () => {
    const slots = buildCheckinSlots({
      today,
      investmentDays: [5, 20],
      investmentsPlan: 2878.8,
      firstPaydayShare: 61.2,
      checkins: [],
    })
    expect(slots).toHaveLength(2)
    expect(slots[0]?.plannedTotal).toBeCloseTo(1761.83, 2)
    expect((slots[0]?.plannedTotal ?? 0) + (slots[1]?.plannedTotal ?? 0)).toBeCloseTo(2878.8, 2)
  })
})

describe('buildAssetPlanRows', () => {
  const consorcio = asset({
    id: 'c1',
    name: 'Consórcio',
    monthlyContribution: 1500,
    contributionEndsAt: '2031-09',
  })
  const etf = asset({ id: 'e1', name: 'ETF' })

  it('a parcela programada é pré-preenchida só no 1º dia de investir', () => {
    const first = buildAssetPlanRows([consorcio, etf], 1, today)
    const second = buildAssetPlanRows([consorcio, etf], 2, today)

    expect(first.rows.find((r) => r.assetId === 'c1')?.planned).toBe(1500)
    expect(first.programmedTotal).toBe(1500)
    expect(second.programmedTotal).toBe(0)
  })

  it('consórcio encerrado não é pré-preenchido', () => {
    const ended = asset({ id: 'c2', name: 'Velho', monthlyContribution: 500, contributionEndsAt: '2026-09' })
    expect(buildAssetPlanRows([ended], 1, today).programmedTotal).toBe(0)
  })
})

describe('answeredHistory', () => {
  it('mais recente primeiro, pela ordem do id mês-slot', () => {
    const history = answeredHistory([checkin('2026-09-1', 1, 1), checkin('2026-10-2', 1, 0), checkin('2026-10-1', 1, 1)])
    expect(history.map((h) => h.investedTotal)).toEqual([0, 1, 1])
  })
})

describe('summarizeCheckinEffect (antes × depois)', () => {
  const currentUser = {
    currentPatrimony: 0,
    goalAmount: 20_000_000,
    goalYears: 30,
    riskProfile: 'moderate' as const,
    monthlyIncomeNet: 5781,
    inflationRate: 0.045,
  }

  it('o patrimônio sobe exatamente o investido, inclusive com ativo novo', () => {
    const before = [asset({ id: 'a', name: 'CDB', currentValue: 10_000 })]
    const after = [
      asset({ id: 'a', name: 'CDB', currentValue: 11_000 }),
      asset({ id: 'n', name: 'Tesouro', currentValue: 2_000 }),
    ]
    const effect = summarizeCheckinEffect({
      beforeAssets: before,
      afterAssets: after,
      beforeCheckins: [],
      afterCheckins: [checkin('2026-10-1', 3000, 3000)],
      currentUser,
      investmentsPlan: 3000,
      today: { year: 2026, month: 10 },
    })
    expect(effect.patrimonyBefore).toBe(10_000)
    expect(effect.patrimonyAfter).toBe(13_000)
    expect(effect.investedTotal).toBe(3000)
  })

  it('mais patrimônio não atrasa o prazo: o tempo até a meta diminui ou fica igual', () => {
    const before = [asset({ id: 'a', name: 'CDB', currentValue: 50_000 })]
    const after = [asset({ id: 'a', name: 'CDB', currentValue: 60_000 })]
    const effect = summarizeCheckinEffect({
      beforeAssets: before,
      afterAssets: after,
      beforeCheckins: [],
      afterCheckins: [],
      currentUser,
      investmentsPlan: 2000,
      today: { year: 2026, month: 10 },
    })
    expect(effect.yearsAfter ?? Infinity).toBeLessThanOrEqual(effect.yearsBefore ?? Infinity)
  })
})


describe('aderência na projeção', () => {
  const user = {
    currentPatrimony: 0,
    goalAmount: 20_000_000,
    goalYears: 30,
    riskProfile: 'moderate' as const,
    monthlyIncomeNet: 5781,
    inflationRate: 0.045,
  }
  const assets = [{ name: 'CDB', currentValue: 40_000, expectedReturnRate: 0.11 }]

  it('aderência 50% reduz o valor no prazo e alonga o tempo até a meta', () => {
    const full = buildProjectionMetrics({
      assets,
      currentUser: user,
      investmentsPlan: 2000,
      adherence: 1,
      today: { year: 2026, month: 10 },
    })
    const half = buildProjectionMetrics({
      assets,
      currentUser: user,
      investmentsPlan: 2000,
      adherence: 0.5,
      today: { year: 2026, month: 10 },
    })
    expect(half.base.valueAtDeadline).toBeLessThan(full.base.valueAtDeadline)
    expect((half.base.years ?? Infinity)).toBeGreaterThanOrEqual(full.base.years ?? Infinity)
  })

  it('aderência 100% é idêntica a não informar aderência (sem histórico)', () => {
    const a = buildProjectionMetrics({ assets, currentUser: user, investmentsPlan: 2000, adherence: 1, today: { year: 2026, month: 10 } })
    const b = buildProjectionMetrics({ assets, currentUser: user, investmentsPlan: 2000, adherence: 1, today: { year: 2026, month: 10 } })
    expect(a.base.valueAtDeadline).toBe(b.base.valueAtDeadline)
  })
})

describe('regras do fechamento (alinhadas ao Radar)', () => {
  const currentUser = {
    currentPatrimony: 10_000,
    goalAmount: 20_000_000,
    goalYears: 30,
    riskProfile: 'moderate' as const,
    monthlyIncomeNet: 5781,
    inflationRate: 0.045,
  }

  it('ativo arquivado não entra no patrimônio nem na projeção depois do check-in', () => {
    const archived = { ...asset({ id: 'x', name: 'Consórcio antigo', currentValue: 100 }), status: 'archived' as const, monthlyContribution: 1500 }
    const effect = summarizeCheckinEffect({
      beforeAssets: [asset({ id: 'a', name: 'CDB', currentValue: 10_000 })],
      afterAssets: [asset({ id: 'a', name: 'CDB', currentValue: 11_000 }), archived],
      beforeCheckins: [],
      afterCheckins: [],
      currentUser,
      investmentsPlan: 2000,
      today: { year: 2026, month: 10 },
    })
    expect(effect.patrimonyAfter).toBe(11_000)
    expect(effect.investedTotal).toBe(1000)
  })

  it('sem ativos, o "antes" é a estimativa do onboarding (igual ao Radar) e fica marcado', () => {
    const effect = summarizeCheckinEffect({
      beforeAssets: [],
      afterAssets: [asset({ id: 'n', name: 'CDB novo', currentValue: 500 })],
      beforeCheckins: [],
      afterCheckins: [],
      currentUser,
      investmentsPlan: 2000,
      today: { year: 2026, month: 10 },
    })
    expect(effect.estimatedBefore).toBe(true)
    expect(effect.patrimonyBefore).toBe(10_000)
    expect(effect.patrimonyAfter).toBe(500)
  })
})

