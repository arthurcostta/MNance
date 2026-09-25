import type { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant: AlertVariant
  children: ReactNode
  className?: string
}

// Mesmas combinações de cor já usadas hoje em cada banner (nenhuma paleta nova) —
// só centralizadas aqui em vez de reimplementadas em cada componente.
const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-gray-800',
  success: 'border-green-200 bg-green-50 text-gray-800',
  warning: 'border-amber-200 bg-amber-50 text-gray-800',
  error: 'border-red-200 bg-red-50 text-gray-800',
}

export default function Alert({ variant, children, className = '' }: AlertProps) {
  return (
    <div role="alert" className={`rounded border p-4 text-sm ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </div>
  )
}
