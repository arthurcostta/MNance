import { NavLink } from 'react-router-dom'
import { MORE_NAV } from '../components/Layout/navItems'

// Só faz sentido como destino no mobile (a sidebar do desktop já lista tudo direto),
// mas a rota funciona em qualquer largura sem guard, para não complicar.
export default function More() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Mais</h1>
      <div className="space-y-2">
        {MORE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-800 hover:bg-gray-50"
          >
            <item.icon className="h-5 w-5 text-gray-500" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
