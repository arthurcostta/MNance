import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/Common/ProtectedRoute'
import AppShell from './components/Layout/AppShell'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Distribution from './pages/Distribution'
import Account from './pages/Account'

// Simulator, Expenses, Installments, Calendar, Report e Settings continuam no disco como
// páginas-stub, mas sem rota nem item de menu até seus milestones (decisão do QA de 07/10/2026).

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}>
            {/* Onboarding fica fora do AppShell — o usuário ainda não tem dados
                completos para as outras telas (nem para a navegação apontar pra elas). */}
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
