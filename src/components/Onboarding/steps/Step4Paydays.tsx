import type { OnboardingData, ValidationErrors } from '../../../hooks/useOnboarding'

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

      <div>
        <label className="mb-1 block text-sm font-medium">Dia do pagamento</label>
        <p className="mb-1 text-xs text-gray-500">
          Se você recebe uma vez por mês, é este o dia do seu salário. Se recebe duas
          vezes, coloque aqui o primeiro (ex.: adiantamento no dia 20).
        </p>
        <input
          type="number"
          min={1}
          max={31}
          value={data.payday1 || ''}
          onChange={(e) => onUpdateField('payday1', Number(e.target.value))}
          className="input-field"
        />
        {errors.payday1 && <p className="mt-1 text-sm text-red-600">{errors.payday1}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Dia do 2º pagamento (opcional)</label>
        <p className="mb-1 text-xs text-gray-500">
          Só preencha se você recebe salário duas vezes por mês (ex.: salário no dia 5,
          depois do adiantamento do dia 20). Deixe em branco se recebe uma única vez.
        </p>
        <input
          type="number"
          min={1}
          max={31}
          value={data.payday2 ?? ''}
          onChange={(e) =>
            onUpdateField('payday2', e.target.value === '' ? null : Number(e.target.value))
          }
          className="input-field"
        />
        {errors.payday2 && <p className="mt-1 text-sm text-red-600">{errors.payday2}</p>}
      </div>
    </div>
  )
}
