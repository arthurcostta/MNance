import { NavLink, Outlet } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { ALL_NAV, PRIMARY_NAV } from './navItems'

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
// nenhuma nav bar/sidebar existia, 10 de 12 rotas só eram alcançáveis digitando a URL).
// Sidebar fixa lista as 9 rotas protegidas direto no desktop; a barra inferior do mobile
// só cabe 4 posições, então agrupa o resto em "Mais" (pages/More.tsx).
export default function AppShell() {
  return (
    <div className="min-h-svh sm:flex">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-white p-4 sm:flex">
        <p className="mb-4 px-3 text-lg font-semibold">MNance</p>
        {ALL_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={sidebarLinkClass}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
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
        <NavLink to="/more" className={bottomLinkClass}>
          <MoreHorizontal className="h-5 w-5" />
          Mais
        </NavLink>
      </nav>
    </div>
  )
}
