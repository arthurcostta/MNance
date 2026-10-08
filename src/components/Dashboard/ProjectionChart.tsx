import { useMemo } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { inflationFactor } from '../../core/inflation'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface ProjectionChartProps {
  base: number[]
  conservative: number[]
  optimistic: number[]
  boosted: number[] | null
  goalAmount: number
  goalYears: number
  // Anos até a meta no cenário base; null = não alcançada no horizonte.
  yearsToGoal: number | null
  inflationRate: number
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
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Pontos soltos (prazo e meta atingida): um valor no índice do ano, null no resto.
function pointAt(length: number, index: number | null, value: number | undefined): (number | null)[] {
  return Array.from({ length }, (_, i) => (i === index && value !== undefined ? value : null))
}

// Linha vertical tracejada no prazo da meta. Plugin inline: evita dependência de anotações.
function deadlinePlugin(goalYears: number, lastIndex: number): Plugin<'line'> {
  return {
    id: 'deadlineLine',
    afterDatasetsDraw(chart) {
      if (goalYears > lastIndex) return
      const xScale = chart.scales['x']
      if (!xScale) return

      const x = xScale.getPixelForValue(goalYears)
      const { top, bottom } = chart.chartArea
      const { ctx } = chart

      ctx.save()
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#374151'
      ctx.font = '11px sans-serif'
      ctx.textAlign = x > (chart.chartArea.left + chart.chartArea.right) / 2 ? 'right' : 'left'
      ctx.fillText(`Prazo: ${goalYears} ${goalYears === 1 ? 'ano' : 'anos'}`, x + (ctx.textAlign === 'right' ? -4 : 4), top + 12)
      ctx.restore()
    },
  }
}

export default function ProjectionChart({
  base,
  conservative,
  optimistic,
  boosted,
  goalAmount,
  goalYears,
  yearsToGoal,
  inflationRate,
}: ProjectionChartProps) {
  const lastIndex = base.length - 1
  const plugins = useMemo(() => [deadlinePlugin(goalYears, lastIndex)], [goalYears, lastIndex])
  // Eixo Y segue a meta e a curva base; o otimista pode passar disso no fim do horizonte e é cortado,
  // em vez de achatar a linha da meta.
  const yMax = Math.max(goalAmount * 1.25, base[lastIndex] ?? 0)

  if (base.length === 0) {
    return null
  }

  const labels = base.map((_, year) => (year === 0 ? 'Hoje' : `Ano ${year}`))
  const goalIndex = yearsToGoal !== null && yearsToGoal <= lastIndex ? Math.ceil(yearsToGoal) : null
  const deadlineIndex = goalYears <= lastIndex ? goalYears : null

  const datasets = [
    {
      label: 'Conservador',
      data: conservative,
      borderColor: 'rgba(37, 99, 235, 0.35)',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0,
      pointRadius: 0,
      borderWidth: 1,
    },
    {
      // fill '-1' sombreia a faixa entre o conservador e o otimista.
      label: 'Otimista',
      data: optimistic,
      borderColor: 'rgba(37, 99, 235, 0.35)',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      fill: '-1',
      tension: 0,
      pointRadius: 0,
      borderWidth: 1,
    },
    {
      label: 'Projeção base',
      data: base,
      borderColor: '#2563eb',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0,
      pointRadius: 0,
      borderWidth: 2.5,
    },
    ...(boosted
      ? [
          {
            label: 'Com aporte +20%',
            data: boosted,
            borderColor: '#16a34a',
            backgroundColor: 'transparent',
            borderDash: [6, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            borderWidth: 2,
          },
        ]
      : []),
    {
      label: `Meta (${formatCurrencyCompact(goalAmount)})`,
      data: base.map(() => goalAmount),
      borderColor: '#dc2626',
      borderDash: [4, 4],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0,
      pointRadius: 0,
      borderWidth: 1.5,
    },
    {
      label: 'No seu prazo',
      data: pointAt(base.length, deadlineIndex, base[deadlineIndex ?? 0]),
      borderColor: '#374151',
      backgroundColor: '#374151',
      showLine: false,
      pointRadius: 6,
      pointHoverRadius: 8,
    },
    ...(goalIndex !== null
      ? [
          {
            label: 'Meta atingida',
            data: pointAt(base.length, goalIndex, goalAmount),
            borderColor: '#dc2626',
            backgroundColor: '#dc2626',
            showLine: false,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ]
      : []),
  ]

  const summary =
    yearsToGoal === null
      ? `Projeção em valores de hoje: a meta de ${formatCurrency(goalAmount)} não é atingida no horizonte exibido.`
      : `Projeção em valores de hoje: a meta de ${formatCurrency(goalAmount)} é atingida em cerca de ${Math.ceil(yearsToGoal)} anos.`

  return (
    <div
      className="mb-6 h-80 rounded border border-gray-200 bg-white p-4 sm:h-96"
      role="img"
      aria-label={summary}
    >
      <Line
        data={{ labels, datasets }}
        plugins={plugins}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              // Os marcadores (prazo e meta atingida) são autoexplicativos no gráfico e no tooltip.
              labels: {
                boxWidth: 14,
                font: { size: 11 },
                filter: (item) => item.text !== 'No seu prazo' && item.text !== 'Meta atingida',
              },
            },
            tooltip: {
              filter: (item: TooltipItem<'line'>) => item.parsed.y !== null,
              callbacks: {
                label: (item: TooltipItem<'line'>) =>
                  item.parsed.y === null ? '' : `${item.dataset.label}: ${formatCurrency(item.parsed.y)}`,
                footer: (items: TooltipItem<'line'>[]) => {
                  const year = items[0]?.dataIndex ?? 0
                  const baseValue = base[year]
                  if (year === 0 || baseValue === undefined || inflationRate === 0) return ''
                  const nominal = baseValue / inflationFactor(inflationRate, year)
                  return `Base ≈ ${formatCurrency(nominal)} em dinheiro do ano ${year}`
                },
              },
            },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 10 }, title: { display: true, text: 'Anos' } },
            y: {
              beginAtZero: true,
              max: yMax,
              ticks: { callback: (value) => formatCurrencyCompact(Number(value)) },
              title: { display: true, text: 'Valores de hoje' },
            },
          },
        }}
      />
    </div>
  )
}
