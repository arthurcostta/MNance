import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { ProjectionPoint } from '../../hooks/useDashboard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface ProjectionChartProps {
  series: ProjectionPoint[]
  showBoosted: boolean
}

function formatCurrencyCompact(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProjectionChart({ series, showBoosted }: ProjectionChartProps) {
  if (series.length === 0) {
    return null
  }

  const labels = series.map((point) => (point.year === 0 ? 'Hoje' : `Ano ${point.year}`))

  const datasets = [
    {
      label: 'Projeção atual',
      data: series.map((point) => point.base),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
    ...(showBoosted
      ? [
          {
            label: 'Com aporte +20%',
            data: series.map((point) => point.boosted ?? null),
            borderColor: '#16a34a',
            backgroundColor: 'transparent',
            borderDash: [6, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
        ]
      : []),
  ]

  return (
    <div className="mb-6 h-64 rounded border border-gray-200 bg-white p-4 sm:h-80">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: showBoosted, position: 'top' },
            tooltip: {
              callbacks: {
                label: (item: TooltipItem<'line'>) =>
                  item.parsed.y === null
                    ? `${item.dataset.label}: —`
                    : `${item.dataset.label}: ${formatCurrency(item.parsed.y)}`,
              },
            },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 8 } },
            y: {
              ticks: { callback: (value) => formatCurrencyCompact(Number(value)) },
            },
          },
        }}
      />
    </div>
  )
}
