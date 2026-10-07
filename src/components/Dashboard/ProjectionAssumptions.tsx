/**
 * Painel de premissas da projeção — exibe os dados que o motor usa para calcular
 * o tempo até a meta e o gráfico, permitindo auditoria e edição da inflação.
 */

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { formatPercent } from '../../utils/formatPercent'

interface ProjectionAssumptionsProps {
  assetCount: number
  totalValue: number
  portfolioWeightedReturn: number
  investmentsPlan: number
  inflationRate: number
  onInflationChange: (rate: number) => Promise<void>
}

export function ProjectionAssumptions({
  assetCount,
  totalValue,
  portfolioWeightedReturn,
  investmentsPlan,
  inflationRate,
  onInflationChange,
}: ProjectionAssumptionsProps) {
  const { currentUser } = useAuth()
  const [editingInflation, setEditingInflation] = useState(false)
  const [inflationValue, setInflationValue] = useState(inflationRate * 100)
  const [saving, setSaving] = useState(false)

  const handleSaveInflation = async () => {
    setSaving(true)
    try {
      await onInflationChange(inflationValue / 100)
      setEditingInflation(false)
    } catch (err) {
      console.error('Erro ao salvar inflação:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <details className="border border-gray-200 rounded bg-white p-4 my-4">
      <summary className="cursor-pointer font-semibold text-sm">
        📊 Como esta projeção é calculada
      </summary>

      <div className="mt-4 space-y-4 text-sm">
        {/* Patrimônio */}
        <div>
          <div className="font-semibold text-xs uppercase tracking-wide text-gray-600 mb-2">
            Patrimônio Atual
          </div>
          {assetCount > 0 ? (
            <div className="text-gray-700">
              {assetCount} ativo(s) · Total: <span className="font-semibold">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <br />
              Retorno médio nominal: <span className="font-semibold">{formatPercent(portfolioWeightedReturn)}</span>
            </div>
          ) : (
            <div className="text-gray-600 italic">
              Estimativa do onboarding: R$ {(currentUser?.currentPatrimony ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <br />
              Retorno: {formatPercent(portfolioWeightedReturn)} (estratégia do seu perfil)
              <br />
              <span className="text-xs text-amber-600">⚠️ Cadastre seus ativos no Portfólio para um Radar preciso.</span>
            </div>
          )}
        </div>

        {/* Aportes */}
        <div>
          <div className="font-semibold text-xs uppercase tracking-wide text-gray-600 mb-2">
            Aporte Mensal Planejado
          </div>
          <div className="text-gray-700">
            <span className="font-semibold">R$ {investmentsPlan.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <br />
            <span className="text-xs text-gray-500">
              = fatia de Investimentos + saldo das essenciais (conforme sua regra)
            </span>
          </div>
        </div>

        {/* Inflação */}
        <div>
          <div className="font-semibold text-xs uppercase tracking-wide text-gray-600 mb-2">
            Inflação Esperada
          </div>
          {!editingInflation ? (
            <div className="flex items-center justify-between">
              <div className="text-gray-700">
                <span className="font-semibold">{formatPercent(inflationRate)} a.a.</span>
                <br />
                <span className="text-xs text-gray-500">Valores da projeção estão em "valores de hoje"</span>
              </div>
              <button
                onClick={() => setEditingInflation(true)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Editar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label htmlFor="inflation-input" className="text-xs text-gray-600 block mb-1">
                    % a.a.
                  </label>
                  <input
                    id="inflation-input"
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={inflationValue}
                    onChange={(e) => setInflationValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveInflation}
                  disabled={saving}
                  className="px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => {
                    setInflationValue(inflationRate * 100)
                    setEditingInflation(false)
                  }}
                  className="px-3 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
              {inflationValue === 0 && (
                <p className="text-xs text-amber-600">
                  0% = projeção em valores nominais (comportamento anterior)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Limitações */}
        <div>
          <div className="font-semibold text-xs uppercase tracking-wide text-gray-600 mb-2">
            Limitações
          </div>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Retornos brutos (sem imposto de renda ou taxas)</li>
            <li>Renda e aportes constantes em valores de hoje (sem aumentos reais)</li>
            <li>Lazer, Educação e Caixa da Empresa não entram na projeção — só o que você investe</li>
          </ul>
        </div>
      </div>
    </details>
  )
}
