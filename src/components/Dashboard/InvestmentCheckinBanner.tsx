import { Link } from 'react-router-dom'
import { useInvestments, type CheckinSlot } from '../../hooks/useInvestments'
import Alert from '../Common/Alert'
import Button from '../Common/Button'
import { formatBRL } from '../../utils/formatCurrency'

interface InvestmentCheckinBannerProps {
  uid: string | undefined
}

// Aparece no Radar quando um dia de investir chegou e ainda não foi respondido. Não bloqueia nada:
// é só o convite para registrar, com saída rápida ("não investi este mês").
export default function InvestmentCheckinBanner({ uid }: InvestmentCheckinBannerProps) {
  const inv = useInvestments(uid)
  if (inv.loading) return null

  const open: CheckinSlot | undefined = inv.slots.find((s) => s.state === 'open')
  if (!open) return null

  return (
    <div className="mb-6">
      <Alert variant="info">
        <p className="font-medium">Hoje é dia de investir.</p>
        <p className="mt-1">
          Você planejou {formatBRL(open.plannedTotal)} para este dia. Invista e atualize seus investimentos aqui no app.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/investments"
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Atualizar investimentos
          </Link>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={inv.submitting}
            onClick={() => void inv.skip(open)}
          >
            Não investi este mês
          </Button>
        </div>
      </Alert>
    </div>
  )
}
