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
import type { PaydaySplit } from '../../types/distribution'
import PaydaySplitFields from './PaydaySplitFields'
import FormField from '../Common/FormField'
import CurrencyInput from '../Common/CurrencyInput'
import Alert from '../Common/Alert'
import Button from '../Common/Button'

interface NivelUmFormProps {
  hasSecondPayday: boolean
  initialPayday1: PaydaySplit
  initialPayday2?: PaydaySplit
  initialIncomeSharePercent?: number
  monthlyIncomeNet: number
  onSave: (payload: {
    payday1Split: PaydaySplit
    payday2Split?: PaydaySplit
    payday1IncomeSharePercent?: number
    monthlyIncomeNet: number
  }) => void | Promise<void>
  isSaving?: boolean
}

const FALLBACK_SPLIT: PaydaySplit = {
  essentialsPercent: 55,
  educationPercent: 10,
  leisurePercent: 10,
  investmentsPercent: 25,
  companyCashPercent: 0,
}

export default function NivelUmForm({
  hasSecondPayday,
  initialPayday1,
  initialPayday2,
  initialIncomeSharePercent,
  monthlyIncomeNet,
  onSave,
  isSaving = false,
}: NivelUmFormProps) {
  const [payday1, setPayday1] = useState<NivelUmInput>(initialPayday1)
  const [payday2, setPayday2] = useState<NivelUmInput>(initialPayday2 ?? FALLBACK_SPLIT)
  const [incomeSharePercent, setIncomeSharePercent] = useState(initialIncomeSharePercent ?? 50)
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

  const newTotalIncome = payday1Amount + (hasSecondPayday ? payday2Amount : 0)
  const incomeChanged = Math.abs(newTotalIncome - monthlyIncomeNet) >= 0.005

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    const nextErrors1 = validateNivelUm(payday1)
    const nextErrors2 = hasSecondPayday ? validateNivelUm(payday2) : {}
    const nextAmountsErrors = validatePaydayAmounts(
      { payday1Amount, payday2Amount },
      hasSecondPayday
    )
    setErrors1(nextErrors1)
    setErrors2(nextErrors2)
    setAmountsErrors(nextAmountsErrors)
    if (
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
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">Nível 1 — Divisão da renda</h2>

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
            hint={`O restante (${(100 - incomeSharePercent).toFixed(1)}%) cai no 2º pagamento.`}
          >
            {(fieldProps) => (
              <input
                type="number"
                step="0.1"
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

      <PaydaySplitFields
        title={hasSecondPayday ? '1º pagamento' : 'Divisão mensal'}
        value={payday1}
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
          errors={errors2}
          paydayIncome={payday2Amount}
          onChange={(next) => {
            setPayday2(next)
            setErrors2({})
          }}
        />
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar Nível 1'}
      </Button>
    </form>
  )
}
