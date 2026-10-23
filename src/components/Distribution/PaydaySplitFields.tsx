import { calculateDistributionAmounts, type NivelUmErrors, type NivelUmInput } from '../../hooks/useDistribution'
import { DEFAULT_CATEGORY_LABELS, type CustomCategory } from '../../core/distributionCategories'
import FormField from '../Common/FormField'
import { formatPercent } from '../../utils/formatPercent'

interface PaydaySplitFieldsProps {
  title: string
  value: NivelUmInput
  categories: CustomCategory[]
  errors: NivelUmErrors
  paydayIncome: number
  onChange: (value: NivelUmInput) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const DEFAULT_FIELDS = [
  { key: 'essentialsPercent', label: DEFAULT_CATEGORY_LABELS.essentials },
  { key: 'educationPercent', label: DEFAULT_CATEGORY_LABELS.education },
  { key: 'leisurePercent', label: DEFAULT_CATEGORY_LABELS.leisure },
  { key: 'investmentsPercent', label: DEFAULT_CATEGORY_LABELS.investments },
] as const

// Bloco reutilizável: as 4 categorias padrão + uma linha por categoria personalizada, com
// valor em R$ ao vivo e indicador de soma. Usado 1 ou 2 vezes em NivelUmForm.tsx.
export default function PaydaySplitFields({
  title,
  value,
  categories,
  errors,
  paydayIncome,
  onChange,
}: PaydaySplitFieldsProps) {
  const custom = categories.reduce((sum, c) => sum + (value.customPercents[c.id] ?? 0), 0)
  const total =
    value.essentialsPercent + value.educationPercent + value.leisurePercent + value.investmentsPercent + custom

  const amounts = calculateDistributionAmounts([{ split: value, incomeShareFraction: 1 }], paydayIncome)

  const updateDefault = (key: (typeof DEFAULT_FIELDS)[number]['key'], fieldValue: number) => {
    onChange({ ...value, [key]: fieldValue })
  }

  const updateCustom = (id: string, fieldValue: number) => {
    onChange({ ...value, customPercents: { ...value.customPercents, [id]: fieldValue } })
  }

  const renderInput = (
    current: number,
    onValueChange: (next: number) => void,
    error: string | undefined,
    label: string,
    hint: string
  ) => (
    <FormField key={label} label={`${label} (%)`} hint={hint} error={error}>
      {(fieldProps) => (
        <input
          type="number"
          step="any"
          min="0"
          max="100"
          value={current}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          className="input-field"
          {...fieldProps}
        />
      )}
    </FormField>
  )

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-800">{title}</h3>

      {DEFAULT_FIELDS.map(({ key, label }) =>
        renderInput(
          value[key],
          (next) => updateDefault(key, next),
          errors[key],
          label,
          `${formatCurrency(
            key === 'essentialsPercent'
              ? amounts.essentials
              : key === 'educationPercent'
                ? amounts.education
                : key === 'leisurePercent'
                  ? amounts.leisure
                  : amounts.investments
          )}/mês`
        )
      )}

      {categories.map((category) =>
        renderInput(
          value.customPercents[category.id] ?? 0,
          (next) => updateCustom(category.id, next),
          errors.custom?.[category.id],
          category.name,
          `${formatCurrency(amounts.custom[category.id] ?? 0)}/mês`
        )
      )}

      <div
        className={`rounded border p-3 text-sm font-medium ${
          errors.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
        }`}
      >
        Soma: {formatPercent(total)}{errors.total && <p className="mt-1 font-normal">{errors.total}</p>}
      </div>
    </div>
  )
}
