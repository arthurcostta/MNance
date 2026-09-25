import { useState } from 'react'
import { validateNivelUm, type NivelUmErrors, type NivelUmInput } from '../../hooks/useDistribution'
import type { PaydaySplit } from '../../types/distribution'
import PaydaySplitFields from './PaydaySplitFields'
import FormField from '../Common/FormField'
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

  const payday1Income = monthlyIncomeNet * (hasSecondPayday ? incomeSharePercent / 100 : 1)
  const payday2Income = monthlyIncomeNet * (1 - incomeSharePercent / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors1 = validateNivelUm(payday1)
    const nextErrors2 = hasSecondPayday ? validateNivelUm(payday2) : {}
    setErrors1(nextErrors1)
    setErrors2(nextErrors2)
    if (Object.keys(nextErrors1).length > 0 || Object.keys(nextErrors2).length > 0) return

    await onSave({
      payday1Split: payday1,
      ...(hasSecondPayday
        ? { payday2Split: payday2, payday1IncomeSharePercent: incomeSharePercent }
        : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">Nível 1 — Divisão da renda</h2>

      {hasSecondPayday && (
        <FormField
          label="% da renda que chega no 1º pagamento"
          hint={`O restante (${(100 - incomeSharePercent).toFixed(0)}%) chega no 2º pagamento — sem validação de soma, é só um número e seu complemento.`}
        >
          {(fieldProps) => (
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={incomeSharePercent}
              onChange={(e) => setIncomeSharePercent(parseFloat(e.target.value) || 0)}
              className="input-field"
              {...fieldProps}
            />
          )}
        </FormField>
      )}

      <PaydaySplitFields
        title={hasSecondPayday ? '1º pagamento' : 'Divisão mensal'}
        value={payday1}
        errors={errors1}
        paydayIncome={payday1Income}
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
          paydayIncome={payday2Income}
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
