import { useState } from 'react'
import type { EmergencyReserveResult } from '../../core/emergencyReserve'

interface EmergencyReserveCardProps {
  reserve: EmergencyReserveResult
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Somente leitura por natureza — sempre recalculada ao vivo a partir da renda mensal
// (CENÁRIO 41), nunca lida de um campo editável, então não há input aqui para desabilitar.
export default function EmergencyReserveCard({ reserve }: EmergencyReserveCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Reserva de emergência</span>
        <button type="button" onClick={() => setShowTooltip((v) => !v)} className="text-xs underline">
          por quê?
        </button>
      </div>
      <p className="mt-2">Mínima (6 meses): {formatCurrency(reserve.minimumReserve)}</p>
      <p>Segura (12 meses): {formatCurrency(reserve.safeReserve)}</p>
      {showTooltip && (
        <p className="mt-2 text-gray-600">
          Calculada sobre sua renda, não sobre seus gastos essenciais, porque você
          dificilmente aceitaria reduzir seu padrão de vida numa emergência real — a
          reserva precisa sustentar sua renda de verdade.
        </p>
      )}
    </div>
  )
}
