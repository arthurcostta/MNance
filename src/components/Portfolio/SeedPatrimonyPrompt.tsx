import Card from '../Common/Card'
import Button from '../Common/Button'

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
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <p className="mb-4 text-sm text-gray-800">
        Você informou um patrimônio de <span className="font-semibold">{formatCurrency(amount)}</span> no
        onboarding. Quer criar um ativo inicial com esse valor?
      </p>
      <div className="flex gap-2">
        <Button onClick={onAccept} disabled={isPending} className="flex-1">
          {isPending ? 'Criando...' : 'Sim, criar'}
        </Button>
        <Button variant="secondary" onClick={onDismiss} disabled={isPending} className="flex-1">
          Dispensar
        </Button>
      </div>
    </Card>
  )
}
