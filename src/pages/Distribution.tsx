import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDistribution } from '../hooks/useDistribution'
import type { PaydaySplit, InvestmentBucket } from '../types/distribution'
import NivelUmForm from '../components/Distribution/NivelUmForm'
import InvestmentBucketsForm from '../components/Distribution/InvestmentBucketsForm'
import EmergencyReserveCard from '../components/Distribution/EmergencyReserveCard'
import EssentialExpensesSection from '../components/Distribution/EssentialExpensesSection'
import Card from '../components/Common/Card'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'

export default function Distribution() {
  const { user, currentUser } = useAuth()
  const distribution = useDistribution(user?.uid)

  const [savingNivelUm, setSavingNivelUm] = useState(false)
  const [savingBuckets, setSavingBuckets] = useState(false)

  if (distribution.loading || !currentUser) {
    return <LoadingState label="Carregando distribuição..." />
  }

  const handleSaveNivelUm = async (payload: {
    payday1Split: PaydaySplit
    payday2Split?: PaydaySplit
    payday1IncomeSharePercent?: number
  }) => {
    setSavingNivelUm(true)
    try {
      await distribution.saveNivelUm(payload)
    } catch (error) {
      console.error('Erro ao salvar Nível 1:', error)
    } finally {
      setSavingNivelUm(false)
    }
  }

  const handleSaveBuckets = async (buckets: InvestmentBucket[]) => {
    setSavingBuckets(true)
    try {
      await distribution.saveInvestmentBuckets(buckets)
    } catch (error) {
      console.error('Erro ao salvar objetivos de investimento:', error)
    } finally {
      setSavingBuckets(false)
    }
  }

  const { goalCheck, blendedExpectedReturn } = distribution

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Distribuição de Renda</h1>

      <Card className="mb-6">
        <NivelUmForm
          hasSecondPayday={distribution.hasSecondPayday}
          initialPayday1={distribution.payday1Split}
          initialPayday2={distribution.payday2Split}
          initialIncomeSharePercent={distribution.payday1IncomeSharePercent}
          monthlyIncomeNet={currentUser.monthlyIncomeNet}
          onSave={handleSaveNivelUm}
          isSaving={savingNivelUm}
        />
      </Card>

      <Card className="mb-6">
        <InvestmentBucketsForm
          initialBuckets={distribution.investmentBuckets}
          onSave={handleSaveBuckets}
          isSaving={savingBuckets}
        />
      </Card>

      <div className="mb-6">
        <EmergencyReserveCard reserve={distribution.emergencyReserve} />
      </div>

      <div className="mb-6">
        <EssentialExpensesSection uid={user?.uid} essentialsBudget={distribution.amounts.essentials} />
      </div>

      {goalCheck && (
        <Card className="mb-6 text-sm">
          Retorno esperado: <span className="font-medium">{(blendedExpectedReturn * 100).toFixed(1)}% a.a.</span>
          {' — '}
          {goalCheck.reachable ? (
            <span className="font-medium text-green-700">bate sua meta ✅</span>
          ) : (
            <span className="font-medium text-amber-700">não bate sua meta dentro de {goalCheck.capYears} anos</span>
          )}
        </Card>
      )}

      {distribution.actionError && (
        <div className="mt-4">
          <Alert variant="error">{distribution.actionError}</Alert>
        </div>
      )}
    </div>
  )
}
