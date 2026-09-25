import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../services/authService'
import Button from '../components/Common/Button'
import Alert from '../components/Common/Alert'
import FormField from '../components/Common/FormField'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signup(email, password)
      navigate('/onboarding')
    } catch {
      setError('Não foi possível criar a conta. Verifique os dados e tente novamente.')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Criar conta no MNance</h1>
        <FormField label="E-mail">
          {(fieldProps) => (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              {...fieldProps}
            />
          )}
        </FormField>
        <FormField label="Senha" hint="Mínimo de 6 caracteres">
          {(fieldProps) => (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              {...fieldProps}
            />
          )}
        </FormField>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" className="w-full">
          Criar conta
        </Button>
        <p className="text-sm">
          Já tem conta?{' '}
          <Link to="/login" className="underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}
