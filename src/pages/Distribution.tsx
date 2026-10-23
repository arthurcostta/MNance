import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDistribution } from '../hooks/useDistribution'
import type { PaydaySplit } from '../types/distribution'
import type { CustomCategory } from '../core/distributionCategories'
import NivelUmForm from '../components/Distribution/NivelUmForm'
import EmergencyReserveCard from '../components/Distribution/EmergencyReserveCard'
import EssentialExpensesSection from '../components/Distribution/EssentialExpensesSection'
import SurplusDestinationCard from '../components/Distribution/SurplusDestinationCard'
import PlannedContributionCard from '../components/Distribution/PlannedContributionCard'
import Card from '../components/Common/Card'
import Alert from '../components/Common/Alert'
import LoadingState from '../components/Common/LoadingState'

// A ordem da tela segue o fluxo do dinheiro: como a renda se divide → o que sobra das
// essenciais → para onde esse saldo vai → o aporte mensal planejado que resulta disso.
export default function Distribution() {
  const { user, currentUser } = useAuth()
  const distribution = useDistribution(user?.uid)

  const [savingNivelUm, setSavingNivelUm] = useState(false)

  if (distribution.loading || !currentUser) {
    return <LoadingState label="Carregando distribuição..." />
  }

  const handleSaveNivelUm = async (payload: {
    payday1Split: PaydaySplit
    payday2Split?: PaydaySplit
    payday1IncomeSharePercent?: number
    monthlyIncomeNet: number
    customCategories: CustomCategory[]
  }) => {
    setSavingNivelUm(true)
    try {
      await distribution.saveNivelUm(payload)
    } catch (error) {
      console.error('Erro ao salvar a divisão da renda:', error)
    } finally {
      setSavingNivelUm(false)
    }
  }

  const { flow, amounts } = distribution

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Distribuição de Renda</h1>

      <Card className="mb-6">
        <NivelUmForm
          hasSecondPayday={distribution.hasSecondPayday}
          initialPayday1={distribution.payday1Split}
          initialPayday2={distribution.payday2Split}
          initialIncomeSharePercent={distribution.payday1IncomeSharePercent}
          initialCategories={distribution.customCategories}
          monthlyIncomeNet={currentUser.monthlyIncomeNet}
          onSave={handleSaveNivelUm}
          isSaving={savingNivelUm}
        />
      </Card>

      <div className="mb-6">
        <EssentialExpensesSection
          expenses={distribution.essentialExpenses}
          essentialsBudget={amounts.essentials}
        />
      </div>

      <div className="mb-6">
        <SurplusDestinationCard
          flow={flow}
          savedPercent={distribution.surplusInvestmentsPercent}
          hasEssentialsList={distribution.hasEssentialsList}
          baseInvestments={amounts.investments}
          baseLeisure={amounts.leisure}
          onSave={distribution.saveSurplusRule}
        />
      </div>

      <div className="mb-6">
        <EmergencyReserveCard reserve={distribution.emergencyReserve} />
      </div>

      <div className="mb-6">
        <PlannedContributionCard flow={flow} baseInvestments={amounts.investments} />
      </div>

      {distribution.actionError && (
        <div className="mt-4">
          <Alert variant="error">{distribution.actionError}</Alert>
        </div>
      )}
    </div>
  )
}
