import {
  ALLOCATION_MODELS,
  calculateModelExpectedReturn,
  classifyModelOscillation,
  type AllocationModelKey,
} from '../../core/allocationModels'
import type { CustomAllocationErrors } from '../../hooks/useDistribution'
import type { CustomAllocation, DistributionModelChoice } from '../../types/distribution'
import FormField from '../Common/FormField'
import AllocationBar from './AllocationBar'
import AssetClassGlossary from './AssetClassGlossary'
import { formatPercent } from '../../utils/formatPercent'

interface AllocationModelPickerProps {
  value: DistributionModelChoice
  customValue: CustomAllocation
  errors?: CustomAllocationErrors
  onChange: (choice: DistributionModelChoice, custom?: CustomAllocation) => void
}

const PRESET_KEYS: AllocationModelKey[] = ['ALL_WEATHER', 'CONSERVATIVE', 'AGGRESSIVE']

const CUSTOM_LABELS: Record<keyof CustomAllocation, string> = {
  stocks: 'Ações',
  bonds: 'Renda Fixa',
  alternatives: 'Alternativos',
  cash: 'Caixa',
}

const MODEL_DESCRIPTIONS: Record<AllocationModelKey, string> = {
  ALL_WEATHER: 'Equilibra crescimento com segurança. Funciona bem em qualquer cenário econômico.',
  CONSERVATIVE: 'Prioriza segurança. Mais adequado para quem está próximo do objetivo.',
  AGGRESSIVE: 'Aposta no crescimento. Para quem pode correr mais risco e tem tempo para recuperar oscilações.',
}

const OSCILLATION_LABELS = { low: 'Oscilação baixa', medium: 'Oscilação média', high: 'Oscilação alta' }

// Componente 100% controlado (sem estado interno, sem botão salvar próprio) — quem o usa
// decide quando persistir. Sem uso desde que o Nível 2 saiu da tela de Distribuição (M5.8);
// volta na tela Investimentos (M5.9) como sugestão de estratégia.
// IDs dos inputs de "Personalizado" vêm de FormField/useId(), já únicos por instância —
// não precisa de um idPrefix manual mesmo renderizado mais de uma vez.
export default function AllocationModelPicker({
  value,
  customValue,
  errors,
  onChange,
}: AllocationModelPickerProps) {
  // CENÁRIO 39 (herdado do M5): trocar de modelo nunca apaga a customização salva —
  // só avisa antes, porque o usuário pode querer voltar para "Personalizado" depois.
  const handleSelect = (choice: DistributionModelChoice) => {
    if (value === 'CUSTOM' && choice !== 'CUSTOM') {
      const confirmed = window.confirm(
        'Trocar de modelo não apaga sua personalização — você pode voltar para "Personalizado" depois e seus valores continuam lá. Deseja trocar mesmo assim?'
      )
      if (!confirmed) return
    }
    onChange(choice, customValue)
  }

  const updateCustomField = (key: keyof CustomAllocation, fieldValue: number) => {
    onChange('CUSTOM', { ...customValue, [key]: fieldValue })
  }

  const customTotal = customValue.stocks + customValue.bonds + customValue.alternatives + customValue.cash

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRESET_KEYS.map((key) => {
          const model = ALLOCATION_MODELS[key]
          const expectedReturn = calculateModelExpectedReturn(model)
          const oscillation = classifyModelOscillation(model)
          const isSelected = value === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              aria-pressed={isSelected}
              className={`rounded border p-3 text-left transition-colors ${
                isSelected ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium">{model.label}</p>
                {isSelected && <span className="text-xs font-medium text-green-700">✓ Selecionado</span>}
              </div>
              <p className="mt-1 text-xs text-gray-600">{MODEL_DESCRIPTIONS[key]}</p>
              <div className="mt-2">
                <AllocationBar model={model} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">{OSCILLATION_LABELS[oscillation]}</p>
                <p className="text-xs text-gray-500">~{formatPercent(expectedReturn * 100)} a.a.</p>
              </div>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => handleSelect('CUSTOM')}
          aria-pressed={value === 'CUSTOM'}
          className={`rounded border p-3 text-left transition-colors ${
            value === 'CUSTOM' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <p className="font-medium">Personalizado</p>
            {value === 'CUSTOM' && <span className="text-xs font-medium text-green-700">✓ Selecionado</span>}
          </div>
          <p className="mt-1 text-xs text-gray-600">Monte sua própria divisão por classe.</p>
        </button>
      </div>

      {value === 'CUSTOM' && (
        <div className="space-y-3 rounded border border-gray-200 p-3">
          <p className="text-sm text-gray-700">
            Diga quanto de cada R$ 100 vai para cada classe — precisa fechar 100%.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-gray-600">Partir de:</span>
            {PRESET_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const preset = ALLOCATION_MODELS[key]
                  const customAlloc: CustomAllocation = {
                    stocks: Math.round(preset.stocks * 100),
                    bonds: Math.round(preset.bonds * 100),
                    alternatives: Math.round(preset.alternatives * 100),
                    cash: Math.round(preset.cash * 100),
                  }
                  // Uma única atualização com o objeto completo — chamar
                  // updateCustomField 4x seguidas partiria sempre do customValue
                  // antigo (vindo por prop, só atualiza no próximo render), e as
                  // 3 primeiras chamadas seriam descartadas pela última.
                  onChange('CUSTOM', customAlloc)
                }}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                {ALLOCATION_MODELS[key].label}
              </button>
            ))}
          </div>

          {(Object.keys(CUSTOM_LABELS) as (keyof CustomAllocation)[]).map((key) => (
            <FormField key={key} label={`${CUSTOM_LABELS[key]} (%)`} error={errors?.[key]}>
              {(fieldProps) => (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={customValue[key]}
                  onChange={(e) => updateCustomField(key, parseFloat(e.target.value) || 0)}
                  className="input-field"
                  {...fieldProps}
                />
              )}
            </FormField>
          ))}

          <div className="mt-3 space-y-2 rounded border border-gray-100 bg-gray-50 p-2">
            <AllocationBar
              model={{
                label: 'Personalizado',
                stocks: customValue.stocks / 100,
                bonds: customValue.bonds / 100,
                alternatives: customValue.alternatives / 100,
                cash: customValue.cash / 100,
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">
                {OSCILLATION_LABELS[classifyModelOscillation({
                  label: 'Personalizado',
                  stocks: customValue.stocks / 100,
                  bonds: customValue.bonds / 100,
                  alternatives: customValue.alternatives / 100,
                  cash: customValue.cash / 100,
                })]}
              </p>
              <p className="text-xs text-gray-500">
                ~
                {formatPercent(
                  calculateModelExpectedReturn({
                    label: 'Personalizado',
                    stocks: customValue.stocks / 100,
                    bonds: customValue.bonds / 100,
                    alternatives: customValue.alternatives / 100,
                    cash: customValue.cash / 100,
                  }) * 100
                )}{' '}
                a.a.
              </p>
            </div>
          </div>

          <div
            className={`rounded border p-2 text-sm font-medium ${
              errors?.total ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50'
            }`}
          >
            Soma: {formatPercent(customTotal)}
            {errors?.total && <p className="mt-1 font-normal">{errors.total}</p>}
          </div>
        </div>
      )}

      <AssetClassGlossary />
    </div>
  )
}
