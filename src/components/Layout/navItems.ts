import type { ComponentType } from 'react'
import {
  Radar,
  PieChart,
  Wallet,
  SlidersHorizontal,
  Receipt,
  CreditCard,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

// Ordem = prioridade de uso (roadmap Fase 1), não alfabética. lucide-react já era
// dependência desde o M0 mas nunca tinha sido usada — 1ª navegação real do app (M5.5).
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Radar', icon: Radar },
  { to: '/distribution', label: 'Distribuição', icon: PieChart },
  { to: '/portfolio', label: 'Portfólio', icon: Wallet },
]

// Só relevante no mobile — no desktop a sidebar já lista tudo, sem precisar de "Mais".
export const MORE_NAV: NavItem[] = [
  { to: '/simulator', label: 'Simulador', icon: SlidersHorizontal },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  { to: '/installments', label: 'Parcelas', icon: CreditCard },
  { to: '/calendar', label: 'Agenda', icon: Calendar },
  { to: '/report', label: 'Relatório', icon: FileText },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV]
