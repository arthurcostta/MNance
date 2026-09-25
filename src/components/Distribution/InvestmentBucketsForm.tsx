import { useState } from 'react'
import {
  validateInvestmentBuckets,
  validateCustomAllocation,
  type CustomAllocationErrors,
  type InvestmentBucketErrors,
} from '../../hooks/useDistribution'
import type { CustomAllocation, InvestmentBucket } from '../../types/distribution'
import AllocationModelPicker from './AllocationModelPicker'
import FormField from '../Common/FormField'
import Card from '../Common/Card'
import Button from '../Common/Button'

interface InvestmentBucketsFormProps {
  initialBuckets: InvestmentBucket[]
  onSave: (buckets: InvestmentBucket[]) => void | Promise<void>
  isSaving?: boolean
}

const DEFAULT_CUSTOM: CustomAllocation = { stocks: 30, bonds: 40, alternatives: 20, cash: 10 }

function createEmptyBucket(): InvestmentBucket {
  return {
    id: crypto.randomUUID(),
    name: '',
    percentOfInvestments: 0,
    allocationModel: 'ALL_WEATHER',
  }
}

export default function InvestmentBucketsForm({
  initialBuckets,
  onSave,
  isSaving = false,
}: InvestmentBucketsFormProps) {
  const [buckets, setBuckets] = useState<InvestmentBucket[]>(initialBuckets)
  const [errors, setErrors] = useState<InvestmentBucketErrors>({ byBucket: {} })
  const [customErrors, setCustomErrors] = useState<Record<string, CustomAllocationErrors>>({})

  const total = buckets.reduce((sum, bucket) => sum + bucket.percentOfInvestments, 0)

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

      {buckets.map((bucket) => (
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
                label="% dos investimentos"
                error={errors.byBucket[bucket.id]?.percentOfInvestments}
              >
                {(fieldProps) => (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={bucket.percentOfInvestments}
                    onChange={(e) =>
                      updateBucket(bucket.id, { percentOfInvestments: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field"
                    {...fieldProps}
                  />
                )}
              </FormField>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleRemove(bucket.id)}
              disabled={buckets.length <= 1}
            >
              Remover
            </Button>
          </div>

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
        </Card>
      ))}

      <Button type="button" variant="secondary" onClick={handleAdd}>
        + Adicionar objetivo
      </Button>

      <div
        className={`rounded border p-3 text-sm font-medium ${
          errors.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
        }`}
      >
        Soma: {total.toFixed(1)}%{errors.total && <p className="mt-1 font-normal">{errors.total}</p>}
      </div>

      <Button type="button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar objetivos de investimento'}
      </Button>
    </div>
  )
}
