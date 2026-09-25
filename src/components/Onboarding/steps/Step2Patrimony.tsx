import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import CurrencyInput from '../../Common/CurrencyInput'
import FormField from '../../Common/FormField'

interface Step2PatrimonyProps {
  data: OnboardingData
  errors: ValidationErrors
  onUpdateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void
}

export default function Step2Patrimony({ data, errors, onUpdateField }: Step2PatrimonyProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Seu patrimônio atual</h2>

      <FormField label="Patrimônio atual" error={errors.currentPatrimony}>
        {(fieldProps) => (
          <CurrencyInput
            value={data.currentPatrimony}
            onChange={(value) => onUpdateField('currentPatrimony', value)}
            {...fieldProps}
          />
        )}
      </FormField>
    </div>
  )
}
