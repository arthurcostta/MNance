import { useState } from 'react'
import { ASSET_RETURN_RATES } from '../../core/assetReturnRates'
import { remainingInstallments, yearMonthOf } from '../../core/installments'
import { validateAssetForm, type AssetFormInput, type AssetFormMode, type AssetFormErrors } from '../../hooks/usePortfolio'
import type { AssetWithId } from '../../types/asset'
import CurrencyInput from '../Common/CurrencyInput'
import FormField from '../Common/FormField'
import Button from '../Common/Button'
import { formatPercent } from '../../utils/formatPercent'

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
    monthlyContribution: initialValue?.monthlyContribution ?? 0,
  })

  // Parcelas em texto: um input numérico controlado descarta o que o usuário digita no meio da edição.
  // Vazio = sem prazo. Aporte já encerrado (0 parcelas) volta vazio — o usuário decide se renova.
  const [installmentsDraft, setInstallmentsDraft] = useState(() => {
    if (!initialValue?.contributionEndsAt) return ''
    const remaining = remainingInstallments(initialValue.contributionEndsAt, yearMonthOf(new Date()))
    return remaining > 0 ? String(remaining) : ''
  })
  const contributionEnded =
    initialValue?.contributionEndsAt !== undefined &&
    remainingInstallments(initialValue.contributionEndsAt, yearMonthOf(new Date())) === 0

  const [errors, setErrors] = useState<AssetFormErrors>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasContribution = (input.monthlyContribution ?? 0) > 0
    const trimmedInstallments = installmentsDraft.trim()
    const submitted: AssetFormInput = {
      ...input,
      remainingInstallments: hasContribution && trimmedInstallments !== '' ? Number(trimmedInstallments) : null,
    }

    const stepErrors = validateAssetForm(submitted, mode)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    try {
      await onSubmit({
        ...submitted,
        expectedReturnRate: submitted.expectedReturnRatePercent / 100,
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
                  {rate.label} ({formatPercent(rate.annualRate * 100)})
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

      <FormField
        label="Valor atual"
        error={errors.currentValue}
        hint="Pode ser R$ 0,00 se o ativo acabou de ser contratado e tem aporte mensal programado."
      >
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

      <fieldset className="space-y-3 rounded border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">Aporte mensal programado (opcional)</legend>
        <p className="text-xs text-gray-600">
          Para ativos em que você já se comprometeu a colocar um valor todo mês (consórcio, previdência, CDB
          programado). Esse valor sai da sua fatia de Investimentos e rende à taxa deste ativo.
        </p>

        <FormField label="Aporte mensal (R$)" error={errors.monthlyContribution}>
          {(fieldProps) => (
            <CurrencyInput
              value={input.monthlyContribution ?? 0}
              onChange={(value) => {
                setInput((prev) => ({ ...prev, monthlyContribution: value }))
                setErrors((prev) => ({ ...prev, monthlyContribution: undefined, currentValue: undefined }))
              }}
              {...fieldProps}
            />
          )}
        </FormField>

        {(input.monthlyContribution ?? 0) > 0 && (
          <FormField
            label="Parcelas restantes"
            error={errors.remainingInstallments}
            hint="Conte o mês atual. Deixe vazio se o aporte não tem data para terminar."
          >
            {(fieldProps) => (
              <input
                type="text"
                inputMode="numeric"
                value={installmentsDraft}
                onChange={(e) => {
                  setInstallmentsDraft(e.target.value)
                  setErrors((prev) => ({ ...prev, remainingInstallments: undefined }))
                }}
                placeholder="Ex: 60"
                className="input-field"
                {...fieldProps}
              />
            )}
          </FormField>
        )}

        {contributionEnded && (input.monthlyContribution ?? 0) > 0 && installmentsDraft === '' && (
          <p className="text-xs text-amber-700">
            O prazo anterior deste aporte já terminou. Informe as parcelas que ainda faltam para reativá-lo, ou deixe
            vazio para tratá-lo como permanente.
          </p>
        )}
      </fieldset>

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
