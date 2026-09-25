import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  type AllocationModelKey,
} from '../../core/allocationModels'
import type { CustomAllocationErrors } from '../../hooks/useDistribution'
import type { CustomAllocation, DistributionModelChoice } from '../../types/distribution'
import FormField from '../Common/FormField'

interface AllocationModelPickerProps {
  value: DistributionModelChoice
  customValue: CustomAllocation
  errors?: CustomAllocationErrors
  onChange: (choice: DistributionModelChoice, custom?: CustomAllocation) => void
}

const PRESET_KEYS: AllocationModelKey[] = ['ALL_WEATHER', 'CONSERVATIVE', 'AGGRESSIVE']

const CUSTOM_LABELS: Record<keyof CustomAllocation, string> = {
  stocks: 'Ações',
  bonds: 'Renda Fixa',
  alternatives: 'Alternativos',
  cash: 'Caixa',
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

// Componente 100% controlado no M5.5 (sem estado interno, sem botão salvar próprio) —
// InvestmentBucketsForm.tsx decide quando persistir, já que agora cada objetivo de
// investimento tem seu próprio modelo em vez de um único modelo global (M5).
// IDs dos inputs de "Personalizado" vêm de FormField/useId(), já únicos por instância —
// não precisa de um idPrefix manual mesmo renderizado várias vezes na lista de objetivos.
export default function AllocationModelPicker({
  value,
  customValue,
  errors,
  onChange,
}: AllocationModelPickerProps) {
  // CENÁRIO 39 (herdado do M5): trocar de modelo nunca apaga a customização salva —
  // só avisa antes, porque o usuário pode querer voltar para "Personalizado" depois.
  const handleSelect = (choice: DistributionModelChoice) => {
    if (value === 'CUSTOM' && choice !== 'CUSTOM') {
      const confirmed = window.confirm(
        'Trocar de modelo não apaga sua personalização — você pode voltar para "Personalizado" depois e seus valores continuam lá. Deseja trocar mesmo assim?'
      )
      if (!confirmed) return
    }
    onChange(choice, customValue)
  }

  const updateCustomField = (key: keyof CustomAllocation, fieldValue: number) => {
    onChange('CUSTOM', { ...customValue, [key]: fieldValue })
  }

  const customTotal = customValue.stocks + customValue.bonds + customValue.alternatives + customValue.cash

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRESET_KEYS.map((key) => {
          const model = ALLOCATION_MODELS[key]
          const expectedReturn = calculateModelExpectedReturn(model)
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`rounded border p-3 text-left ${
                value === key ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
            >
              <p className="font-medium">{model.label}</p>
              <p className="mt-1 text-xs text-gray-600">
                Ações {formatPercent(model.stocks)} · Renda Fixa {formatPercent(model.bonds)} ·
                Alternativos {formatPercent(model.alternatives)} · Caixa {formatPercent(model.cash)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Retorno esperado: {(expectedReturn * 100).toFixed(1)}% a.a.
              </p>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => handleSelect('CUSTOM')}
          className={`rounded border p-3 text-left ${
            value === 'CUSTOM' ? 'border-black bg-gray-50' : 'border-gray-200'
          }`}
        >
          <p className="font-medium">Personalizado</p>
          <p className="mt-1 text-xs text-gray-600">Defina você mesmo os percentuais de cada classe.</p>
        </button>
      </div>

      {value === 'CUSTOM' && (
        <div className="space-y-3 rounded border border-gray-200 p-3">
          {(Object.keys(CUSTOM_LABELS) as (keyof CustomAllocation)[]).map((key) => (
            <FormField key={key} label={`${CUSTOM_LABELS[key]} (%)`} error={errors?.[key]}>
              {(fieldProps) => (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={customValue[key]}
                  onChange={(e) => updateCustomField(key, parseFloat(e.target.value) || 0)}
                  className="input-field"
                  {...fieldProps}
                />
              )}
            </FormField>
          ))}
          <div
            className={`rounded border p-2 text-sm font-medium ${
              errors?.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
            }`}
          >
            Soma: {customTotal.toFixed(1)}%
            {errors?.total && <p className="mt-1 font-normal">{errors.total}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
