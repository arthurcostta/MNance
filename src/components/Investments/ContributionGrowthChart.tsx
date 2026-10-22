import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { YearlyGrowthPoint } from '../../core/contributionGrowth'
import { niceAxis } from '../../core/radarView'
import { formatBRL, formatCompactBRL } from '../../utils/formatCurrency'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

interface ContributionGrowthChartProps {
  yearly: YearlyGrowthPoint[]
  summary: string
}

// Barras empilhadas por ano: o que saiu do bolso (embaixo) e os juros acumulados (em cima).
export default function ContributionGrowthChart({ yearly, summary }: ContributionGrowthChartProps) {
  const top = Math.max(0, ...yearly.map((p) => p.total))
  const axis = niceAxis(top)

  const data = {
    labels: yearly.map((p) => `${p.year}`),
    datasets: [
      {
        label: 'Saiu do bolso',
        data: yearly.map((p) => p.contributed),
        backgroundColor: '#2563eb',
        stack: 'total',
      },
      {
        label: 'Juros acumulados',
        data: yearly.map((p) => p.interest),
        backgroundColor: '#16a34a',
        stack: 'total',
      },
    ],
  }

  return (
    <div className="h-64 rounded border border-gray-200 bg-white p-3" role="img" aria-label={summary}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (item: TooltipItem<'bar'>) => `${item.dataset.label}: ${formatBRL(Number(item.parsed.y))}`,
                footer: (items: TooltipItem<'bar'>[]) => {
                  const total = items.reduce((sum, i) => sum + Number(i.parsed.y), 0)
                  return `Total: ${formatBRL(total)}`
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
              title: { display: true, text: 'Anos' },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              min: 0,
              max: axis.max,
              ticks: { stepSize: axis.step, callback: (value) => formatCompactBRL(Number(value)) },
            },
          },
        }}
      />
    </div>
  )
}
