import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Asset, AssetWithId } from '../types/asset'
import type { AssetClass } from '../core/assetReturnRates'
import { calculateWeightedReturn } from '../core/weightedReturn'
import {
  isContributionActive,
  resolveRemainingMonths,
  yearMonthOf,
  type YearMonth,
} from '../core/installments'
import {
  getAssets,
  addAsset as addAssetService,
  updateAsset as updateAssetService,
  archiveAsset as archiveAssetService,
  type AssetUpdate,
} from '../services/assetService'

export const MAX_REMAINING_INSTALLMENTS = 600

export interface AssetFormInput {
  name: string
  assetClass: AssetClass
  currentValue: number
  expectedReturnRatePercent: number
  instrumentKey?: string
  // Aporte mensal programado (R$); 0/ausente = sem aporte.
  monthlyContribution?: number
  // Parcelas restantes (mês corrente incluso); null/ausente = sem prazo. Só vale com aporte.
  remainingInstallments?: number | null
}

export interface AssetFormValues extends AssetFormInput {
  expectedReturnRate: number // em decimal (0.115 = 11.5%)
}

export type AssetFormErrors = Partial<Record<keyof AssetFormInput, string>>
export type AssetFormMode = 'add' | 'edit' | 'seed'

export function validateAssetForm(
  input: AssetFormInput,
  mode: AssetFormMode
): AssetFormErrors {
  const errors: AssetFormErrors = {}

  if (!input.name.trim()) {
    errors.name = 'Informe um nome para o ativo.'
  }

  const contribution = input.monthlyContribution ?? 0
  const hasContribution = contribution > 0

  // Ativo recém-contratado com aporte programado (ex.: consórcio) pode começar com saldo 0.
  if (!Number.isFinite(input.currentValue) || input.currentValue < 0 || (!hasContribution && input.currentValue === 0)) {
    errors.currentValue = hasContribution
      ? 'O valor não pode ser negativo.'
      : 'O valor precisa ser maior que zero (ou informe um aporte mensal programado).'
  }

  if (!Number.isFinite(contribution) || contribution < 0) {
    errors.monthlyContribution = 'O aporte mensal não pode ser negativo.'
  }

  const remaining = input.remainingInstallments
  if (remaining !== undefined && remaining !== null) {
    if (!hasContribution) {
      errors.remainingInstallments = 'Informe o aporte mensal para definir as parcelas restantes.'
    } else if (!Number.isInteger(remaining) || remaining < 1 || remaining > MAX_REMAINING_INSTALLMENTS) {
      errors.remainingInstallments = `Informe um número inteiro de parcelas entre 1 e ${MAX_REMAINING_INSTALLMENTS}.`
    }
  }

  if (isNaN(input.expectedReturnRatePercent) || !isFinite(input.expectedReturnRatePercent)) {
    errors.expectedReturnRatePercent = 'A taxa precisa ser um número válido.'
  } else if (input.expectedReturnRatePercent < 0 || input.expectedReturnRatePercent > 200) {
    errors.expectedReturnRatePercent = 'A taxa precisa estar entre 0% e 200%.'
  }

  if (mode === 'add' || mode === 'seed') {
    if (!input.instrumentKey) {
      errors.instrumentKey = 'Escolha um instrumento.'
    }
  }

  return errors
}

// Soma dos aportes programados ainda ativos hoje (valor > 0 e parcelas restantes), em R$/mês.
export function calculateCommittedContribution(
  assets: Pick<Asset, 'monthlyContribution' | 'contributionEndsAt'>[],
  today: YearMonth
): number {
  return assets.reduce((sum, asset) => {
    const remaining = resolveRemainingMonths(asset.contributionEndsAt, today)
    return isContributionActive(asset.monthlyContribution, remaining) ? sum + (asset.monthlyContribution ?? 0) : sum
  }, 0)
}

export function usePortfolio(uid: string | undefined) {
  const [rawAssets, setRawAssets] = useState<AssetWithId[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }

    let cancelled = false

    const fetchAssets = async () => {
      try {
        const all = await getAssets(uid)
        if (!cancelled) {
          setRawAssets(all)
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : 'Erro ao carregar ativos.')
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false)
        }
      }
    }

    fetchAssets()

    return () => {
      cancelled = true
    }
  }, [uid])

  const assets = useMemo(
    () =>
      rawAssets
        .filter((a) => a.status === 'active')
        .sort((a, b) => {
          const aTime = typeof a.createdAt === 'object' ? a.createdAt.toMillis() : 0
          const bTime = typeof b.createdAt === 'object' ? b.createdAt.toMillis() : 0
          return bTime - aTime
        }),
    [rawAssets]
  )

  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + a.currentValue, 0), [assets])

  const weightedReturn = useMemo(() => {
    if (assets.length === 0 || totalValue === 0) return 0
    return calculateWeightedReturn(assets.map((a) => ({ amount: a.currentValue, expectedReturnRate: a.expectedReturnRate })))
  }, [assets, totalValue])

  const committedContribution = useMemo(() => calculateCommittedContribution(assets, yearMonthOf(new Date())), [assets])

  const addAsset = useCallback(
    async (data: Omit<Asset, 'status' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) return
      setActionError(null)
      try {
        await addAssetService(uid, data)
        const updated = await getAssets(uid)
        setRawAssets(updated)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao adicionar ativo.')
        throw error
      }
    },
    [uid]
  )

  const updateAsset = useCallback(
    async (assetId: string, data: AssetUpdate) => {
      if (!uid) return
      setActionError(null)
      try {
        await updateAssetService(uid, assetId, data)
        const updated = await getAssets(uid)
        setRawAssets(updated)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao atualizar ativo.')
        throw error
      }
    },
    [uid]
  )

  const archiveAsset = useCallback(
    async (assetId: string) => {
      if (!uid) return
      setActionError(null)
      try {
        await archiveAssetService(uid, assetId)
        const updated = await getAssets(uid)
        setRawAssets(updated)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Erro ao arquivar ativo.')
        throw error
      }
    },
    [uid]
  )

  return {
    assets,
    totalValue,
    weightedReturn,
    committedContribution,
    loadingInitial,
    actionError,
    addAsset,
    updateAsset,
    archiveAsset,
  }
}
