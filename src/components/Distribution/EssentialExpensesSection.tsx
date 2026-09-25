import { useState } from 'react'
import { useEssentialExpenses, type EssentialExpenseFormInput } from '../../hooks/useEssentialExpenses'
import { calculateEssentialsComparison } from '../../hooks/useDistribution'
import type { EssentialExpenseItemWithId } from '../../types/essentialExpense'
import EssentialExpenseForm from './EssentialExpenseForm'
import EssentialExpenseList from './EssentialExpenseList'
import Card from '../Common/Card'
import Button from '../Common/Button'
import Alert from '../Common/Alert'
import LoadingState from '../Common/LoadingState'

interface EssentialExpensesSectionProps {
  uid: string | undefined
  essentialsBudget: number
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Vive na tela de Distribuição (não em /expenses, reservada para a feature maior e mais
// rica de M7) — recebe o orçado já somando os 2 pagamentos via distribution.amounts.essentials.
export default function EssentialExpensesSection({ uid, essentialsBudget }: EssentialExpensesSectionProps) {
  const expenses = useEssentialExpenses(uid)
  const [formMode, setFormMode] = useState<'closed' | 'add' | 'edit'>('closed')
  const [editingItem, setEditingItem] = useState<EssentialExpenseItemWithId | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (expenses.loadingInitial) {
    return <LoadingState label="Carregando despesas essenciais..." />
  }

  const comparison = calculateEssentialsComparison(essentialsBudget, expenses.total)

  const handleSubmit = async (data: EssentialExpenseFormInput) => {
    setIsSubmitting(true)
    try {
      if (formMode === 'edit' && editingItem) {
        await expenses.updateItem(editingItem.id, data)
      } else {
        await expenses.addItem(data)
      }
      setFormMode('closed')
      setEditingItem(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Despesas essenciais detalhadas</h2>

      <Alert variant={comparison.balance >= 0 ? 'success' : 'warning'}>
        Orçado: {formatCurrency(comparison.budget)} · Real: {formatCurrency(comparison.real)} · Saldo:{' '}
        <span className="font-semibold">{formatCurrency(comparison.balance)}</span>
      </Alert>

      {formMode !== 'closed' ? (
        <EssentialExpenseForm
          initialValue={editingItem ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormMode('closed')
            setEditingItem(null)
          }}
          isSubmitting={isSubmitting}
        />
      ) : (
        <Button onClick={() => setFormMode('add')}>+ Adicionar despesa</Button>
      )}

      <EssentialExpenseList
        items={expenses.items}
        onEdit={(item) => {
          setEditingItem(item)
          setFormMode('edit')
        }}
        onDelete={(itemId) => expenses.deleteItem(itemId)}
      />

      {expenses.actionError && <Alert variant="error">{expenses.actionError}</Alert>}
    </Card>
  )
}
