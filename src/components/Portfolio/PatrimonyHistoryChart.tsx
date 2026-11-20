import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { historyAxis, type HistoryPoint, type HistorySummary } from '../../core/patrimonyHistory'
import Alert from '../Common/Alert'
import Card from '../Common/Card'
import EmptyState from '../Common/EmptyState'
import { formatBRL, formatCompactBRL } from '../../utils/formatCurrency'
import { formatPercent } from '../../utils/formatPercent'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface PatrimonyHistoryChartProps {
  points: HistoryPoint[]
  summary: HistorySummary | null
  loading: boolean
  error: string | null
}

const LINE_COLOR = '#2563eb'

// Reais inteiros, sem centavos (rótulos do eixo).
function formatWholeBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function signed(value: number, text: string): string {
  return `${value >= 0 ? '+' : '-'}${text}`
}

// Texto de uma linha acima do gráfico: o que mudou desde o primeiro mês registrado.
function summaryLine(points: HistoryPoint[], summary: HistorySummary): string {
  if (points.length === 1) {
    return `Seu histórico começa em ${summary.firstLabel}. O app registra o patrimônio de cada mês; volte nos próximos meses para ver a linha crescer.`
  }
  const money = signed(summary.delta, formatBRL(Math.abs(summary.delta)))
  const percent =
    summary.percent === null ? '' : ` (${signed(summary.percent, formatPercent(Math.abs(summary.percent), 1))})`
  return `Desde ${summary.firstLabel}: ${money}${percent}`
}

// Cartão do histórico do patrimônio (tela Portfólio). Eixo em mm/aa; o eixo Y não começa em zero para a
// variação aparecer, e os rótulos mostram os valores.
export default function PatrimonyHistoryChart({ points, summary, loading, error }: PatrimonyHistoryChartProps) {
  const title = <h2 className="text-sm font-semibold text-gray-900">Patrimônio ao longo do tempo</h2>

  if (loading) {
    return (
      <Card className="mb-6">
        {title}
        <p className="mt-3 text-sm text-gray-500">Carregando histórico...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-6">
        {title}
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      </Card>
    )
  }

  if (points.length === 0 || summary === null) {
    return (
      <Card className="mb-6">
        {title}
        <div className="mt-3">
          <EmptyState title="Cadastre seus ativos para começar o histórico do seu patrimônio." />
        </div>
      </Card>
    )
  }

  const axis = historyAxis(points.map((p) => p.total))
  const headline = summaryLine(points, summary)

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: 'Patrimônio',
        data: points.map((p) => p.total),
        borderColor: LINE_COLOR,
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: 'origin' as const,
        tension: 0,
        pointRadius: points.length <= 12 ? 4 : 2,
        pointHoverRadius: 6,
        pointBorderColor: LINE_COLOR,
        pointBorderWidth: 2,
        // Mês sem retrato (saldo repetido) fica com ponto vazado: é um saldo mantido, não uma medição.
        pointBackgroundColor: points.map((p) => (p.carried ? '#ffffff' : LINE_COLOR)),
      },
    ],
  }

  return (
    <Card className="mb-6">
      {title}
      <p className="mt-1 text-sm text-gray-700">{headline}</p>
      <div className="mt-3 h-56 sm:h-64" role="img" aria-label={`Gráfico do patrimônio por mês. ${headline}`}>
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (item: TooltipItem<'line'>) => `Patrimônio: ${formatBRL(Number(item.parsed.y))}`,
                  afterLabel: (item: TooltipItem<'line'>) => {
                    const index = item.dataIndex
                    const point = points[index]
                    const previous = points[index - 1]
                    const lines: string[] = []
                    if (point?.carried) lines.push('sem alteração neste mês: saldo mantido')
                    if (point && previous) {
                      const delta = point.total - previous.total
                      const percent = previous.total > 0 ? (delta / previous.total) * 100 : null
                      const money = signed(delta, formatBRL(Math.abs(delta)))
                      const pct = percent === null ? '' : ` (${signed(percent, formatPercent(Math.abs(percent), 1))})`
                      lines.push(`${money}${pct} em relação a ${previous.label}`)
                    }
                    return lines
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
              },
              y: {
                min: axis.min,
                max: axis.max,
                // Degrau de mil em mil: "R$ 41 mil" é exato. Outro degrau: valor inteiro em reais, para os rótulos
                // não arredondarem para o mesmo número (41.250 e 41.500 viravam "41,3" e "41,5 mil").
                ticks: {
                  stepSize: axis.step,
                  callback: (value) => (axis.step % 1000 === 0 ? formatCompactBRL(Number(value)) : formatWholeBRL(Number(value))),
                },
              },
            },
          }}
        />
      </div>
    </Card>
  )
}
