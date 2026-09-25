import Alert from '../Common/Alert'

interface BudgetAlertBannerProps {
  essentialMonthlyCost: number
  monthlyIncomeNet: number
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
}: BudgetAlertBannerProps) {
  return (
    <Alert variant="error">
      Seu custo essencial (<span className="font-semibold">{formatCurrency(essentialMonthlyCost)}</span>)
      está maior que sua renda líquida (<span className="font-semibold">{formatCurrency(monthlyIncomeNet)}</span>).
      Sem sobra mensal, seu patrimônio não cresce por aporte — só pelo retorno da carteira.
      Revise seus custos essenciais para voltar a investir todo mês.
    </Alert>
  )
}
