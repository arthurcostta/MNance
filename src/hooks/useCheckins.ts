import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCheckins } from '../services/checkinService'
import { calculateAdherence } from '../core/checkin'
import type { InvestmentCheckinWithId } from '../types/checkin'

// Check-ins respondidos (inclui "não investi") e a aderência derivada deles. Usado pela tela
// Investimentos, pelo Radar e pela Distribuição, para que a projeção seja a mesma em todas.
export function useCheckins(uid: string | undefined) {
  const [checkins, setCheckins] = useState<InvestmentCheckinWithId[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async (isCancelled: () => boolean) => {
    if (!uid) return null
    try {
      const all = await getCheckins(uid)
      if (isCancelled()) return null
      setCheckins(all)
      return all
    } catch (error) {
      if (!isCancelled()) {
        setActionError(error instanceof Error ? error.message : 'Erro ao carregar investimentos.')
      }
      return null
    } finally {
      if (!isCancelled()) setLoadingInitial(false)
    }
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }
    let cancelled = false
    void load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [uid, load])

  const refresh = useCallback(() => load(() => false), [load])

  // Mais recente primeiro: o id é 'YYYY-MM-slot' (mês com 2 dígitos), então a ordem textual é a cronológica.
  const adherence = useMemo(() => {
    const answered = [...checkins]
      .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
      .map((c) => ({ plannedTotal: c.plannedTotal, investedTotal: c.investedTotal, status: c.status }))
    return calculateAdherence(answered)
  }, [checkins])

  return { checkins, adherence, loadingInitial, actionError, refresh }
}
