import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePortfolio, type AssetFormInput, type AssetFormMode } from '../hooks/usePortfolio'
import type { AssetWithId } from '../types/asset'
import { endsAtFromRemaining, yearMonthOf } from '../core/installments'
import { updateUserDocument } from '../services/userService'
import AssetForm from '../components/Portfolio/AssetForm'
import AssetList from '../components/Portfolio/AssetList'
import SeedPatrimonyPrompt from '../components/Portfolio/SeedPatrimonyPrompt'
import Card from '../components/Common/Card'
import Button from '../components/Common/Button'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'
import { formatPercent } from '../utils/formatPercent'

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
    return <LoadingState label="Carregando portfólio..." />
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
    const hasContribution = (data.monthlyContribution ?? 0) > 0
    const endsAt =
      hasContribution && data.remainingInstallments
        ? endsAtFromRemaining(data.remainingInstallments, yearMonthOf(new Date()))
        : null
    setFormSubmitting(true)
    try {
      if (formMode === 'add' || formMode === 'seed') {
        await portfolio.addAsset({
          name: data.name,
          assetClass: data.assetClass,
          currentValue: data.currentValue,
          expectedReturnRate: data.expectedReturnRate,
          ...(hasContribution ? { monthlyContribution: data.monthlyContribution } : {}),
          ...(endsAt ? { contributionEndsAt: endsAt } : {}),
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
          // null remove o campo do documento (aporte desligado ou sem prazo).
          monthlyContribution: hasContribution ? data.monthlyContribution : null,
          contributionEndsAt: endsAt ?? null,
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

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-medium text-gray-600">Valor Total Investido</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(portfolio.totalValue)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-600">Retorno Ponderado</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {portfolio.totalValue > 0 ? `${formatPercent(portfolio.weightedReturn * 100, 2)} a.a.` : '—'}
          </p>
        </Card>
        {portfolio.committedContribution > 0 && (
          <Card className="col-span-2">
            <p className="text-xs font-medium text-gray-600">Aportes programados</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {formatCurrency(portfolio.committedContribution)}/mês
            </p>
            <p className="mt-1 text-xs text-gray-500">Saem da sua fatia de Investimentos (veja o Radar).</p>
          </Card>
        )}
      </div>

      {showSeedBanner && (
        <SeedPatrimonyPrompt
          amount={currentUser?.currentPatrimony || 0}
          onAccept={handleSeedAccept}
          onDismiss={handleSeedDismiss}
          isPending={formSubmitting}
        />
      )}

      {formMode !== 'closed' ? (
        <Card className="mb-6">
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
        </Card>
      ) : (
        <>
          <Button onClick={() => setFormMode('add')} className="mb-6">
            + Adicionar Ativo
          </Button>
          <AssetList assets={portfolio.assets} onEdit={handleEdit} onArchive={handleArchive} />
        </>
      )}

      {portfolio.actionError && (
        <div className="mt-4">
          <Alert variant="error">{portfolio.actionError}</Alert>
        </div>
      )}
    </div>
  )
}
