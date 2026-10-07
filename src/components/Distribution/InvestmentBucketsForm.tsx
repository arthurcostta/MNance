import { useState } from 'react'
import {
  validateInvestmentBuckets,
  validateCustomAllocation,
  type CustomAllocationErrors,
  type InvestmentBucketErrors,
} from '../../hooks/useDistribution'
import type { CustomAllocation, InvestmentBucket } from '../../types/distribution'
import { generateId } from '../../utils/generateId'
import { formatPercent } from '../../utils/formatPercent'
import AllocationModelPicker from './AllocationModelPicker'
import AssetClassGlossary from './AssetClassGlossary'
import FormField from '../Common/FormField'
import Card from '../Common/Card'
import Alert from '../Common/Alert'
import Button from '../Common/Button'

interface InvestmentBucketsFormProps {
  initialBuckets: InvestmentBucket[]
  monthlyInvestment: number // Amount em R$ do que vai para investimentos
  onSave: (buckets: InvestmentBucket[]) => void | Promise<void>
  isSaving?: boolean
}

const DEFAULT_CUSTOM: CustomAllocation = { stocks: 30, bonds: 40, alternatives: 20, cash: 10 }

function createEmptyBucket(): InvestmentBucket {
  return {
    id: generateId(),
    name: '',
    percentOfInvestments: 0,
    allocationModel: 'ALL_WEATHER',
  }
}

export default function InvestmentBucketsForm({
  initialBuckets,
  monthlyInvestment,
  onSave,
  isSaving = false,
}: InvestmentBucketsFormProps) {
  const [buckets, setBuckets] = useState<InvestmentBucket[]>(initialBuckets)
  const [errors, setErrors] = useState<InvestmentBucketErrors>({ byBucket: {} })
  const [customErrors, setCustomErrors] = useState<Record<string, CustomAllocationErrors>>({})

  const total = buckets.reduce((sum, bucket) => sum + bucket.percentOfInvestments, 0)

  // M5.6: Ajustar para fechar 100% clicando
  const handleAdjustToFitBucket = (id: string) => {
    setBuckets((prev) => {
      const sumOthers = prev
        .filter((b) => b.id !== id)
        .reduce((sum, b) => sum + b.percentOfInvestments, 0)
      const remaining = Math.max(0, Math.min(100, 100 - sumOthers))
      return prev.map((b) => (b.id === id ? { ...b, percentOfInvestments: remaining } : b))
    })
  }

  const updateBucket = (id: string, patch: Partial<InvestmentBucket>) => {
    setBuckets((prev) => prev.map((bucket) => (bucket.id === id ? { ...bucket, ...patch } : bucket)))
  }

  const handleAdd = () => {
    // Sem auto-rebalancear os buckets existentes — mesma filosofia de sempre: o
    // indicador de soma acusa erro até o usuário ajustar manualmente.
    setBuckets((prev) => [...prev, createEmptyBucket()])
  }

  // Piso de 1 objetivo — estruturalmente impossível chegar a 0.
  const handleRemove = (id: string) => {
    setBuckets((prev) => (prev.length <= 1 ? prev : prev.filter((bucket) => bucket.id !== id)))
  }

  const handleSave = async () => {
    const bucketErrors = validateInvestmentBuckets(buckets)
    const nextCustomErrors: Record<string, CustomAllocationErrors> = {}

    for (const bucket of buckets) {
      if (bucket.allocationModel === 'CUSTOM') {
        const errs = validateCustomAllocation(bucket.customAllocation ?? DEFAULT_CUSTOM)
        if (Object.keys(errs).length > 0) nextCustomErrors[bucket.id] = errs
      }
    }

    setErrors(bucketErrors)
    setCustomErrors(nextCustomErrors)

    const hasErrors =
      Boolean(bucketErrors.total) ||
      Object.keys(bucketErrors.byBucket).length > 0 ||
      Object.keys(nextCustomErrors).length > 0
    if (hasErrors) return

    await onSave(buckets)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Nível 2 — Objetivos de investimento</h2>

      {/* M5.6: Introdução explicativa */}
      {monthlyInvestment > 0 ? (
        <Alert variant="info">
          Você investe{' '}
          <span className="font-medium">
            ≈{' '}
            {monthlyInvestment.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </span>{' '}
          por mês. Divida esse valor em objetivos — ex.: 60% para Casa + Carro 2031 e 40% para Aposentadoria. Cada objetivo tem sua própria estratégia de investimento.
        </Alert>
      ) : (
        <Alert variant="info">
          Defina uma porcentagem para Investimentos no Nível 1 para ver os valores em R$ de cada objetivo.
        </Alert>
      )}

      {/* M5.6: Resumo de soma no topo */}
      <div className="rounded border border-gray-300 p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Distribuído</p>
            <p className="mt-1 text-lg font-bold">{formatPercent(total)}</p>
          </div>
          <div
            className={`text-sm font-medium ${
              Math.abs(total - 100) < 0.01 ? 'text-green-700' : 'text-amber-700'
            }`}
          >
            {Math.abs(total - 100) < 0.01
              ? '✓ Fechado em 100%'
              : total < 100
                ? `Faltam ${formatPercent(100 - total)}`
                : `Excedeu ${formatPercent(total - 100)}`}
          </div>
        </div>
        <div className="mt-2 h-2 rounded bg-gray-200">
          <div
            className="h-full bg-green-400 transition-all"
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
      </div>

      {buckets.map((bucket) => {
        const bucketAmount = (monthlyInvestment * bucket.percentOfInvestments) / 100
        return (
          <Card key={bucket.id} className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-4">
                <FormField label="Nome do objetivo" error={errors.byBucket[bucket.id]?.name}>
                  {(fieldProps) => (
                    <input
                      type="text"
                      value={bucket.name}
                      onChange={(e) => updateBucket(bucket.id, { name: e.target.value })}
                      placeholder='Ex: "Casa + Carro 2031"'
                      className="input-field"
                      {...fieldProps}
                    />
                  )}
                </FormField>
                <FormField
                  label="Quanto do aporte mensal vai para este objetivo (%)"
                  error={errors.byBucket[bucket.id]?.percentOfInvestments}
                  hint={
                    monthlyInvestment > 0
                      ? `= ${bucketAmount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        })} por mês`
                      : undefined
                  }
                >
                  {(fieldProps) => (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={bucket.percentOfInvestments}
                      onChange={(e) =>
                        updateBucket(bucket.id, {
                          percentOfInvestments: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input-field"
                      {...fieldProps}
                    />
                  )}
                </FormField>

                {/* M5.6: Botão de atalho "Ajustar para fechar 100%" — mesma tolerância de
                    ponto flutuante do resumo do topo (CENÁRIO 38/93), não comparação exata */}
                {Math.abs(total - 100) >= 0.01 && (
                  <button
                    type="button"
                    onClick={() => handleAdjustToFitBucket(bucket.id)}
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    ↔ Ajustar para fechar 100%
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (bucket.name || bucket.percentOfInvestments > 0) {
                    const confirmed = window.confirm(
                      `Deseja remover o objetivo "${bucket.name || 'sem nome'}"? Esta ação não pode ser desfeita.`
                    )
                    if (!confirmed) return
                  }
                  handleRemove(bucket.id)
                }}
                disabled={buckets.length <= 1}
              >
                Remover
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Estratégia de investimento</p>
              <AllocationModelPicker
                value={bucket.allocationModel}
                customValue={bucket.customAllocation ?? DEFAULT_CUSTOM}
                errors={customErrors[bucket.id]}
                onChange={(choice, custom) =>
                  updateBucket(bucket.id, {
                    allocationModel: choice,
                    ...(custom ? { customAllocation: custom } : {}),
                  })
                }
              />
            </div>
          </Card>
        )
      })}

      <Button type="button" variant="secondary" onClick={handleAdd}>
        + Adicionar objetivo
      </Button>

      {errors.total && (
        <Alert variant="error" className="font-normal">
          {errors.total}
        </Alert>
      )}

      <AssetClassGlossary />

      <Button type="button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar objetivos de investimento'}
      </Button>
    </div>
  )
}
