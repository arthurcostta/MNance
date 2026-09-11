import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import CurrencyInput from '../../Common/CurrencyInput'

interface Step2PatrimonyProps {
  data: OnboardingData
  errors: ValidationErrors
  onUpdateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void
}

export default function Step2Patrimony({ data, errors, onUpdateField }: Step2PatrimonyProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Seu patrimônio atual</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">Patrimônio atual</label>
        <CurrencyInput
          value={data.currentPatrimony}
          onChange={(value) => onUpdateField('currentPatrimony', value)}
        />
        {errors.currentPatrimony && (
          <p className="mt-1 text-sm text-red-600">{errors.currentPatrimony}</p>
        )}
      </div>
    </div>
  )
}
