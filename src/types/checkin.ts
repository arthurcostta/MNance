import type { Timestamp } from 'firebase/firestore'
import type { CheckinStatus } from '../core/checkin'
import type { AssetClass } from './asset'

// Um check-in por dia de investir de cada mês, em users/{uid}/investmentCheckins/{YYYY-MM-slot}.
// O id é determinístico: enviar duas vezes o mesmo dia não duplica nada (a transação recusa).
export interface CheckinAllocation {
  assetId: string
  assetName: string
  planned: number
  invested: number
  // true quando o ativo foi criado pelo próprio check-in (investimento em algo novo).
  isNew?: boolean
}

export interface InvestmentCheckin {
  month: string // 'YYYY-MM'
  slot: number // 1 = primeiro dia de investir do mês, 2 = segundo
  day: number // dia efetivo (já ajustado a dia útil)
  plannedTotal: number
  investedTotal: number
  status: CheckinStatus
  allocations: CheckinAllocation[]
  completedAt: Timestamp
}

export interface InvestmentCheckinWithId extends InvestmentCheckin {
  id: string
}

export interface NewAssetDraft {
  name: string
  assetClass: AssetClass
  expectedReturnRate: number
  // Mesmos campos do formulário do Portfólio; ausentes = sem aporte programado.
  monthlyContribution?: number
  contributionEndsAt?: string
}
