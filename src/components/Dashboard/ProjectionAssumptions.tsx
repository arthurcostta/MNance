// Painel "Como esta projeção é calculada": mostra exatamente o que o motor está usando, para o usuário
// poder auditar o número do Radar, e permite editar a inflação (única premissa editável por enquanto).

import { useState } from 'react'
import { formatPercent } from '../../utils/formatPercent'
import {
  MAX_LONG_RUN_NOMINAL_RATE,
  PROJECTION_HORIZON_YEARS,
  SCENARIO_REAL_RATE_SHIFT,
} from '../../core/portfolioProjection'
import type { ProjectionAssumptionsData } from '../../hooks/useProjection'

interface ProjectionAssumptionsProps {
  assumptions: ProjectionAssumptionsData
  onInflationChange: (rate: number) => Promise<void>
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// As taxas do motor são frações (0.105); formatPercent espera percentual (10.5).
function formatRate(fraction: number): string {
  return formatPercent(fraction * 100)
}

function formatShift(fraction: number): string {
  const points = Math.abs(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${fraction < 0 ? '−' : '+'}${points} p.p.`
}

const SECTION_TITLE = 'mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'

const MAX_INFLATION_PERCENT = 30

// Rascunho do campo em texto: um input numérico controlado descarta o separador decimal enquanto o usuário
// digita ("4." vira "" e depois 0), então só interpretamos o valor ao salvar. Aceita vírgula ou ponto.
function parseInflationDraft(draft: string): number | null {
  const parsed = Number(draft.trim().replace(',', '.'))
  if (draft.trim() === '' || !Number.isFinite(parsed) || parsed < 0 || parsed > MAX_INFLATION_PERCENT) return null
  return parsed
}

function toDraft(rate: number): string {
  return String(Math.round(rate * 1000) / 10).replace('.', ',')
}

export function ProjectionAssumptions({ assumptions, onInflationChange }: ProjectionAssumptionsProps) {
  const [editingInflation, setEditingInflation] = useState(false)
  const [inflationDraft, setInflationDraft] = useState(toDraft(assumptions.inflationRate))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const draftPercent = parseInflationDraft(inflationDraft)

  const handleSaveInflation = async () => {
    if (draftPercent === null) {
      setSaveError(`Informe um valor entre 0 e ${MAX_INFLATION_PERCENT}%.`)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onInflationChange(draftPercent / 100)
      setEditingInflation(false)
    } catch (err) {
      console.error('Erro ao salvar inflação:', err)
      setSaveError('Não foi possível salvar a inflação. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = () => {
    setInflationDraft(toDraft(assumptions.inflationRate))
    setSaveError(null)
    setEditingInflation(true)
  }

  return (
    <details open className="my-4 rounded border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">📊 Como esta projeção é calculada</summary>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <div className={SECTION_TITLE}>Patrimônio atual</div>
          {assumptions.estimated ? (
            <div className="text-gray-700">
              Estimativa do onboarding: <span className="font-semibold">{formatBRL(assumptions.startingPatrimony)}</span>
              <br />
              <span className="text-xs text-amber-700">
                ⚠️ Nenhum ativo cadastrado — cadastre seus ativos no Portfólio para um Radar preciso.
              </span>
            </div>
          ) : (
            <div className="text-gray-700">
              {assumptions.assetCount} ativo(s) · total{' '}
              <span className="font-semibold">{formatBRL(assumptions.startingPatrimony)}</span>
            </div>
          )}
        </div>

        <div>
          <div className={SECTION_TITLE}>Retorno esperado</div>
          <div className="text-gray-700">
            <span className="font-semibold">{formatRate(assumptions.nominalRate)} a.a.</span> nominal{' '}
            {assumptions.rateSource === 'strategy'
              ? '(estratégia do seu perfil de risco)'
              : '(média ponderada dos seus ativos)'}
            <br />
            Descontada a inflação:{' '}
            <span className="font-semibold">{formatRate(assumptions.realRate)} a.a.</span> real — é essa taxa que o
            gráfico usa.
          </div>
          {assumptions.cappedAssets.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-700">
              {assumptions.cappedAssets.map((asset, index) => (
                <li key={`${asset.name ?? 'ativo'}-${index}`}>
                  {asset.name ?? 'Ativo'}: informado {formatRate(asset.informedRate)} → usado{' '}
                  {formatRate(asset.usedRate)} na projeção (teto de longo prazo de{' '}
                  {formatRate(MAX_LONG_RUN_NOMINAL_RATE)}; nenhum ativo rende isso por décadas).
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className={SECTION_TITLE}>Aporte mensal planejado</div>
          <div className="text-gray-700">
            <span className="font-semibold">{formatBRL(assumptions.investmentsPlan)}</span>
            <br />
            <span className="text-xs text-gray-500">
              = fatia de Investimentos + saldo das essenciais (conforme sua regra), constante em valores de hoje
            </span>
          </div>
        </div>

        <div>
          <div className={SECTION_TITLE}>Inflação esperada</div>
          {!editingInflation ? (
            <div className="flex items-center justify-between">
              <div className="text-gray-700">
                <span className="font-semibold">{formatRate(assumptions.inflationRate)} a.a.</span>
                <br />
                <span className="text-xs text-gray-500">
                  Todos os valores do gráfico estão em &quot;valores de hoje&quot;
                </span>
              </div>
              <button
                type="button"
                onClick={startEditing}
                className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
              >
                Editar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="inflation-input" className="mb-1 block text-xs text-gray-600">
                    % a.a.
                  </label>
                  <input
                    id="inflation-input"
                    type="text"
                    inputMode="decimal"
                    value={inflationDraft}
                    onChange={(e) => setInflationDraft(e.target.value)}
                    aria-invalid={draftPercent === null}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveInflation}
                  disabled={saving}
                  className="rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingInflation(false)}
                  disabled={saving}
                  className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
              {draftPercent === 0 && (
                <p className="text-xs text-amber-700">0% = projeção em valores nominais (sem descontar inflação).</p>
              )}
              {saveError && (
                <p role="alert" className="text-xs text-red-700">
                  {saveError}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className={SECTION_TITLE}>Cenários</div>
          <ul className="list-inside list-disc space-y-1 text-xs text-gray-600">
            <li>
              <span className="font-semibold">Base:</span> o retorno acima.
            </li>
            <li>
              <span className="font-semibold">Conservador</span> ({formatShift(SCENARIO_REAL_RATE_SHIFT.conservative)}{' '}
              ao ano no retorno real): cobre, de forma aproximada, o imposto de renda (~1 p.p.) e o efeito da
              volatilidade (~1 p.p.), que a projeção base não considera.
            </li>
            <li>
              <span className="font-semibold">Otimista</span> ({formatShift(SCENARIO_REAL_RATE_SHIFT.optimistic)} ao
              ano): menor que o conservador porque o base já é otimista frente ao histórico de longo prazo.
            </li>
          </ul>
        </div>

        <div>
          <div className={SECTION_TITLE}>Limitações</div>
          <ul className="list-inside list-disc space-y-1 text-xs text-gray-600">
            <li>Retornos brutos (sem imposto de renda ou taxas) — veja o cenário conservador.</li>
            <li>Renda e aportes constantes em valores de hoje (sem aumentos reais).</li>
            <li>Lazer, Educação e Caixa da Empresa não entram na projeção — só o que você investe.</li>
            <li>
              Horizonte de {PROJECTION_HORIZON_YEARS} anos: além disso o número perde sentido prático. Uma projeção
              não é uma promessa.
            </li>
          </ul>
        </div>
      </div>
    </details>
  )
}
