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
import { niceAxis } from '../../core/radarView'

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

// Itens que ficam fora da legenda: a faixa vira um item só, e meta/marcadores são rotulados no próprio gráfico.
const HIDDEN_FROM_LEGEND = new Set(['Conservador', 'Meta', 'No seu prazo', 'Meta atingida'])
const BAND_LEGEND_LABEL = 'Faixa de cenários (−2 / +1 p.p. de retorno)'

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

interface AnnotationsConfig {
  goalAmount: number
  goalYears: number
  lastIndex: number
  deadlineValue: number | null
  yearsToGoal: number | null
}

// Desenha, sem dependência extra: a linha vertical do prazo, o rótulo da meta (na linha vermelha)
// e os rótulos dos dois pontos (no prazo e na meta atingida), para que nenhum ponto dependa da legenda.
function annotationsPlugin(config: AnnotationsConfig): Plugin<'line'> {
  return {
    id: 'radarAnnotations',
    afterDatasetsDraw(chart) {
      const xScale = chart.scales['x']
      const yScale = chart.scales['y']
      if (!xScale || !yScale) return

      const { ctx, chartArea } = chart
      const deadlineX = xScale.getPixelForValue(config.goalYears)

      ctx.save()
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#374151'

      // Prazo: linha vertical tracejada (só quando o prazo cabe no horizonte).
      if (config.goalYears <= config.lastIndex) {
        ctx.setLineDash([5, 4])
        ctx.strokeStyle = '#6b7280'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(deadlineX, chartArea.top)
        ctx.lineTo(deadlineX, chartArea.bottom)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Meta: rótulo logo acima da linha vermelha, do lado esquerdo (a curva começa embaixo, então o espaço está livre).
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`Meta ${formatCurrencyCompact(config.goalAmount)}`, chartArea.left + 4, yScale.getPixelForValue(config.goalAmount) - 4)

      // Prazo: rótulo acima e à esquerda do ponto azul. Ali a curva ainda está abaixo, então o espaço está livre.
      // No celular o texto longo não cabe; nesse caso usa a versão curta.
      if (config.deadlineValue !== null && config.goalYears <= config.lastIndex) {
        const x = deadlineX
        const y = yScale.getPixelForValue(config.deadlineValue)
        const value = formatCurrencyCompact(config.deadlineValue)
        const years = `${config.goalYears} ${config.goalYears === 1 ? 'ano' : 'anos'}`
        const full = `No prazo (${years}): ${value}`
        const short = `No prazo: ${value}`
        const fits = (text: string) => x - 6 - ctx.measureText(text).width >= chartArea.left
        const label = fits(full) ? full : short
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, x - 6, y - 8)
      }

      // Meta atingida: rótulo logo abaixo da linha vermelha, à direita do ponto (a curva já passou da meta ali).
      // Se não couber à direita, vai para a esquerda.
      if (config.yearsToGoal !== null && Math.ceil(config.yearsToGoal) <= config.lastIndex) {
        const years = Math.ceil(config.yearsToGoal)
        const x = xScale.getPixelForValue(years)
        const y = yScale.getPixelForValue(config.goalAmount)
        const text = `Meta atingida aos ${years} anos`
        const fitsRight = x + 8 + ctx.measureText(text).width <= chartArea.right
        ctx.textAlign = fitsRight ? 'left' : 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(text, x + (fitsRight ? 8 : -8), y + 8)
      }
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
  const deadlineIndex = goalYears <= lastIndex ? goalYears : null
  const deadlineValue = deadlineIndex !== null ? (base[deadlineIndex] ?? null) : null
  const plugins = useMemo(
    () => [annotationsPlugin({ goalAmount, goalYears, lastIndex, deadlineValue, yearsToGoal })],
    [goalAmount, goalYears, lastIndex, deadlineValue, yearsToGoal]
  )

  if (base.length === 0) {
    return null
  }

  // Eixo Y: degraus redondos, com folga sobre a meta e a curva base. O otimista pode passar disso no fim do horizonte e é cortado.
  const axis = niceAxis(Math.max(goalAmount * 1.1, base[lastIndex] ?? 0))
  const labels = base.map((_, year) => (year === 0 ? 'Hoje' : `Ano ${year}`))
  const goalIndex = yearsToGoal !== null && yearsToGoal <= lastIndex ? Math.ceil(yearsToGoal) : null

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
      label: 'Meta',
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
      data: pointAt(base.length, deadlineIndex, deadlineValue ?? undefined),
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
    <div className="mb-6">
      <div className="h-80 rounded border border-gray-200 bg-white p-4 sm:h-96" role="img" aria-label={summary}>
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
                labels: {
                  boxWidth: 14,
                  font: { size: 11 },
                  generateLabels: (chart) =>
                    ChartJS.defaults.plugins.legend.labels
                      .generateLabels(chart)
                      .filter((item) => !HIDDEN_FROM_LEGEND.has(item.text))
                      .map((item) => (item.text === 'Otimista' ? { ...item, text: BAND_LEGEND_LABEL } : item)),
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
              x: { ticks: { maxTicksLimit: 10, maxRotation: 0 }, title: { display: true, text: 'Anos a partir de hoje' } },
              y: {
                beginAtZero: true,
                min: 0,
                max: axis.max,
                ticks: { stepSize: axis.step, callback: (value) => formatCurrencyCompact(Number(value)) },
                title: { display: true, text: 'Valores de hoje' },
              },
            },
          }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-600">
        Linha azul: seu plano atual. Faixa: o que acontece se o retorno ficar entre o pior e o melhor cenário.
      </p>
    </div>
  )
}
