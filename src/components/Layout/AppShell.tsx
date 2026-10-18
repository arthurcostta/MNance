import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { logout } from '../../services/authService'
import { ACCOUNT_NAV, PRIMARY_NAV } from './navItems'

function bottomLinkClass({ isActive }: { isActive: boolean }) {
  return `flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs ${
    isActive ? 'font-medium text-black' : 'text-gray-500'
  }`
}

function sidebarLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded px-3 py-2 text-sm ${
    isActive ? 'bg-gray-100 font-medium text-black' : 'text-gray-600 hover:bg-gray-50'
  }`
}

// Primeira navegação real do app (achado mais grave da auditoria de UI/UX do M5.5:
// nenhuma nav bar/sidebar existia). Desde o M5.8 só lista o que já está construído.
// Desktop: sidebar fixa, com "Conta" e "Sair" no rodapé. Mobile: barra inferior com as
// 3 telas principais + "Conta" (onde fica o "Sair", ver pages/Account.tsx).
export default function AppShell() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao sair:', error)
      return
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh sm:flex">
      {/* sticky + h-svh: a sidebar acompanha a janela, então "Conta" e "Sair" ficam sempre visíveis
          (antes ela tinha a altura da página inteira e o rodapé só aparecia ao rolar até o fim). */}
      <aside className="hidden h-svh w-56 shrink-0 flex-col gap-1 self-start overflow-y-auto border-r border-gray-200 bg-white p-4 sm:sticky sm:top-0 sm:flex">
        <p className="mb-4 px-3 text-lg font-semibold">MNance</p>
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={sidebarLinkClass}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        <div className="mt-auto flex flex-col gap-1 border-t border-gray-200 pt-3">
          <NavLink to={ACCOUNT_NAV.to} className={sidebarLinkClass}>
            <ACCOUNT_NAV.icon className="h-4 w-4" />
            {ACCOUNT_NAV.label}
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white sm:hidden">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={bottomLinkClass}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        <NavLink to={ACCOUNT_NAV.to} className={bottomLinkClass}>
          <ACCOUNT_NAV.icon className="h-5 w-5" />
          {ACCOUNT_NAV.label}
        </NavLink>
      </nav>
    </div>
  )
}
