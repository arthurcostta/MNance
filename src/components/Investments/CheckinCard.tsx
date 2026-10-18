import { useMemo, useState } from 'react'
import type { CheckinSlot, PlannedRow, SlotSubmission } from '../../hooks/useInvestments'
import type { AssetFormInput } from '../../hooks/usePortfolio'
import type { NewAssetDraft } from '../../types/checkin'
import { deriveCheckinStatus } from '../../core/checkin'
import { endsAtFromRemaining, yearMonthOf } from '../../core/installments'
import AssetForm from '../Portfolio/AssetForm'
import Alert from '../Common/Alert'
import Button from '../Common/Button'
import Card from '../Common/Card'
import CurrencyInput from '../Common/CurrencyInput'
import FormField from '../Common/FormField'
import { formatBRL } from '../../utils/formatCurrency'

interface CheckinCardProps {
  slot: CheckinSlot
  label: string
  rows: PlannedRow[]
  submitting: boolean
  submitError: string | null
  onConfirm: (submission: SlotSubmission) => void
  onSkip: () => void
}

const STATUS_LABEL = {
  on_plan: 'Como programado',
  below: 'Investiu menos',
  above: 'Investiu mais',
  skipped: 'Não investi',
} as const

// Um dia de investir: pergunta única, linhas dos ativos com o valor já preenchido e, se for o caso,
// ativo novo criado no próprio check-in (ele aparece no Portfólio depois da gravação).
export default function CheckinCard({
  slot,
  label,
  rows,
  submitting,
  submitError,
  onConfirm,
  onSkip,
}: CheckinCardProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(rows.map((r) => [r.assetId, r.planned]))
  )
  const [newAssets, setNewAssets] = useState<{ draft: NewAssetDraft; invested: number }[]>([])
  const [showNewAsset, setShowNewAsset] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const investedFromAssets = rows.reduce((sum, r) => sum + (values[r.assetId] ?? 0), 0)
  const investedFromNew = newAssets.reduce((sum, n) => sum + n.invested, 0)
  const investedTotal = investedFromAssets + investedFromNew
  const liveStatus = deriveCheckinStatus(slot.plannedTotal, investedTotal)
  const missing = Math.max(0, slot.plannedTotal - investedTotal)
  const firstRow = rows[0]

  const plannedFromAssets = useMemo(() => rows.reduce((sum, r) => sum + r.planned, 0), [rows])

  if (slot.checkin) {
    const c = slot.checkin
    return (
      <Card>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{label}</p>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs">{STATUS_LABEL[c.status]}</span>
        </div>
        <p className="mt-2 text-sm text-gray-700">
          Programado {formatBRL(c.plannedTotal)} · investido{' '}
          <span className="font-semibold">{formatBRL(c.investedTotal)}</span>
        </p>
        {c.allocations.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {c.allocations.map((a) => (
              <li key={a.assetId} className="flex justify-between">
                <span>
                  {a.assetName}
                  {a.isNew ? ' (novo)' : ''}
                </span>
                <span>{formatBRL(a.invested)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    )
  }

  if (slot.state === 'upcoming') {
    return (
      <Card className="bg-gray-50">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-gray-600">
          Você poderá responder a partir do dia desse investimento. Plano deste dia: {formatBRL(slot.plannedTotal)}.
        </p>
      </Card>
    )
  }

  const handleAddNewAsset = (data: AssetFormInput & { expectedReturnRate: number }) => {
    if (data.currentValue <= 0) {
      setFormError('Informe quanto você investiu nesse ativo.')
      return
    }
    const hasContribution = (data.monthlyContribution ?? 0) > 0
    const today = yearMonthOf(new Date())
    setNewAssets((prev) => [
      ...prev,
      {
        draft: {
          name: data.name,
          assetClass: data.assetClass,
          expectedReturnRate: data.expectedReturnRate,
          ...(hasContribution ? { monthlyContribution: data.monthlyContribution } : {}),
          ...(hasContribution && data.remainingInstallments
            ? { contributionEndsAt: endsAtFromRemaining(data.remainingInstallments, today) }
            : {}),
        },
        invested: data.currentValue,
      },
    ])
    setShowNewAsset(false)
    setFormError(null)
  }

  const handleConfirm = () => {
    setFormError(null)
    onConfirm({
      slot: slot.slot,
      plannedTotal: slot.plannedTotal,
      rows: rows.map((r) => ({
        assetId: r.assetId,
        planned: r.planned,
        invested: values[r.assetId] ?? 0,
      })),
      newAssets,
    })
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{label}</p>
        <span className="text-xs text-gray-600">Plano: {formatBRL(slot.plannedTotal)}</span>
      </div>

      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <FormField key={row.assetId} label={row.name} hint={`Programado: ${formatBRL(row.planned)}`}>
            {(fieldProps) => (
              <CurrencyInput
                value={values[row.assetId] ?? 0}
                onChange={(v) => setValues((prev) => ({ ...prev, [row.assetId]: v }))}
                {...fieldProps}
              />
            )}
          </FormField>
        ))}

        {newAssets.map((n, index) => (
          <div key={index} className="flex items-center justify-between rounded border border-dashed border-gray-300 p-2 text-sm">
            <span>
              {n.draft.name} <span className="text-xs text-gray-500">(novo)</span>
            </span>
            <span className="flex items-center gap-3">
              {formatBRL(n.invested)}
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setNewAssets((prev) => prev.filter((_, i) => i !== index))}
              >
                Remover
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Total: {formatBRL(investedTotal)}</span>
        <span className="text-gray-500">· {STATUS_LABEL[liveStatus]}</span>
        {missing > 0 && firstRow && (
          <button
            type="button"
            className="text-xs underline"
            onClick={() =>
              setValues((prev) => ({ ...prev, [firstRow.assetId]: (prev[firstRow.assetId] ?? 0) + missing }))
            }
          >
            Jogar os {formatBRL(missing)} que faltam em {firstRow.name}
          </button>
        )}
      </div>

      {plannedFromAssets < slot.plannedTotal && (
        <p className="mt-1 text-xs text-gray-500">
          Faltam alocar {formatBRL(slot.plannedTotal - plannedFromAssets)} do plano deste dia.
        </p>
      )}

      {showNewAsset ? (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-sm font-medium">Investimento novo</p>
          <AssetForm
            mode="add"
            submitLabel="Adicionar ao check-in"
            onSubmit={handleAddNewAsset}
            onCancel={() => setShowNewAsset(false)}
          />
        </div>
      ) : (
        <button type="button" className="mt-3 text-sm underline" onClick={() => setShowNewAsset(true)}>
          + Investi em algo novo
        </button>
      )}

      {formError && (
        <div className="mt-3">
          <Alert variant="error">{formError}</Alert>
        </div>
      )}
      {submitError && (
        <div className="mt-3">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="secondary" type="button" onClick={onSkip} disabled={submitting}>
          Não investi este mês
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || (investedTotal === 0 && newAssets.length === 0)}
        >
          {submitting ? 'Salvando...' : 'Confirmar aportes'}
        </Button>
      </div>
    </Card>
  )
}
