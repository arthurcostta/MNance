import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'
import FormField from '../../Common/FormField'

interface Step4PaydaysProps {
  data: OnboardingData
  errors: ValidationErrors
  onUpdateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void
}

export default function Step4Paydays({ data, errors, onUpdateField }: Step4PaydaysProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Dias de pagamento</h2>
      <p className="text-sm text-gray-600">
        Usamos essa informação para montar sua Agenda Financeira e simular quando o
        dinheiro entra na sua conta. Se você recebe o salário uma única vez por mês,
        preencha apenas o primeiro campo. Se recebe em duas parcelas — por exemplo, um
        adiantamento e o salário, ou dois pagamentos quinzenais — preencha os dois.
      </p>

      <FormField
        label="Dia do pagamento"
        error={errors.payday1}
        hint="Se você recebe uma vez por mês, é este o dia do seu salário. Se recebe duas vezes, coloque aqui o primeiro (ex.: adiantamento no dia 20)."
      >
        {(fieldProps) => (
          <input
            type="number"
            min={1}
            max={31}
            value={data.payday1 || ''}
            onChange={(e) => onUpdateField('payday1', Number(e.target.value))}
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField
        label="Dia do 2º pagamento (opcional)"
        error={errors.payday2}
        hint="Só preencha se você recebe salário duas vezes por mês (ex.: salário no dia 5, depois do adiantamento do dia 20). Deixe em branco se recebe uma única vez."
      >
        {(fieldProps) => (
          <input
            type="number"
            min={1}
            max={31}
            value={data.payday2 ?? ''}
            onChange={(e) =>
              onUpdateField('payday2', e.target.value === '' ? null : Number(e.target.value))
            }
            className="input-field"
            {...fieldProps}
          />
        )}
      </FormField>
    </div>
  )
}
