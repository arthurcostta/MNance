import { useId, type ReactNode } from 'react'

interface FormFieldRenderProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  children: (props: FormFieldRenderProps) => ReactNode
}

// Padrão render-prop: gera um `id` único via useId() (seguro — React 19, app 100%
// client-side, sem SSR) e conecta aria-invalid/aria-describedby ao texto de erro/hint,
// resolvendo a lacuna de acessibilidade da auditoria (labels sem htmlFor/id).
export default function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
