import { useState } from 'react'
import {
  validateNivelUm,
  validatePaydayAmounts,
  shareFromAmounts,
  splitIncomeByShare,
  type NivelUmErrors,
  type NivelUmInput,
  type PaydayAmountsErrors,
} from '../../hooks/useDistribution'
import {
  newCategoryId,
  validateCategories,
  type CustomCategory,
} from '../../core/distributionCategories'
import type { PaydaySplit } from '../../types/distribution'
import PaydaySplitFields from './PaydaySplitFields'
import CustomCategoriesEditor from './CustomCategoriesEditor'
import FormField from '../Common/FormField'
import CurrencyInput from '../Common/CurrencyInput'
import Alert from '../Common/Alert'
import Button from '../Common/Button'
import { formatPercent } from '../../utils/formatPercent'

interface NivelUmFormProps {
  hasSecondPayday: boolean
  initialPayday1: PaydaySplit
  initialPayday2?: PaydaySplit
  initialIncomeSharePercent?: number
  initialCategories: CustomCategory[]
  monthlyIncomeNet: number
  onSave: (payload: {
    payday1Split: PaydaySplit
    payday2Split?: PaydaySplit
    payday1IncomeSharePercent?: number
    monthlyIncomeNet: number
    customCategories: CustomCategory[]
  }) => void | Promise<void>
  isSaving?: boolean
}

const FALLBACK_SPLIT: PaydaySplit = {
  essentialsPercent: 55,
  educationPercent: 10,
  leisurePercent: 10,
  investmentsPercent: 25,
  customPercents: {},
}

// Tira o percentual de uma categoria removida, para não sobrar valor órfão no documento.
function withoutCategory(split: NivelUmInput, id: string): NivelUmInput {
  const { [id]: _removed, ...rest } = split.customPercents
  return { ...split, customPercents: rest }
}

export default function NivelUmForm({
  hasSecondPayday,
  initialPayday1,
  initialPayday2,
  initialIncomeSharePercent,
  initialCategories,
  monthlyIncomeNet,
  onSave,
  isSaving = false,
}: NivelUmFormProps) {
  const [payday1, setPayday1] = useState<NivelUmInput>(initialPayday1)
  const [payday2, setPayday2] = useState<NivelUmInput>(initialPayday2 ?? FALLBACK_SPLIT)
  const [incomeSharePercent, setIncomeSharePercent] = useState(initialIncomeSharePercent ?? 50)
  const [categories, setCategories] = useState<CustomCategory[]>(initialCategories)
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({})
  const [errors1, setErrors1] = useState<NivelUmErrors>({})
  const [errors2, setErrors2] = useState<NivelUmErrors>({})

  // M5.6: Valores em R$ por pagamento
  const initialAmounts = splitIncomeByShare(monthlyIncomeNet, incomeSharePercent)
  const [payday1Amount, setPayday1Amount] = useState(initialAmounts.payday1Amount)
  const [payday2Amount, setPayday2Amount] = useState(initialAmounts.payday2Amount)
  const [amountsErrors, setAmountsErrors] = useState<PaydayAmountsErrors>({})

  // M5.6: Sincronizar R$ com % bidirecionalemente
  const handlePayday1AmountChange = (amount: number) => {
    setPayday1Amount(amount)
    const newShare = shareFromAmounts(amount, hasSecondPayday ? payday2Amount : 0)
    setIncomeSharePercent(newShare)
  }

  const handlePayday2AmountChange = (amount: number) => {
    setPayday2Amount(amount)
    const newShare = shareFromAmounts(payday1Amount, amount)
    setIncomeSharePercent(newShare)
  }

  const handleIncomeShareChange = (percent: number) => {
    const total = payday1Amount + payday2Amount
    setIncomeSharePercent(percent)
    const split = splitIncomeByShare(total, percent)
    setPayday1Amount(split.payday1Amount)
    setPayday2Amount(split.payday2Amount)
  }

  const addCategory = (name: string) => {
    const id = newCategoryId(categories.map((c) => c.id))
    setCategories((prev) => [...prev, { id, name }])
  }

  const renameCategory = (id: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    setCategoryErrors((prev) => {
      const { [id]: _cleared, ...rest } = prev
      return rest
    })
  }

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setPayday1((prev) => withoutCategory(prev, id))
    setPayday2((prev) => withoutCategory(prev, id))
  }

  const newTotalIncome = payday1Amount + (hasSecondPayday ? payday2Amount : 0)
  const incomeChanged = Math.abs(newTotalIncome - monthlyIncomeNet) >= 0.005

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    const nextCategoryErrors = validateCategories(categories)
    const nextErrors1 = validateNivelUm(payday1, categories)
    const nextErrors2 = hasSecondPayday ? validateNivelUm(payday2, categories) : {}
    const nextAmountsErrors = validatePaydayAmounts(
      { payday1Amount, payday2Amount },
      hasSecondPayday
    )
    setCategoryErrors(nextCategoryErrors)
    setErrors1(nextErrors1)
    setErrors2(nextErrors2)
    setAmountsErrors(nextAmountsErrors)
    if (
      Object.keys(nextCategoryErrors).length > 0 ||
      Object.keys(nextErrors1).length > 0 ||
      Object.keys(nextErrors2).length > 0 ||
      Object.keys(nextAmountsErrors).length > 0
    )
      return

    await onSave({
      payday1Split: payday1,
      ...(hasSecondPayday
        ? { payday2Split: payday2, payday1IncomeSharePercent: incomeSharePercent }
        : {}),
      monthlyIncomeNet: newTotalIncome,
      customCategories: categories,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <h2 className="text-lg font-semibold">Divisão da renda</h2>

      {/* M5.6: Campo em R$ por pagamento */}
      <FormField
        label={hasSecondPayday ? 'Salário líquido — 1º pagamento (R$)' : 'Salário líquido mensal (R$)'}
        error={amountsErrors.payday1Amount || amountsErrors.total}
        hint="Quanto cai na sua conta neste pagamento, já descontados os impostos."
      >
        {(fieldProps) => (
          <CurrencyInput
            value={payday1Amount}
            onChange={handlePayday1AmountChange}
            {...fieldProps}
          />
        )}
      </FormField>

      {hasSecondPayday && (
        <>
          <FormField
            label="Salário líquido — 2º pagamento (R$)"
            error={amountsErrors.payday2Amount}
            hint="Quando você recebe a segunda parcela (ex.: adiantamento, 13º, etc.)."
          >
            {(fieldProps) => (
              <CurrencyInput
                value={payday2Amount}
                onChange={handlePayday2AmountChange}
                {...fieldProps}
              />
            )}
          </FormField>

          <FormField
            label="% da renda que chega no 1º pagamento"
            hint={`O restante (${formatPercent(100 - incomeSharePercent)}) cai no 2º pagamento.`}
          >
            {(fieldProps) => (
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={incomeSharePercent}
                onChange={(e) => handleIncomeShareChange(parseFloat(e.target.value) || 0)}
                className="input-field"
                {...fieldProps}
              />
            )}
          </FormField>
        </>
      )}

      {incomeChanged && (
        <Alert variant="info">
          Sua renda mensal líquida passará de{' '}
          {monthlyIncomeNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para{' '}
          {newTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
        </Alert>
      )}

      <CustomCategoriesEditor
        categories={categories}
        errors={categoryErrors}
        onAdd={addCategory}
        onRename={renameCategory}
        onRemove={removeCategory}
      />

      <PaydaySplitFields
        title={hasSecondPayday ? '1º pagamento' : 'Divisão mensal'}
        value={payday1}
        categories={categories}
        errors={errors1}
        paydayIncome={payday1Amount}
        onChange={(next) => {
          setPayday1(next)
          setErrors1({})
        }}
      />

      {hasSecondPayday && (
        <PaydaySplitFields
          title="2º pagamento"
          value={payday2}
          categories={categories}
          errors={errors2}
          paydayIncome={payday2Amount}
          onChange={(next) => {
            setPayday2(next)
            setErrors2({})
          }}
        />
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar divisão da renda'}
      </Button>
    </form>
  )
}
