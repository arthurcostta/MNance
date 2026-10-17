import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOnboarding, TOTAL_STEPS, REVIEW_STEP } from '../../hooks/useOnboarding'
import Step1Goal from './steps/Step1Goal'
import Step2Patrimony from './steps/Step2Patrimony'
import Step3Income from './steps/Step3Income'
import Step4Paydays from './steps/Step4Paydays'
import Step5Review from './steps/Step5Review'
import LoadingState from '../Common/LoadingState'
import Alert from '../Common/Alert'
import Button from '../Common/Button'

export default function OnboardingForm() {
  const { user, refreshCurrentUser } = useAuth()
  const navigate = useNavigate()
  const onboarding = useOnboarding(user?.uid)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (onboarding.loadingInitial) {
    return <LoadingState />
  }

  const { isEditing, currentStep } = onboarding
  const onReview = currentStep === REVIEW_STEP

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await onboarding.save(user.uid, user.email ?? '')
      if (!saved) {
        // Algum bloco não passou na validação: o hook já levou o usuário até ele.
        setSaving(false)
        return
      }
      await refreshCurrentUser()
      navigate('/', { replace: true })
    } catch {
      setSaveError('Não foi possível salvar seus dados. Tente novamente.')
      setSaving(false)
    }
  }

  // Só existe em edição: quem ainda não concluiu o onboarding não tem para onde voltar.
  function handleCancel() {
    if (onboarding.isDirty && !window.confirm('Descartar as alterações do onboarding?')) return
    navigate('/account', { replace: true })
  }

  function handlePrimaryAction() {
    if (onReview) {
      void handleSave()
      return
    }
    if (isEditing) {
      onboarding.finishStepEdit()
      return
    }
    onboarding.nextStep()
  }

  function primaryLabel(): string {
    if (onReview) {
      if (saving) return 'Salvando...'
      return isEditing ? 'Atualizar' : 'Confirmar e Salvar'
    }
    return isEditing ? 'Voltar à revisão' : 'Próximo'
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-1 text-2xl font-semibold">
        {isEditing ? 'Editar seu onboarding' : 'Completar seu onboarding'}
      </h1>

      {isEditing ? (
        <p className="mb-6 text-sm text-gray-600">
          {onReview
            ? 'Seus dados já estão preenchidos. Toque em Alterar no bloco que quiser mudar.'
            : 'Altere o que precisar e volte à revisão para salvar.'}
        </p>
      ) : (
        <div className="mb-6 flex justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`h-2.5 w-2.5 rounded-full ${
                step <= currentStep ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      {currentStep === 1 && (
        <Step1Goal
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {currentStep === 2 && (
        <Step2Patrimony
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {currentStep === 3 && (
        <Step3Income
          data={onboarding.data}
          errors={onboarding.errors}
          emergencyReserve={onboarding.emergencyReserve}
          onUpdateField={onboarding.updateField}
        />
      )}
      {currentStep === 4 && (
        <Step4Paydays
          data={onboarding.data}
          errors={onboarding.errors}
          onUpdateField={onboarding.updateField}
        />
      )}
      {onReview && (
        <Step5Review
          data={onboarding.data}
          emergencyReserve={onboarding.emergencyReserve}
          defaultDistribution={onboarding.defaultDistribution}
          isEditing={isEditing}
          onEditStep={isEditing && !saving ? onboarding.goToStep : undefined}
        />
      )}

      {saveError && (
        <div className="mt-4">
          <Alert variant="error">{saveError}</Alert>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        {isEditing ? (
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onboarding.prevStep}
            disabled={currentStep === 1 || saving}
          >
            Voltar
          </Button>
        )}
        <Button type="button" onClick={handlePrimaryAction} disabled={saving}>
          {primaryLabel()}
        </Button>
      </div>
    </div>
  )
}
