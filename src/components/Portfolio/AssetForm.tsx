import { useState } from 'react'
import { ASSET_RETURN_RATES } from '../../core/assetReturnRates'
import { validateAssetForm, type AssetFormInput, type AssetFormMode, type AssetFormErrors } from '../../hooks/usePortfolio'
import type { AssetWithId } from '../../types/asset'
import CurrencyInput from '../Common/CurrencyInput'

interface AssetFormProps {
  mode: AssetFormMode
  initialValue?: AssetWithId
  seedDefaultValue?: number
  submitLabel: string
  onSubmit: (data: AssetFormInput & { expectedReturnRate: number }) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  stocks: 'Ações',
  bonds: 'Renda Fixa',
  alternatives: 'Alternativos',
  cash: 'Caixa',
}

export default function AssetForm({
  mode,
  initialValue,
  seedDefaultValue,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AssetFormProps) {
  const [input, setInput] = useState<AssetFormInput>({
    name: initialValue?.name ?? '',
    assetClass: initialValue?.assetClass ?? 'bonds',
    currentValue: seedDefaultValue ?? initialValue?.currentValue ?? 0,
    expectedReturnRatePercent: initialValue ? initialValue.expectedReturnRate * 100 : 0,
    instrumentKey: undefined,
  })

  const [errors, setErrors] = useState<AssetFormErrors>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const stepErrors = validateAssetForm(input, mode)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    try {
      await onSubmit({
        ...input,
        expectedReturnRate: input.expectedReturnRatePercent / 100,
      })
    } catch {
      // erro já foi tratado no parent
    }
  }

  const handleInstrumentChange = (key: string) => {
    const rate = ASSET_RETURN_RATES[key as keyof typeof ASSET_RETURN_RATES]
    if (rate) {
      setInput((prev) => ({
        ...prev,
        instrumentKey: key,
        assetClass: rate.assetClass,
        expectedReturnRatePercent: rate.annualRate * 100,
      }))
      setErrors((prev) => ({
        ...prev,
        instrumentKey: undefined,
        assetClass: undefined,
        expectedReturnRatePercent: undefined,
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome do ativo */}
      <div>
        <label className="mb-1 block text-sm font-medium">Nome do ativo</label>
        <input
          type="text"
          value={input.name}
          onChange={(e) => {
            setInput((prev) => ({ ...prev, name: e.target.value }))
            setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          placeholder="Ex: Tesouro Selic, Ação Petrobras"
          className="input-field"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Seletor de instrumento (só em add/seed) */}
      {(mode === 'add' || mode === 'seed') && (
        <div>
          <label className="mb-1 block text-sm font-medium">Tipo de instrumento</label>
          <select
            value={input.instrumentKey ?? ''}
            onChange={(e) => handleInstrumentChange(e.target.value)}
            className="input-field"
          >
            <option value="">Escolha um instrumento...</option>
            {Object.entries(ASSET_RETURN_RATES).map(([key, rate]) => (
              <option key={key} value={key}>
                {rate.label} ({(rate.annualRate * 100).toFixed(1)}%)
              </option>
            ))}
          </select>
          {errors.instrumentKey && <p className="mt-1 text-sm text-red-600">{errors.instrumentKey}</p>}
        </div>
      )}

      {/* Classe de ativo (read-only em edit) */}
      {mode === 'edit' ? (
        <div>
          <label className="mb-1 block text-sm font-medium">Classe de ativo</label>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
            {ASSET_CLASS_LABELS[input.assetClass] || input.assetClass}
          </div>
        </div>
      ) : null}

      {/* Valor atual */}
      <div>
        <label className="mb-1 block text-sm font-medium">Valor atual</label>
        <CurrencyInput
          value={input.currentValue}
          onChange={(value) => {
            setInput((prev) => ({ ...prev, currentValue: value }))
            setErrors((prev) => ({ ...prev, currentValue: undefined }))
          }}
        />
        {errors.currentValue && <p className="mt-1 text-sm text-red-600">{errors.currentValue}</p>}
      </div>

      {/* Taxa de retorno esperada */}
      <div>
        <label className="mb-1 block text-sm font-medium">Taxa de retorno anual (%)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="200"
          value={input.expectedReturnRatePercent}
          onChange={(e) => {
            setInput((prev) => ({ ...prev, expectedReturnRatePercent: parseFloat(e.target.value) || 0 }))
            setErrors((prev) => ({ ...prev, expectedReturnRatePercent: undefined }))
          }}
          placeholder="0.00"
          className="input-field"
        />
        {errors.expectedReturnRatePercent && (
          <p className="mt-1 text-sm text-red-600">{errors.expectedReturnRatePercent}</p>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded bg-black px-4 py-2 text-white disabled:bg-gray-400"
        >
          {isSubmitting ? 'Salvando...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded border border-gray-300 px-4 py-2 disabled:border-gray-200 disabled:text-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
