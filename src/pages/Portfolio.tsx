import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePortfolio, type AssetFormInput, type AssetFormMode } from '../hooks/usePortfolio'
import type { AssetWithId } from '../types/asset'
import { updateUserDocument } from '../services/userService'
import AssetForm from '../components/Portfolio/AssetForm'
import AssetList from '../components/Portfolio/AssetList'
import SeedPatrimonyPrompt from '../components/Portfolio/SeedPatrimonyPrompt'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function Portfolio() {
  const { user, currentUser, refreshCurrentUser } = useAuth()
  const portfolio = usePortfolio(user?.uid)

  const [formMode, setFormMode] = useState<AssetFormMode | 'closed'>('closed')
  const [editingAsset, setEditingAsset] = useState<AssetWithId | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  if (portfolio.loadingInitial) {
    return <div className="p-4 text-sm text-gray-500">Carregando portfólio...</div>
  }

  const showSeedBanner =
    portfolio.assets.length === 0 &&
    currentUser?.currentPatrimony &&
    currentUser.currentPatrimony > 0 &&
    !currentUser.portfolioSeedDismissed &&
    formMode === 'closed'

  const handleSeedAccept = async () => {
    setFormSubmitting(true)
    setFormMode('seed')
    setFormSubmitting(false)
  }

  const handleSeedDismiss = async () => {
    if (!user) return
    try {
      await updateUserDocument(user.uid, { portfolioSeedDismissed: true })
      await refreshCurrentUser()
    } catch (error) {
      console.error('Erro ao dispensar seed:', error)
    }
  }

  const handleFormSubmit = async (data: AssetFormInput & { expectedReturnRate: number }) => {
    if (!user) return
    setFormSubmitting(true)
    try {
      if (formMode === 'add' || formMode === 'seed') {
        await portfolio.addAsset({
          name: data.name,
          assetClass: data.assetClass,
          currentValue: data.currentValue,
          expectedReturnRate: data.expectedReturnRate,
        })
        if (formMode === 'seed') {
          await updateUserDocument(user.uid, { portfolioSeedDismissed: true })
          await refreshCurrentUser()
        }
      } else if (formMode === 'edit' && editingAsset) {
        await portfolio.updateAsset(editingAsset.id, {
          name: data.name,
          currentValue: data.currentValue,
          expectedReturnRate: data.expectedReturnRate,
          assetClass: data.assetClass,
        })
      }
      setFormMode('closed')
      setEditingAsset(null)
    } catch (error) {
      console.error('Erro ao salvar ativo:', error)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEdit = (asset: AssetWithId) => {
    setEditingAsset(asset)
    setFormMode('edit')
  }

  const handleArchive = async (assetId: string) => {
    try {
      await portfolio.archiveAsset(assetId)
    } catch (error) {
      console.error('Erro ao arquivar:', error)
    }
  }

  const handleFormCancel = () => {
    setFormMode('closed')
    setEditingAsset(null)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Portfólio Total</h1>

      {/* Stat blocks */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-600">Valor Total Investido</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(portfolio.totalValue)}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-600">Retorno Ponderado</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {portfolio.totalValue > 0 ? `${(portfolio.weightedReturn * 100).toFixed(2)}% a.a.` : '—'}
          </p>
        </div>
      </div>

      {/* Seed banner */}
      {showSeedBanner && (
        <SeedPatrimonyPrompt
          amount={currentUser?.currentPatrimony || 0}
          onAccept={handleSeedAccept}
          onDismiss={handleSeedDismiss}
          isPending={formSubmitting}
        />
      )}

      {/* Form ou lista */}
      {formMode !== 'closed' ? (
        <div className="mb-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">
            {formMode === 'add' ? 'Adicionar Ativo' : formMode === 'seed' ? 'Criar Ativo Inicial' : 'Editar Ativo'}
          </h2>
          <AssetForm
            mode={formMode}
            initialValue={editingAsset ?? undefined}
            seedDefaultValue={formMode === 'seed' ? currentUser?.currentPatrimony : undefined}
            submitLabel={
              formMode === 'add' ? 'Adicionar' : formMode === 'seed' ? 'Criar e Dispensar Banner' : 'Atualizar'
            }
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isSubmitting={formSubmitting}
          />
        </div>
      ) : (
        <>
          <button
            onClick={() => setFormMode('add')}
            className="mb-6 rounded bg-black px-4 py-2 text-white"
          >
            + Adicionar Ativo
          </button>
          <AssetList assets={portfolio.assets} onEdit={handleEdit} onArchive={handleArchive} />
        </>
      )}

      {portfolio.actionError && <p className="mt-4 text-sm text-red-600">{portfolio.actionError}</p>}
    </div>
  )
}
