import { Link } from 'react-router-dom'
import type { MonthlyFlow } from '../../hooks/useDistribution'
import Card from '../Common/Card'

interface PlannedContributionCardProps {
  flow: MonthlyFlow
  // Fatia de Investimentos do Nível 1 (sem o saldo).
  baseInvestments: number
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Fecha o fluxo do dinheiro da tela: mostra o aporte mensal PLANEJADO (fatia de Investimentos
// + saldo das essenciais roteado). Este é o número que o Radar e a tela Investimentos vão usar.
export default function PlannedContributionCard({ flow, baseInvestments }: PlannedContributionCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium text-gray-600">Seu aporte mensal planejado</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(flow.investmentsPlan)}</p>
      <p className="mt-2 text-sm text-gray-700">
        {formatCurrency(baseInvestments)} da fatia de Investimentos
        {flow.surplusToInvestments > 0 && (
          <> + {formatCurrency(flow.surplusToInvestments)} do saldo das essenciais</>
        )}
        .
      </p>
      {flow.surplusPending && (
        <p className="mt-1 text-xs text-amber-800">
          Há {formatCurrency(flow.surplus)} de saldo sem destino — decida acima para incluí-lo (ou não) no aporte.
        </p>
      )}
      <Link to="/portfolio" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
        Ver meus ativos no Portfólio
      </Link>
    </Card>
  )
}
