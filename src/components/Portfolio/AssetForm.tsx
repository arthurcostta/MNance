import { useState } from 'react'
import { ASSET_RETURN_RATES } from '../../core/assetReturnRates'
import { validateAssetForm, type AssetFormInput, type AssetFormMode, type AssetFormErrors } from '../../hooks/usePortfolio'
import type { AssetWithId } from '../../types/asset'
import CurrencyInput from '../Common/CurrencyInput'
import FormField from '../Common/FormField'
import Button from '../Common/Button'

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
      <FormField label="Nome do ativo" error={errors.name}>
        {(fieldProps) => (
          <input
            type="text"
            value={input.name}
            onChange={(e) => {
              setInput((prev) => ({ ...prev, name: e.target.value }))
              setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            placeholder="Ex: Tesouro Selic, Ação Petrobras"
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>

      {(mode === 'add' || mode === 'seed') && (
        <FormField label="Tipo de instrumento" error={errors.instrumentKey}>
          {(fieldProps) => (
            <select
              value={input.instrumentKey ?? ''}
              onChange={(e) => handleInstrumentChange(e.target.value)}
              className="input-field"
              {...fieldProps}
            >
              <option value="">Escolha um instrumento...</option>
              {Object.entries(ASSET_RETURN_RATES).map(([key, rate]) => (
                <option key={key} value={key}>
                  {rate.label} ({(rate.annualRate * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
          )}
        </FormField>
      )}

      {mode === 'edit' ? (
        <div>
          <label className="mb-1 block text-sm font-medium">Classe de ativo</label>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
            {ASSET_CLASS_LABELS[input.assetClass] || input.assetClass}
          </div>
        </div>
      ) : null}

      <FormField label="Valor atual" error={errors.currentValue}>
        {(fieldProps) => (
          <CurrencyInput
            value={input.currentValue}
            onChange={(value) => {
              setInput((prev) => ({ ...prev, currentValue: value }))
              setErrors((prev) => ({ ...prev, currentValue: undefined }))
            }}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label="Taxa de retorno anual (%)" error={errors.expectedReturnRatePercent}>
        {(fieldProps) => (
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
            {...fieldProps}
          />
        )}
      </FormField>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
