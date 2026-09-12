import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Asset, AssetWithId } from '../types/asset'
import type { AssetClass } from '../core/assetReturnRates'
import { calculateWeightedReturn } from '../core/weightedReturn'
import { getAssets, addAsset as addAssetService, updateAsset as updateAssetService, archiveAsset as archiveAssetService } from '../services/assetService'

export interface AssetFormInput {
  name: string
  assetClass: AssetClass
  currentValue: number
  expectedReturnRatePercent: number
  instrumentKey?: string
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

  if (input.currentValue <= 0) {
    errors.currentValue = 'O valor precisa ser maior que zero.'
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
    async (assetId: string, data: Partial<Omit<Asset, 'status' | 'createdAt' | 'updatedAt'>>) => {
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
    loadingInitial,
    actionError,
    addAsset,
    updateAsset,
    archiveAsset,
  }
}
