import { useEffect, useMemo, useState } from 'react'
import { getPatrimonySnapshots } from '../services/patrimonySnapshotService'
import { yearMonthOf } from '../core/installments'
import { buildHistorySeries, summarizeHistory } from '../core/patrimonyHistory'
import type { PatrimonySnapshotWithId } from '../types/patrimonySnapshot'

// Série mensal do patrimônio para a tela Portfólio. Os retratos gravados são lidos uma vez por usuário;
// o mês corrente usa o total vivo (o mesmo número do cartão do topo), então editar um ativo atualiza o
// último ponto na hora, sem reler o Firestore.
// liveTotal = null quando não há ativo ativo.
export function usePatrimonyHistory(uid: string | undefined, liveTotal: number | null) {
  const [snapshots, setSnapshots] = useState<PatrimonySnapshotWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return

    let cancelled = false
    getPatrimonySnapshots(uid)
      .then((all) => {
        if (!cancelled) setSnapshots(all)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.warn('Não foi possível carregar o histórico do patrimônio:', err)
        setError('Não foi possível carregar o histórico do patrimônio.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  const points = useMemo(
    () => buildHistorySeries(snapshots, yearMonthOf(new Date()), liveTotal),
    [snapshots, liveTotal]
  )
  const summary = useMemo(() => summarizeHistory(points), [points])

  // Sem usuário não há o que carregar: não fica preso no "carregando".
  return { points, summary, loading: uid ? loading : false, error }
}
