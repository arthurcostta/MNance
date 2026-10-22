import { useState } from 'react'
import { simulateContributionGrowth, validateGrowthInput, MAX_GROWTH_YEARS } from '../../core/contributionGrowth'
import { formatBRL } from '../../utils/formatCurrency'
import { formatYears } from '../../utils/formatYears'
import { formatPercent } from '../../utils/formatPercent'
import CurrencyInput from '../Common/CurrencyInput'
import FormField from '../Common/FormField'
import ContributionGrowthChart from './ContributionGrowthChart'

interface ContributionGrowthCardProps {
  // Aporte mensal planejado (fatia de Investimentos + saldo roteado) — mesmo número do Radar.
  initialMonthlyContribution: number
  // Prazo da meta, limitado ao intervalo do simulador.
  initialYears: number
  // Retorno real da carteira (fração), o mesmo do painel de premissas do Radar.
  initialRealRate: number
}

const clampYears = (years: number) => Math.min(MAX_GROWTH_YEARS, Math.max(1, Math.round(years)))

// Simulador educativo: mostra como o aporte se multiplica com os juros. Começa do zero (não usa o patrimônio atual).
export default function ContributionGrowthCard({
  initialMonthlyContribution,
  initialYears,
  initialRealRate,
}: ContributionGrowthCardProps) {
  const [monthlyContribution, setMonthlyContribution] = useState(initialMonthlyContribution)
  const [years, setYears] = useState(clampYears(initialYears))
  // Em percentual na tela (13,65), convertido para fração só no cálculo.
  const [ratePercent, setRatePercent] = useState(Number((initialRealRate * 100).toFixed(2)))

  const input = { monthlyContribution, annualRate: ratePercent / 100, years }
  const errors = validateGrowthInput(input)
  const hasErrors = Object.keys(errors).length > 0
  // Cálculo barato (poucas centenas de meses): recalcula a cada tecla, sem memo.
  const result = hasErrors ? null : simulateContributionGrowth(input)

  const summary = result
    ? `Em ${years} anos, ${Math.round(result.totals.pocketSharePercent)}% do total é dinheiro que saiu do seu bolso. Total de ${formatBRL(result.totals.total)}.`
    : 'Simulação indisponível com estes valores.'

  return (
    <details className="rounded border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-900">
        Quanto seu aporte rende?
        <span className="ml-2 font-normal text-gray-500">simule com a barra de tempo</span>
      </summary>

      <div className="mt-4 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Quanto investe por mês" error={errors.monthlyContribution}>
            {(fieldProps) => (
              <CurrencyInput
                value={monthlyContribution}
                onChange={setMonthlyContribution}
                {...fieldProps}
              />
            )}
          </FormField>

          <FormField label="Rende ao ano (real, em valores de hoje)" error={errors.annualRate}>
            {(fieldProps) => (
              <input
                type="number"
                step="0.01"
                min={0}
                max={30}
                value={ratePercent}
                onChange={(e) => setRatePercent(Number(e.target.value))}
                className="input-field"
                {...fieldProps}
              />
            )}
          </FormField>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="growth-years" className="text-sm font-medium text-gray-700">
              Por quanto tempo
            </label>
            <span className="text-lg font-semibold">
              {years} {years === 1 ? 'ano' : 'anos'}
            </span>
          </div>
          <input
            id="growth-years"
            type="range"
            min={1}
            max={MAX_GROWTH_YEARS}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-valuetext={`${years} ${years === 1 ? 'ano' : 'anos'}`}
            className="mt-2 w-full"
          />
        </div>

        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-gray-200 p-2">
                <p className="text-xs text-gray-600">Saiu do bolso</p>
                <p className="text-sm font-semibold">{formatBRL(result.totals.contributed)}</p>
              </div>
              <div className="rounded border border-gray-200 p-2">
                <p className="text-xs text-gray-600">Juros</p>
                <p className="text-sm font-semibold text-green-700">{formatBRL(result.totals.interest)}</p>
              </div>
              <div className="rounded border border-gray-200 p-2">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-sm font-semibold">{formatBRL(result.totals.total)}</p>
              </div>
            </div>

            <p className="text-sm text-gray-800">
              Em {years} {years === 1 ? 'ano' : 'anos'},{' '}
              <strong>{Math.round(result.totals.pocketSharePercent)}%</strong> do patrimônio é dinheiro que saiu do
              seu bolso.{' '}
              {result.totals.interest > result.totals.contributed
                ? 'Os juros já são a maior parte.'
                : 'Ainda a maior parte saiu do seu bolso.'}
            </p>

            <ContributionGrowthChart yearly={result.yearly} summary={summary} />

            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <span className="font-medium">Mês {result.monthExample.month}:</span> juros do mês{' '}
                {formatBRL(result.monthExample.monthlyInterest)}. Seu aporte: {formatBRL(result.monthExample.contribution)}.
              </li>
              {result.milestones.monthlyInterestPassesContribution !== null && (
                <li>
                  <span className="font-medium">
                    {formatYears(result.milestones.monthlyInterestPassesContribution / 12)}:
                  </span>{' '}
                  os juros de um mês passam o que você coloca por mês.
                </li>
              )}
              {result.milestones.totalInterestPassesContributed !== null && (
                <li>
                  <span className="font-medium">
                    {formatYears(result.milestones.totalInterestPassesContributed / 12)}:
                  </span>{' '}
                  o total de juros passa tudo o que saiu do seu bolso.
                </li>
              )}
            </ul>
          </>
        )}

        <p className="text-xs text-gray-500">
          Simulação ilustrativa em valores de hoje, sem IR, começando do zero (não inclui o patrimônio que você já tem).
          O Radar usa seus ativos e sua aderência. Taxa atual: {formatPercent(ratePercent)} a.a.
        </p>
      </div>
    </details>
  )
}
