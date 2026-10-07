import { useState } from 'react'
import type { MonthlyFlow } from '../../hooks/useDistribution'
import Card from '../Common/Card'
import Button from '../Common/Button'
import Alert from '../Common/Alert'

interface SurplusDestinationCardProps {
  flow: MonthlyFlow
  // % do saldo que vai para Investimentos; undefined = decisão pendente.
  savedPercent: number | undefined
  hasEssentialsList: boolean
  // Fatias do Nível 1 SEM o saldo — a base do "antes → depois" da pré-visualização.
  baseInvestments: number
  baseLeisure: number
  onSave: (percent: number) => Promise<void>
}

type Choice = 'invest' | 'leisure' | 'split'

const SPLIT_SHORTCUTS = [70, 50, 30]

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function choiceFromPercent(percent: number | undefined): Choice | null {
  if (percent === undefined) return null
  if (percent === 100) return 'invest'
  if (percent === 0) return 'leisure'
  return 'split'
}

function describeRule(percent: number): string {
  if (percent === 100) return 'Investir tudo'
  if (percent === 0) return 'Usar tudo em lazer'
  return `${percent}% investir · ${100 - percent}% lazer`
}

// A regra do saldo é uma POLÍTICA permanente ("vale todo mês até você editar"), não uma
// decisão mensal — por isso há sempre um "Editar regra" depois de salva, mesmo quando no
// momento não há saldo. Sem regra salva, o saldo não entra em nenhum cálculo do app.
export default function SurplusDestinationCard({
  flow,
  savedPercent,
  hasEssentialsList,
  baseInvestments,
  baseLeisure,
  onSave,
}: SurplusDestinationCardProps) {
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState<Choice | null>(choiceFromPercent(savedPercent))
  const [draft, setDraft] = useState<number>(savedPercent ?? 100)
  const [saving, setSaving] = useState(false)

  const hasSurplus = flow.surplus > 0
  const showChoice = (hasSurplus && savedPercent === undefined) || editing

  const select = (next: Choice) => {
    setChoice(next)
    if (next === 'invest') setDraft(100)
    else if (next === 'leisure') setDraft(0)
    else if (draft <= 0 || draft >= 100) setDraft(50)
  }

  const applyShortcut = (percent: number) => {
    setChoice('split')
    setDraft(percent)
  }

  const startEditing = () => {
    setChoice(choiceFromPercent(savedPercent))
    setDraft(savedPercent ?? 100)
    setEditing(true)
  }

  const cancelEditing = () => {
    setChoice(choiceFromPercent(savedPercent))
    setDraft(savedPercent ?? 100)
    setEditing(false)
  }

  const handleSave = async () => {
    if (choice === null) return
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch {
      // O erro já aparece na tela (distribution.actionError); o card continua aberto para tentar de novo.
    } finally {
      setSaving(false)
    }
  }

  const previewToInvestments = flow.surplus * (draft / 100)
  const previewToLeisure = flow.surplus - previewToInvestments

  const optionClass = (selected: boolean) =>
    `rounded border p-3 text-left text-sm transition-colors ${
      selected ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
    }`

  const pending = hasSurplus && savedPercent === undefined

  return (
    <Card className={`space-y-4 ${pending ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">Destino do saldo das essenciais</h2>
        {pending && (
          <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Decisão pendente
          </span>
        )}
      </div>

      {flow.deficit > 0 && (
        <Alert variant="warning">
          Suas despesas essenciais reais passam do orçado em{' '}
          <span className="font-semibold">{formatCurrency(flow.deficit)}</span>. Revise as despesas ou
          aumente a fatia de Essenciais — enquanto isso, nada é roteado para investimentos ou lazer.
        </Alert>
      )}

      {showChoice ? (
        <div className="space-y-4">
          {hasSurplus ? (
            <p className="text-sm text-gray-800">
              Sobraram <span className="font-semibold">{formatCurrency(flow.surplus)}</span> das suas
              despesas essenciais. O que fazer com esse saldo?
            </p>
          ) : (
            <p className="text-sm text-gray-800">
              Hoje não há saldo, mas a regra vale sempre que sobrar dinheiro nas essenciais.
            </p>
          )}
          {pending && (
            <p className="text-xs text-amber-800">
              Enquanto você não decidir, esse saldo não entra em nenhum cálculo do app.
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              aria-pressed={choice === 'invest'}
              onClick={() => select('invest')}
              className={optionClass(choice === 'invest')}
            >
              <p className="font-medium">Investir tudo</p>
              <p className="mt-1 text-xs text-gray-600">100% do saldo vira aporte.</p>
              {choice === 'invest' && <p className="mt-1 text-xs font-medium text-green-700">✓ Selecionado</p>}
            </button>
            <button
              type="button"
              aria-pressed={choice === 'leisure'}
              onClick={() => select('leisure')}
              className={optionClass(choice === 'leisure')}
            >
              <p className="font-medium">Usar em lazer</p>
              <p className="mt-1 text-xs text-gray-600">100% do saldo vai para o lazer.</p>
              {choice === 'leisure' && <p className="mt-1 text-xs font-medium text-green-700">✓ Selecionado</p>}
            </button>
            <button
              type="button"
              aria-pressed={choice === 'split'}
              onClick={() => select('split')}
              className={optionClass(choice === 'split')}
            >
              <p className="font-medium">Dividir</p>
              <p className="mt-1 text-xs text-gray-600">Parte investe, parte vira lazer.</p>
              {choice === 'split' && <p className="mt-1 text-xs font-medium text-green-700">✓ Selecionado</p>}
            </button>
          </div>

          {choice === 'split' && (
            <div className="space-y-3 rounded border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Atalhos:</span>
                {SPLIT_SHORTCUTS.map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => applyShortcut(percent)}
                    className="text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    {percent}/{100 - percent}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={draft}
                onChange={(e) => setDraft(Number(e.target.value))}
                aria-label="Percentual do saldo que vai para investimentos"
                className="w-full"
              />
              <p className="text-sm font-medium text-gray-800">
                Investir {draft}% · Lazer {100 - draft}%
              </p>
            </div>
          )}

          {choice !== null && hasSurplus && (
            <div className="space-y-1 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
              <p>
                Investimentos: {formatCurrency(baseInvestments)} →{' '}
                <span className="font-semibold">{formatCurrency(baseInvestments + previewToInvestments)}</span>/mês
              </p>
              <p>
                Lazer: {formatCurrency(baseLeisure)} →{' '}
                <span className="font-semibold">{formatCurrency(baseLeisure + previewToLeisure)}</span>/mês
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={choice === null || saving} className="flex-1">
              {saving ? 'Salvando...' : 'Salvar destino do saldo'}
            </Button>
            {editing && (
              <Button variant="secondary" onClick={cancelEditing} disabled={saving} className="flex-1">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : savedPercent !== undefined ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-800">
            Regra atual: <span className="font-semibold">{describeRule(savedPercent)}</span>
          </p>
          {hasSurplus ? (
            <p className="text-sm text-gray-700">
              Neste mês: {formatCurrency(flow.surplusToInvestments)} para investimentos e{' '}
              {formatCurrency(flow.surplusToLeisure)} para lazer.
            </p>
          ) : (
            <p className="text-sm text-gray-600">Sem saldo agora — a regra continua valendo quando sobrar.</p>
          )}
          <p className="text-xs text-green-700">✓ Vale todo mês até você editar.</p>
          <Button variant="secondary" size="sm" onClick={startEditing}>
            Editar regra
          </Button>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          {!hasEssentialsList
            ? 'Cadastre suas despesas essenciais acima para ver se sobra saldo. Quando sobrar, você decide aqui para onde ele vai.'
            : flow.deficit > 0
              ? 'Sem saldo para rotear enquanto as despesas reais passarem do orçado.'
              : 'Sem saldo agora: o que você gasta em essenciais bate com o orçado.'}
        </p>
      )}
    </Card>
  )
}
