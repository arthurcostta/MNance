import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/authService'
import Button from '../components/Common/Button'
import Alert from '../components/Common/Alert'
import FormField from '../components/Common/FormField'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('E-mail ou senha inválidos.')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Entrar no MNance</h1>
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
        <FormField label="Senha">
          {(fieldProps) => (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              {...fieldProps}
            />
          )}
        </FormField>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" className="w-full">
          Entrar
        </Button>
        <p className="text-sm">
          Não tem conta?{' '}
          <Link to="/signup" className="underline">
            Cadastre-se
          </Link>
        </p>
      </form>
    </div>
  )
}
