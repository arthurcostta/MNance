import { calculateDistributionAmounts, type NivelUmErrors, type NivelUmInput } from '../../hooks/useDistribution'
import FormField from '../Common/FormField'

interface PaydaySplitFieldsProps {
  title: string
  value: NivelUmInput
  errors: NivelUmErrors
  paydayIncome: number
  onChange: (value: NivelUmInput) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FIELDS: { key: keyof NivelUmInput; label: string }[] = [
  { key: 'essentialsPercent', label: 'Despesas Essenciais' },
  { key: 'educationPercent', label: 'Educação' },
  { key: 'leisurePercent', label: 'Lazer' },
  { key: 'investmentsPercent', label: 'Investimentos' },
  { key: 'companyCashPercent', label: 'Caixa da Empresa' },
]

// Bloco reutilizável de 5 inputs de percentual + preview em R$ + indicador de soma —
// usado 1 ou 2 vezes em NivelUmForm.tsx conforme o usuário tenha 1 ou 2 pagamentos.
export default function PaydaySplitFields({
  title,
  value,
  errors,
  paydayIncome,
  onChange,
}: PaydaySplitFieldsProps) {
  const total =
    value.essentialsPercent +
    value.educationPercent +
    value.leisurePercent +
    value.investmentsPercent +
    value.companyCashPercent

  const amounts = calculateDistributionAmounts([{ split: value, incomeShareFraction: 1 }], paydayIncome)

  const amountByKey: Record<keyof NivelUmInput, number> = {
    essentialsPercent: amounts.essentials,
    educationPercent: amounts.education,
    leisurePercent: amounts.leisure,
    investmentsPercent: amounts.investments,
    companyCashPercent: amounts.companyCash,
  }

  const updateField = (key: keyof NivelUmInput, fieldValue: number) => {
    onChange({ ...value, [key]: fieldValue })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-800">{title}</h3>

      {FIELDS.map(({ key, label }) => (
        <FormField
          key={key}
          label={`${label} (%)`}
          hint={`${formatCurrency(amountByKey[key])}/mês`}
          error={errors[key]}
        >
          {(fieldProps) => (
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={value[key]}
              onChange={(e) => updateField(key, parseFloat(e.target.value) || 0)}
              className="input-field"
              {...fieldProps}
            />
          )}
        </FormField>
      ))}

      <div
        className={`rounded border p-3 text-sm font-medium ${
          errors.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
        }`}
      >
        Soma: {total.toFixed(1)}%{errors.total && <p className="mt-1 font-normal">{errors.total}</p>}
      </div>
    </div>
  )
}
