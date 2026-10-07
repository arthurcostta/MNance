import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logout } from '../services/authService'
import Card from '../components/Common/Card'
import Button from '../components/Common/Button'
import Alert from '../components/Common/Alert'

// Dados da conta, atalho para reeditar o onboarding e o único "Sair" do mobile (a barra
// inferior não tem espaço para ele). No desktop o "Sair" também fica no rodapé da sidebar.
export default function Account() {
  const { user, currentUser } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setSigningOut(true)
    setError(null)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível sair. Tente novamente.')
      setSigningOut(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Conta</h1>

      <Card className="mb-4">
        <p className="text-xs font-medium text-gray-600">Nome</p>
        <p className="mt-1 text-base text-gray-900">{currentUser?.name ?? '—'}</p>
        <p className="mt-4 text-xs font-medium text-gray-600">E-mail</p>
        <p className="mt-1 break-all text-base text-gray-900">{user?.email ?? currentUser?.email ?? '—'}</p>
      </Card>

      <Card className="mb-4">
        <p className="mb-3 text-sm text-gray-700">
          Meta, renda, patrimônio e dias de pagamento ficam no onboarding. Você pode revisá-los quando quiser.
        </p>
        <Link
          to="/onboarding"
          className="inline-block rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Editar onboarding
        </Link>
      </Card>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Button variant="danger" onClick={handleLogout} disabled={signingOut} className="w-full">
        {signingOut ? 'Saindo...' : 'Sair'}
      </Button>
    </div>
  )
}
