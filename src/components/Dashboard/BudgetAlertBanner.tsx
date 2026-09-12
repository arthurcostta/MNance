interface BudgetAlertBannerProps {
  essentialMonthlyCost: number
  monthlyIncomeNet: number
  onDismiss?: () => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function BudgetAlertBanner({
  essentialMonthlyCost,
  monthlyIncomeNet,
  onDismiss,
}: BudgetAlertBannerProps) {
  return (
    <div role="alert" className="mb-6 rounded border border-red-200 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800">
          Seu custo essencial (<span className="font-semibold">{formatCurrency(essentialMonthlyCost)}</span>)
          está maior que sua renda líquida (<span className="font-semibold">{formatCurrency(monthlyIncomeNet)}</span>).
          Sem sobra mensal, seu patrimônio não cresce por aporte — só pelo retorno da carteira.
          Revise seus custos essenciais para voltar a investir todo mês.
        </p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dispensar alerta"
            className="shrink-0 text-sm text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
