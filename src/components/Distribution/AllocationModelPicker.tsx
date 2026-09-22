import { useState } from 'react'
import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  type AllocationModelKey,
} from '../../core/allocationModels'
import { validateCustomAllocation, type CustomAllocationErrors } from '../../hooks/useDistribution'
import type { CustomAllocation, DistributionModelChoice } from '../../types/distribution'

interface AllocationModelPickerProps {
  modelChoice: DistributionModelChoice
  customAllocation: CustomAllocation
  onSave: (choice: DistributionModelChoice, custom?: CustomAllocation) => void | Promise<void>
  isSaving?: boolean
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

export default function AllocationModelPicker({
  modelChoice,
  customAllocation,
  onSave,
  isSaving = false,
}: AllocationModelPickerProps) {
  const [selected, setSelected] = useState<DistributionModelChoice>(modelChoice)
  const [custom, setCustom] = useState<CustomAllocation>(customAllocation)
  const [customErrors, setCustomErrors] = useState<CustomAllocationErrors>({})

  // CENÁRIO 39: trocar de modelo nunca apaga a customização salva — só avisa antes,
  // porque o usuário pode querer voltar para "Personalizado" depois.
  const handleSelect = (choice: DistributionModelChoice) => {
    if (selected === 'CUSTOM' && choice !== 'CUSTOM') {
      const confirmed = window.confirm(
        'Trocar de modelo não apaga sua personalização — você pode voltar para "Personalizado" depois e seus valores continuam lá. Deseja trocar mesmo assim?'
      )
      if (!confirmed) return
    }
    setSelected(choice)
    setCustomErrors({})
  }

  const updateCustomField = (key: keyof CustomAllocation, value: number) => {
    setCustom((prev) => ({ ...prev, [key]: value }))
    setCustomErrors((prev) => ({ ...prev, [key]: undefined, total: undefined }))
  }

  const handleSave = async () => {
    if (selected === 'CUSTOM') {
      const errors = validateCustomAllocation(custom)
      if (Object.keys(errors).length > 0) {
        setCustomErrors(errors)
        return
      }
      await onSave('CUSTOM', custom)
      return
    }
    await onSave(selected)
  }

  const customTotal = custom.stocks + custom.bonds + custom.alternatives + custom.cash

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Nível 2 — Modelo de alocação</h2>

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
                selected === key ? 'border-black bg-gray-50' : 'border-gray-200'
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
            selected === 'CUSTOM' ? 'border-black bg-gray-50' : 'border-gray-200'
          }`}
        >
          <p className="font-medium">Personalizado</p>
          <p className="mt-1 text-xs text-gray-600">Defina você mesmo os percentuais de cada classe.</p>
        </button>
      </div>

      {selected === 'CUSTOM' && (
        <div className="space-y-3 rounded border border-gray-200 p-3">
          {(Object.keys(CUSTOM_LABELS) as (keyof CustomAllocation)[]).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{CUSTOM_LABELS[key]} (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={custom[key]}
                onChange={(e) => updateCustomField(key, parseFloat(e.target.value) || 0)}
                className="input-field"
              />
              {customErrors[key] && <p className="mt-1 text-sm text-red-600">{customErrors[key]}</p>}
            </div>
          ))}
          <div
            className={`rounded border p-2 text-sm font-medium ${
              customErrors.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
            }`}
          >
            Soma: {customTotal.toFixed(1)}%
            {customErrors.total && <p className="mt-1 font-normal">{customErrors.total}</p>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded bg-black px-4 py-2 text-white disabled:bg-gray-400"
      >
        {isSaving ? 'Salvando...' : 'Salvar Nível 2'}
      </button>
    </div>
  )
}
