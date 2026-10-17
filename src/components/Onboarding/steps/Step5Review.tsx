import type { ReactNode } from 'react'
import type { OnboardingData } from '../../../hooks/useOnboarding'
import type { EmergencyReserveResult } from '../../../core/emergencyReserve'
import type { Distribution, PaydaySplit } from '../../../types/distribution'
import Card from '../../Common/Card'

interface Step5ReviewProps {
  data: OnboardingData
  emergencyReserve: EmergencyReserveResult
  defaultDistribution: Omit<Distribution, 'updatedAt'>
  isEditing: boolean
  // Em edição com ativos no Portfólio, o patrimônio é a soma deles e não tem "Alterar".
  patrimonyFromPortfolio: boolean
  // Presente só na edição: cada bloco ganha um "Alterar" que abre os campos daquele passo.
  onEditStep?: (step: number) => void
  // Mantém o layout e os botões, mas inertes (ex.: enquanto salva).
  editDisabled?: boolean
}

const RISK_PROFILE_LABELS: Record<OnboardingData['riskProfile'], string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agressivo',
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

// Em edição cada grupo é um cartão com título e "Alterar"; em conta nova os grupos
// entram todos num único cartão, sem cabeçalho (layout original da revisão).
function Block({
  title,
  step,
  grouped,
  onEditStep,
  disabled = false,
  locked = false,
  children,
}: {
  title: string
  step: number
  grouped: boolean
  onEditStep?: (step: number) => void
  disabled?: boolean
  // Bloco que não se edita aqui (ex.: patrimônio vindo do Portfólio): mantém o cartão, sem "Alterar".
  locked?: boolean
  children: ReactNode
}) {
  if (!grouped) return <>{children}</>

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{title}</p>
        {!locked && onEditStep && (
          <button
            type="button"
            onClick={() => onEditStep(step)}
            disabled={disabled}
            aria-label={`Alterar ${title.toLowerCase()}`}
            className="text-sm font-medium underline disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Alterar
          </button>
        )}
      </div>
      {children}
    </Card>
  )
}

function PaydaySplitRows({ split }: { split: PaydaySplit }) {
  return (
    <>
      <Row label="Despesas Essenciais" value={`${split.essentialsPercent}%`} />
      <Row label="Educação" value={`${split.educationPercent}%`} />
      <Row label="Lazer" value={`${split.leisurePercent}%`} />
      <Row label="Investimentos" value={`${split.investmentsPercent}%`} />
      {split.companyCashPercent > 0 && (
        <Row label="Caixa da Empresa" value={`${split.companyCashPercent}%`} />
      )}
    </>
  )
}

export default function Step5Review({
  data,
  emergencyReserve,
  defaultDistribution,
  isEditing,
  patrimonyFromPortfolio,
  onEditStep,
  editDisabled = false,
}: Step5ReviewProps) {
  const blockProps = { grouped: isEditing, onEditStep, disabled: editDisabled }

  const blocks = (
    <>
      <Block title="Meta" step={1} {...blockProps}>
        <Row label="Nome" value={data.name} />
        <Row label="Meta de patrimônio" value={formatCurrency(data.goalAmount)} />
        <Row label="Prazo" value={`${data.goalYears} anos`} />
        <Row label="Perfil de risco" value={RISK_PROFILE_LABELS[data.riskProfile]} />
      </Block>

      <Block title="Patrimônio" step={2} {...blockProps} locked={patrimonyFromPortfolio}>
        <Row
          label={patrimonyFromPortfolio ? 'Patrimônio atual (do Portfólio)' : 'Patrimônio atual'}
          value={formatCurrency(data.currentPatrimony)}
        />
        {patrimonyFromPortfolio && (
          <p className="pb-1 text-xs text-gray-500">
            Soma dos ativos cadastrados no Portfólio — o mesmo valor do card do Radar. Para mudar,
            atualize seus ativos no Portfólio.
          </p>
        )}
      </Block>

      <Block title="Renda e custos" step={3} {...blockProps}>
        <Row label="Renda líquida mensal" value={formatCurrency(data.monthlyIncomeNet)} />
        <Row label="Custo essencial mensal" value={formatCurrency(data.essentialMonthlyCost)} />
        <Row label="Reserva mínima (6 meses)" value={formatCurrency(emergencyReserve.minimumReserve)} />
        <Row label="Reserva segura (12 meses)" value={formatCurrency(emergencyReserve.safeReserve)} />
      </Block>

      <Block title="Dias de pagamento" step={4} {...blockProps}>
        <Row label="Dia de pagamento" value={String(data.payday1)} />
        <Row label="Segundo dia de pagamento" value={data.payday2 ? String(data.payday2) : '—'} />
      </Block>
    </>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{isEditing ? 'Seus dados' : 'Revisão'}</h2>

      {isEditing ? blocks : <Card>{blocks}</Card>}

      {isEditing ? (
        <Card className="bg-gray-50 text-sm">
          <p className="text-gray-600">
            Sua distribuição de renda não muda por aqui — ajuste na tela Distribuição.
          </p>
        </Card>
      ) : (
        <Card className="bg-gray-50 text-sm">
          <p className="font-medium">Sua distribuição de renda (ponto de partida)</p>

          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600">
              {defaultDistribution.payday2Split ? '1º pagamento' : 'Divisão mensal'}
            </p>
            <PaydaySplitRows split={defaultDistribution.payday1Split} />
          </div>

          {defaultDistribution.payday2Split && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600">2º pagamento</p>
              <PaydaySplitRows split={defaultDistribution.payday2Split} />
            </div>
          )}

          <p className="mt-3 text-gray-600">
            Começamos com <strong>55% essenciais, 10% educação, 10% lazer e 25% investimentos</strong> —
            e Caixa da Empresa disponível para quem precisar, ajustável depois na tela de
            Distribuição de Renda.
          </p>
        </Card>
      )}
    </div>
  )
}
