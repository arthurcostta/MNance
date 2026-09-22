import { useState } from 'react'
import {
  calculateDistributionAmounts,
  validateNivelUm,
  type NivelUmErrors,
  type NivelUmInput,
} from '../../hooks/useDistribution'

interface NivelUmFormProps {
  initialValue: NivelUmInput
  monthlyIncomeNet: number
  onSave: (values: NivelUmInput) => void | Promise<void>
  isSaving?: boolean
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FIELDS: { key: keyof NivelUmInput; label: string; amountKey: keyof ReturnType<typeof calculateDistributionAmounts> }[] = [
  { key: 'essentialsPercent', label: 'Despesas Essenciais', amountKey: 'essentials' },
  { key: 'educationPercent', label: 'Educação', amountKey: 'education' },
  { key: 'leisurePercent', label: 'Lazer', amountKey: 'leisure' },
  { key: 'investmentsPercent', label: 'Investimentos', amountKey: 'investments' },
]

export default function NivelUmForm({
  initialValue,
  monthlyIncomeNet,
  onSave,
  isSaving = false,
}: NivelUmFormProps) {
  const [input, setInput] = useState<NivelUmInput>(initialValue)
  const [errors, setErrors] = useState<NivelUmErrors>({})

  const total =
    input.essentialsPercent + input.educationPercent + input.leisurePercent + input.investmentsPercent
  const amounts = calculateDistributionAmounts(input, monthlyIncomeNet)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const stepErrors = validateNivelUm(input)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    await onSave(input)
  }

  const updateField = (key: keyof NivelUmInput, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, total: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Nível 1 — Divisão da renda</h2>

      {FIELDS.map(({ key, label, amountKey }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium">{label} (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={input[key]}
            onChange={(e) => updateField(key, parseFloat(e.target.value) || 0)}
            className="input-field"
          />
          <p className="mt-1 text-xs text-gray-500">{formatCurrency(amounts[amountKey])}/mês</p>
          {errors[key] && <p className="mt-1 text-sm text-red-600">{errors[key]}</p>}
        </div>
      ))}

      <div
        className={`rounded border p-3 text-sm font-medium ${
          errors.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
        }`}
      >
        Soma: {total.toFixed(1)}%{errors.total && <p className="mt-1 font-normal">{errors.total}</p>}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="rounded bg-black px-4 py-2 text-white disabled:bg-gray-400"
      >
        {isSaving ? 'Salvando...' : 'Salvar Nível 1'}
      </button>
    </form>
  )
}
