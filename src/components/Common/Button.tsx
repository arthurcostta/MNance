import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// Unifica os 3 padrões diferentes de `disabled` que existiam espalhados pelo código
// antes do M5.5 (cada tela reimplementava bg-gray-400 / border-gray-200 / opacity-40).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400',
  secondary:
    'border border-gray-300 text-gray-900 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400',
  danger:
    'border border-red-200 text-red-600 hover:bg-red-50 disabled:border-red-100 disabled:text-red-300',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded font-medium disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  )
}
