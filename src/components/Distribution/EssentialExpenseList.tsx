import type { EssentialExpenseItemWithId } from '../../types/essentialExpense'
import EmptyState from '../Common/EmptyState'
import Button from '../Common/Button'

interface EssentialExpenseListProps {
  items: EssentialExpenseItemWithId[]
  onEdit: (item: EssentialExpenseItemWithId) => void
  onDelete: (itemId: string) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function EssentialExpenseList({ items, onEdit, onDelete }: EssentialExpenseListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma despesa essencial cadastrada ainda."
        description="Adicione seus gastos fixos (aluguel, celular, transporte...) para comparar com o orçado."
      />
    )
  }

  const handleDelete = (itemId: string) => {
    if (window.confirm('Deseja excluir esta despesa?')) {
      onDelete(itemId)
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded border border-gray-200 bg-white p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{item.name}</p>
            <p className="text-sm text-gray-600">{formatCurrency(item.amount)}</p>
          </div>
          <div className="ml-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
              Excluir
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
