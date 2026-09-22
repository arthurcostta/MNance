import type { OnboardingData } from '../../../hooks/useOnboarding'
import type { EmergencyReserveResult } from '../../../core/emergencyReserve'
import type { Distribution } from '../../../types/distribution'
import { ALLOCATION_MODELS } from '../../../core/allocationModels'

interface Step5ReviewProps {
  data: OnboardingData
  emergencyReserve: EmergencyReserveResult
  defaultDistribution: Omit<Distribution, 'updatedAt'>
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

export default function Step5Review({ data, emergencyReserve, defaultDistribution }: Step5ReviewProps) {
  // getDefaultDistribution nunca retorna 'CUSTOM' (só é possível editando depois na tela
  // de Distribuição), mas o tipo é compartilhado com Distribution.tsx — guard só por tipo.
  const allocationModelLabel =
    defaultDistribution.allocationModel === 'CUSTOM'
      ? 'Personalizado'
      : ALLOCATION_MODELS[defaultDistribution.allocationModel].label

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Revisão</h2>
      <div className="rounded border p-3">
        <Row label="Nome" value={data.name} />
        <Row label="Meta de patrimônio" value={formatCurrency(data.goalAmount)} />
        <Row label="Prazo" value={`${data.goalYears} anos`} />
        <Row label="Perfil de risco" value={RISK_PROFILE_LABELS[data.riskProfile]} />
        <Row label="Patrimônio atual" value={formatCurrency(data.currentPatrimony)} />
        <Row label="Renda líquida mensal" value={formatCurrency(data.monthlyIncomeNet)} />
        <Row label="Custo essencial mensal" value={formatCurrency(data.essentialMonthlyCost)} />
        <Row label="Reserva mínima (6 meses)" value={formatCurrency(emergencyReserve.minimumReserve)} />
        <Row label="Reserva segura (12 meses)" value={formatCurrency(emergencyReserve.safeReserve)} />
        <Row label="Dia de pagamento" value={String(data.payday1)} />
        <Row label="Segundo dia de pagamento" value={data.payday2 ? String(data.payday2) : '—'} />
      </div>

      <div className="rounded border bg-gray-50 p-3 text-sm">
        <p className="font-medium">Sua distribuição de renda (ponto de partida)</p>
        <div className="mt-2 space-y-1">
          <Row label="Despesas Essenciais" value={`${defaultDistribution.essentialsPercent}%`} />
          <Row label="Educação" value={`${defaultDistribution.educationPercent}%`} />
          <Row label="Lazer" value={`${defaultDistribution.leisurePercent}%`} />
          <Row label="Investimentos" value={`${defaultDistribution.investmentsPercent}%`} />
          <Row label="Modelo de alocação dos investimentos" value={allocationModelLabel} />
        </div>
        <p className="mt-3 text-gray-600">
          Começamos com <strong>55% essenciais, 10% educação, 10% lazer e 25% investimentos</strong> —
          um ponto de partida que reserva espaço tanto para crescer (educação) quanto para
          viver bem no presente (lazer), sem abrir mão de construir patrimônio. Você poderá
          ajustar esses percentuais quando quiser na tela de Distribuição de Renda.
        </p>
      </div>
    </div>
  )
}
