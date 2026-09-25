import { useState } from 'react'
import {
  validateEssentialExpenseForm,
  type EssentialExpenseFormInput,
  type EssentialExpenseFormErrors,
} from '../../hooks/useEssentialExpenses'
import type { EssentialExpenseItemWithId } from '../../types/essentialExpense'
import CurrencyInput from '../Common/CurrencyInput'
import FormField from '../Common/FormField'
import Button from '../Common/Button'

interface EssentialExpenseFormProps {
  initialValue?: EssentialExpenseItemWithId
  onSubmit: (data: EssentialExpenseFormInput) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function EssentialExpenseForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EssentialExpenseFormProps) {
  const [input, setInput] = useState<EssentialExpenseFormInput>({
    name: initialValue?.name ?? '',
    amount: initialValue?.amount ?? 0,
  })
  const [errors, setErrors] = useState<EssentialExpenseFormErrors>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const stepErrors = validateEssentialExpenseForm(input)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    try {
      await onSubmit(input)
    } catch {
      // erro já tratado no parent
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome da despesa" error={errors.name}>
        {(fieldProps) => (
          <input
            type="text"
            value={input.name}
            onChange={(e) => {
              setInput((prev) => ({ ...prev, name: e.target.value }))
              setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            placeholder="Ex: Aluguel, Celular, Transporte"
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label="Valor" error={errors.amount}>
        {(fieldProps) => (
          <CurrencyInput
            value={input.amount}
            onChange={(value) => {
              setInput((prev) => ({ ...prev, amount: value }))
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            {...fieldProps}
          />
        )}
      </FormField>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvando...' : initialValue ? 'Atualizar' : 'Adicionar'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
