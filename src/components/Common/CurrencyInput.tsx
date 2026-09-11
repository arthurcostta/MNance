import { type ChangeEvent } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  id?: string
}

// Máscara de moeda BRL — mesmo padrão usado por apps financeiros (Nubank, Itaú etc.):
// os dígitos digitados são sempre interpretados da direita pra esquerda (centavos
// primeiro), então o cursor nunca "pula" no meio do texto formatado, mesmo sem lib
// de máscara externa.
function centsToReais(cents: number): number {
  return cents / 100
}

function reaisToCents(value: number): number {
  return Math.round(value * 100)
}

function formatCents(cents: number): string {
  return centsToReais(cents).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function CurrencyInput({ value, onChange, className, id }: CurrencyInputProps) {
  const cents = reaisToCents(value)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    const newCents = digits === '' ? 0 : Number(digits)
    onChange(centsToReais(newCents))
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={cents === 0 ? '' : formatCents(cents)}
      onChange={handleChange}
      placeholder="R$ 0,00"
      className={className ?? 'input-field'}
    />
  )
}
