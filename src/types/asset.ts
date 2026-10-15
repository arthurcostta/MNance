import type { Timestamp } from 'firebase/firestore'

export type AssetClass = 'stocks' | 'bonds' | 'alternatives' | 'cash'
export type AssetStatus = 'active' | 'archived'

export interface Asset {
  name: string
  assetClass: AssetClass
  currentValue: number
  expectedReturnRate: number
  // Aporte mensal programado deste ativo (R$, valores de hoje), ex.: parcela de consórcio. Sai da fatia de
  // Investimentos; ausente = sem aporte programado.
  monthlyContribution?: number
  // Mês da última parcela ('YYYY-MM', inclusive). Ausente = aporte permanente. Guarda-se o mês final, não um
  // contador, para as parcelas restantes se recalcularem sozinhas com o tempo (core/installments.ts).
  contributionEndsAt?: string
  status: AssetStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AssetWithId extends Asset {
  id: string
}
