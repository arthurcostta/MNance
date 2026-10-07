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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface ProjectionChartProps {
  series: number[]
  boostedSeries: number[] | null
  goalAmount: number
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

export default function ProjectionChart({ series, boostedSeries, goalAmount }: ProjectionChartProps) {
  if (series.length === 0) {
    return null
  }

  const labels = series.map((_, idx) => (idx === 0 ? 'Hoje' : `Ano ${idx}`))

  const datasets = [
    {
      label: 'Projeção (valores de hoje)',
      data: series,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
    ...(boostedSeries
      ? [
          {
            label: 'Com aporte +20%',
            data: boostedSeries,
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
    {
      label: 'Meta',
      data: series.map(() => goalAmount),
      borderColor: '#dc2626',
      borderDash: [4, 4],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0,
      pointRadius: 0,
      borderWidth: 1,
    },
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
            legend: { display: true, position: 'top' },
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
            x: { ticks: { maxTicksLimit: 8 }, title: { display: true, text: 'Anos' } },
            y: {
              ticks: { callback: (value) => formatCurrencyCompact(Number(value)) },
              title: { display: true, text: 'Valores de hoje' },
            },
          },
        }}
      />
    </div>
  )
}
