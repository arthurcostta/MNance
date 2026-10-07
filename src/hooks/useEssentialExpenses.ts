import { useCallback, useEffect, useMemo, useState } from 'react'
import type { EssentialExpenseItemWithId } from '../types/essentialExpense'
import {
  getEssentialExpenses,
  addEssentialExpense as addEssentialExpenseService,
  updateEssentialExpense as updateEssentialExpenseService,
  deleteEssentialExpense as deleteEssentialExpenseService,
} from '../services/essentialExpenseService'

export interface EssentialExpenseFormInput {
  name: string
  amount: number
}

export type EssentialExpenseFormErrors = Partial<Record<keyof EssentialExpenseFormInput, string>>

export function validateEssentialExpenseForm(
  input: EssentialExpenseFormInput
): EssentialExpenseFormErrors {
  const errors: EssentialExpenseFormErrors = {}
  if (!input.name.trim()) errors.name = 'Informe um nome para a despesa.'
  if (input.amount <= 0) errors.amount = 'O valor precisa ser maior que zero.'
  return errors
}

function sortByCreatedAtDesc(items: EssentialExpenseItemWithId[]): EssentialExpenseItemWithId[] {
  return [...items].sort((a, b) => {
    const aTime = typeof a.createdAt === 'object' ? a.createdAt.toMillis() : 0
    const bTime = typeof b.createdAt === 'object' ? b.createdAt.toMillis() : 0
    return bTime - aTime
  })
}

export function useEssentialExpenses(uid: string | undefined) {
  const [items, setItems] = useState<EssentialExpenseItemWithId[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }

    let cancelled = false

    const fetchItems = async () => {
      try {
        const all = await getEssentialExpenses(uid)
        if (!cancelled) setItems(sortByCreatedAtDesc(all))
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : 'Erro ao carregar despesas essenciais.')
        }
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    }

    fetchItems()

    return () => {
      cancelled = true
    }
  }, [uid])

  const total = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items])

  const addItem = useCallback(
    async (data: EssentialExpenseFormInput) => {
      if (!uid) return
      setActionError(null)
      try {
        await addEssentialExpenseService(uid, data)
        setItems(sortByCreatedAtDesc(await getEssentialExpenses(uid)))
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao adicionar despesa.')
        throw error
      }
    },
    [uid]
  )

  const updateItem = useCallback(
    async (itemId: string, data: EssentialExpenseFormInput) => {
      if (!uid) return
      setActionError(null)
      try {
        await updateEssentialExpenseService(uid, itemId, data)
        setItems(sortByCreatedAtDesc(await getEssentialExpenses(uid)))
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao atualizar despesa.')
        throw error
      }
    },
    [uid]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!uid) return
      setActionError(null)
      try {
        await deleteEssentialExpenseService(uid, itemId)
        setItems(sortByCreatedAtDesc(await getEssentialExpenses(uid)))
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao excluir despesa.')
        throw error
      }
    },
    [uid]
  )

  return { items, total, loadingInitial, actionError, addItem, updateItem, deleteItem }
}

// useDistribution compõe este hook (uma instância só) e entrega o resultado à tela por props.
export type EssentialExpensesState = ReturnType<typeof useEssentialExpenses>
