interface SeedPatrimonyPromptProps {
  amount: number
  onAccept: () => void
  onDismiss: () => void
  isPending?: boolean
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function SeedPatrimonyPrompt({
  amount,
  onAccept,
  onDismiss,
  isPending = false,
}: SeedPatrimonyPromptProps) {
  return (
    <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
      <p className="mb-4 text-sm text-gray-800">
        Você informou um patrimônio de <span className="font-semibold">{formatCurrency(amount)}</span> no
        onboarding. Quer criar um ativo inicial com esse valor?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          disabled={isPending}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:bg-blue-400"
        >
          {isPending ? 'Criando...' : 'Sim, criar'}
        </button>
        <button
          onClick={onDismiss}
          disabled={isPending}
          className="flex-1 rounded border border-blue-300 px-3 py-2 text-sm text-blue-600 disabled:border-blue-200 disabled:text-blue-400"
        >
          Dispensar
        </button>
      </div>
    </div>
  )
}
