import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDistribution, type NivelUmInput } from '../hooks/useDistribution'
import type { CustomAllocation, DistributionModelChoice } from '../types/distribution'
import NivelUmForm from '../components/Distribution/NivelUmForm'
import AllocationModelPicker from '../components/Distribution/AllocationModelPicker'
import EmergencyReserveCard from '../components/Distribution/EmergencyReserveCard'

export default function Distribution() {
  const { user, currentUser } = useAuth()
  const distribution = useDistribution(user?.uid)

  const [savingNivelUm, setSavingNivelUm] = useState(false)
  const [savingNivelDois, setSavingNivelDois] = useState(false)

  if (distribution.loading || !currentUser) {
    return <div className="p-4 text-sm text-gray-500">Carregando distribuição...</div>
  }

  const handleSaveNivelUm = async (values: NivelUmInput) => {
    setSavingNivelUm(true)
    try {
      await distribution.saveNivelUm(values)
    } catch (error) {
      console.error('Erro ao salvar Nível 1:', error)
    } finally {
      setSavingNivelUm(false)
    }
  }

  const handleSaveNivelDois = async (choice: DistributionModelChoice, custom?: CustomAllocation) => {
    setSavingNivelDois(true)
    try {
      await distribution.saveNivelDois(choice, custom)
    } catch (error) {
      console.error('Erro ao salvar Nível 2:', error)
    } finally {
      setSavingNivelDois(false)
    }
  }

  const { goalCheck, expectedReturn } = distribution

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Distribuição de Renda</h1>

      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <NivelUmForm
          initialValue={distribution.nivelUm}
          monthlyIncomeNet={currentUser.monthlyIncomeNet}
          onSave={handleSaveNivelUm}
          isSaving={savingNivelUm}
        />
      </div>

      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <AllocationModelPicker
          modelChoice={distribution.modelChoice}
          customAllocation={distribution.customAllocation}
          onSave={handleSaveNivelDois}
          isSaving={savingNivelDois}
        />
      </div>

      <div className="mb-6">
        <EmergencyReserveCard reserve={distribution.emergencyReserve} />
      </div>

      {goalCheck && (
        <div className="mb-6 rounded border border-gray-200 bg-white p-4 text-sm">
          Retorno esperado: <span className="font-medium">{(expectedReturn * 100).toFixed(1)}% a.a.</span>
          {' — '}
          {goalCheck.reachable ? (
            <span className="font-medium text-green-700">bate sua meta ✅</span>
          ) : (
            <span className="font-medium text-amber-700">não bate sua meta dentro de {goalCheck.capYears} anos</span>
          )}
        </div>
      )}

      {distribution.actionError && <p className="mt-4 text-sm text-red-600">{distribution.actionError}</p>}
    </div>
  )
}
