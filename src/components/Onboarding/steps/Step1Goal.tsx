import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import type { RiskProfile } from '../../../types/user'
import CurrencyInput from '../../Common/CurrencyInput'

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

      <div>
        <label className="mb-1 block text-sm font-medium">Seu nome</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onUpdateField('name', e.target.value)}
          className="input-field"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Meta de patrimônio</label>
        <CurrencyInput
          value={data.goalAmount}
          onChange={(value) => onUpdateField('goalAmount', value)}
        />
        {errors.goalAmount && <p className="mt-1 text-sm text-red-600">{errors.goalAmount}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Prazo (anos)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={data.goalYears || ''}
          onChange={(e) => onUpdateField('goalYears', Number(e.target.value))}
          className="input-field"
        />
        {errors.goalYears && <p className="mt-1 text-sm text-red-600">{errors.goalYears}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Perfil de risco</label>
        <select
          value={data.riskProfile}
          onChange={(e) => onUpdateField('riskProfile', e.target.value as RiskProfile)}
          className="input-field"
        >
          {RISK_PROFILES.map((profile) => (
            <option key={profile.value} value={profile.value}>
              {profile.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
