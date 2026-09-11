import { useState } from 'react'
import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import type { EmergencyReserveResult } from '../../../core/emergencyReserve'
import CurrencyInput from '../../Common/CurrencyInput'

interface Step3IncomeProps {
  data: OnboardingData
  errors: ValidationErrors
  emergencyReserve: EmergencyReserveResult
  onUpdateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Step3Income({
  data,
  errors,
  emergencyReserve,
  onUpdateField,
}: Step3IncomeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sua renda</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">Renda líquida mensal</label>
        <CurrencyInput
          value={data.monthlyIncomeNet}
          onChange={(value) => onUpdateField('monthlyIncomeNet', value)}
        />
        {errors.monthlyIncomeNet && (
          <p className="mt-1 text-sm text-red-600">{errors.monthlyIncomeNet}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Custo essencial mensal</label>
        <CurrencyInput
          value={data.essentialMonthlyCost}
          onChange={(value) => onUpdateField('essentialMonthlyCost', value)}
        />
        {errors.essentialMonthlyCost && (
          <p className="mt-1 text-sm text-red-600">{errors.essentialMonthlyCost}</p>
        )}
      </div>

      {data.monthlyIncomeNet > 0 && (
        <div className="rounded border bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Sua reserva de emergência</span>
            <button
              type="button"
              onClick={() => setShowTooltip((v) => !v)}
              className="text-xs underline"
            >
              por quê?
            </button>
          </div>
          <p className="mt-1">Mínima (6 meses): {formatCurrency(emergencyReserve.minimumReserve)}</p>
          <p>Segura (12 meses): {formatCurrency(emergencyReserve.safeReserve)}</p>
          {showTooltip && (
            <p className="mt-2 text-gray-600">
              Calculamos sobre sua renda, não sobre seus gastos essenciais, porque você
              dificilmente aceitaria reduzir seu padrão de vida numa emergência real — a
              reserva precisa sustentar sua renda de verdade.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
