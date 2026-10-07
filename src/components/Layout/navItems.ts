import type { ComponentType } from 'react'
import { Radar, PieChart, Wallet, User } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

// Só o que já existe de verdade aparece (decisão do usuário após o QA de 07/10/2026).
// Simulador, Despesas, Parcelas, Agenda, Relatório e Configurações voltam aqui — e em
// App.tsx — quando seus milestones forem construídos; as páginas-stub seguem no disco.
// Ordem = prioridade de uso (roadmap Fase 1), não alfabética.
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Radar', icon: Radar },
  { to: '/distribution', label: 'Distribuição', icon: PieChart },
  { to: '/portfolio', label: 'Portfólio', icon: Wallet },
]

// Fica separada de PRIMARY_NAV porque ocupa posições diferentes por layout: 4ª aba da
// barra inferior no mobile e rodapé da sidebar (junto do "Sair") no desktop.
export const ACCOUNT_NAV: NavItem = { to: '/account', label: 'Conta', icon: User }
