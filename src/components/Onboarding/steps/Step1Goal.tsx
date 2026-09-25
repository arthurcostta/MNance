import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import type { RiskProfile } from '../../../types/user'
import CurrencyInput from '../../Common/CurrencyInput'
import FormField from '../../Common/FormField'

interface Step1GoalProps {
  data: OnboardingData
  errors: ValidationErrors
  onUpdateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void
}

const RISK_PROFILES: { value: RiskProfile; label: string }[] = [
  { value: 'conservative', label: 'Conservador' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'aggressive', label: 'Agressivo' },
]

export default function Step1Goal({ data, errors, onUpdateField }: Step1GoalProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sua meta</h2>

      <FormField label="Seu nome" error={errors.name}>
        {(fieldProps) => (
          <input
            type="text"
            value={data.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label="Meta de patrimônio" error={errors.goalAmount}>
        {(fieldProps) => (
          <CurrencyInput
            value={data.goalAmount}
            onChange={(value) => onUpdateField('goalAmount', value)}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label="Prazo (anos)" error={errors.goalYears}>
        {(fieldProps) => (
          <input
            type="number"
            min={1}
            max={100}
            value={data.goalYears || ''}
            onChange={(e) => onUpdateField('goalYears', Number(e.target.value))}
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label="Perfil de risco">
        {(fieldProps) => (
          <select
            value={data.riskProfile}
            onChange={(e) => onUpdateField('riskProfile', e.target.value as RiskProfile)}
            className="input-field"
            {...fieldProps}
          >
            {RISK_PROFILES.map((profile) => (
              <option key={profile.value} value={profile.value}>
                {profile.label}
              </option>
            ))}
          </select>
        )}
      </FormField>
    </div>
  )
}
