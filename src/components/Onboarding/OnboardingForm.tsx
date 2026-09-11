import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOnboarding, TOTAL_STEPS } from '../../hooks/useOnboarding'
import Step1Goal from './steps/Step1Goal'
import Step2Patrimony from './steps/Step2Patrimony'
import Step3Income from './steps/Step3Income'
import Step4Paydays from './steps/Step4Paydays'
import Step5Review from './steps/Step5Review'

export default function OnboardingForm() {
  const { user, refreshCurrentUser } = useAuth()
  const navigate = useNavigate()
  const onboarding = useOnboarding(user?.uid)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (onboarding.loadingInitial) {
    return <div className="p-4 text-sm text-gray-500">Carregando...</div>
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      await onboarding.save(user.uid, user.email ?? '')
      await refreshCurrentUser()
      navigate('/', { replace: true })
    } catch {
      setSaveError('Não foi possível salvar seus dados. Tente novamente.')
      setSaving(false)
    }
  }

  function handlePrimaryAction() {
    if (onboarding.currentStep === TOTAL_STEPS) {
      void handleSave()
      return
    }
    onboarding.nextStep()
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-1 text-2xl font-semibold">
        {onboarding.isEditing ? 'Editar seu onboarding' : 'Completar seu onboarding'}
      </h1>

      <div className="mb-6 flex justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`h-2.5 w-2.5 rounded-full ${
              step <= onboarding.currentStep ? 'bg-black' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {onboarding.currentStep === 1 && (
        <Step1Goal
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {onboarding.currentStep === 2 && (
        <Step2Patrimony
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {onboarding.currentStep === 3 && (
        <Step3Income
          data={onboarding.data}
          errors={onboarding.errors}
          emergencyReserve={onboarding.emergencyReserve}
          onUpdateField={onboarding.updateField}
        />
      )}
      {onboarding.currentStep === 4 && (
        <Step4Paydays
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {onboarding.currentStep === 5 && (
        <Step5Review
          data={onboarding.data}
          emergencyReserve={onboarding.emergencyReserve}
          defaultDistribution={onboarding.defaultDistribution}
        />
      )}

      {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onboarding.prevStep}
          disabled={onboarding.currentStep === 1 || saving}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {onboarding.currentStep === TOTAL_STEPS
            ? saving
              ? 'Salvando...'
              : onboarding.isEditing
                ? 'Atualizar'
                : 'Confirmar e Salvar'
            : 'Próximo'}
        </button>
      </div>
    </div>
  )
}
