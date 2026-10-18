import { useState } from 'react'
import { validateInvestmentDays } from '../../hooks/useInvestments'
import Button from '../Common/Button'
import FormField from '../Common/FormField'

interface InvestmentDaysFormProps {
  initialDays: number[]
  submitLabel?: string
  onSave: (days: number[]) => Promise<void>
  onCancel?: () => void
}

type DaysMode = 'one' | 'two' | 'end'

// Dia(s) de investir do mês. Vazio = "prefiro responder no fim do mês" (último dia útil).
export default function InvestmentDaysForm({
  initialDays,
  submitLabel = 'Salvar dias',
  onSave,
  onCancel,
}: InvestmentDaysFormProps) {
  const [mode, setMode] = useState<DaysMode>(
    initialDays.length === 2 ? 'two' : initialDays.length === 1 ? 'one' : 'end'
  )
  const [first, setFirst] = useState<string>(initialDays[0]?.toString() ?? '')
  const [second, setSecond] = useState<string>(initialDays[1]?.toString() ?? '')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const buildDays = (): number[] => {
    if (mode === 'end') return []
    const days = [Number(first)]
    if (mode === 'two') days.push(Number(second))
    return days
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const days = buildDays()
    const validation = mode === 'end' ? {} : validateInvestmentDays(days)
    setError(validation.days)
    if (validation.days) return
    setSaving(true)
    try {
      await onSave(days)
    } finally {
      setSaving(false)
    }
  }

  const options: { value: DaysMode; label: string }[] = [
    { value: 'one', label: 'Um dia no mês' },
    { value: 'two', label: 'Dois dias (ex.: quando cai cada salário)' },
    { value: 'end', label: 'Prefiro responder no fim do mês' },
  ]

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">Quando você costuma investir?</legend>
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="investment-days-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {mode !== 'end' && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label={mode === 'two' ? 'Primeiro dia' : 'Dia'} error={error}>
            {(fieldProps) => (
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                className="input-field"
                {...fieldProps}
              />
            )}
          </FormField>
          {mode === 'two' && (
            <FormField label="Segundo dia">
              {(fieldProps) => (
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                  className="input-field"
                  {...fieldProps}
                />
              )}
            </FormField>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Se o dia cair em fim de semana ou feriado, a data passa para o próximo dia útil.
      </p>

      <div className="flex justify-between gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
