import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '../services/firebase'
import { getUserDocument } from '../services/userService'
import type { User } from '../types/user'

interface AuthContextValue {
  user: FirebaseUser | null
  currentUser: User | null
  loading: boolean
  // Recarrega o documento User do Firestore — usado após o Onboarding salvar dados,
  // para o resto do app (ex: Dashboard) enxergar o currentUser atualizado sem reload.
  refreshCurrentUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCurrentUser = useCallback(async () => {
    if (!auth.currentUser) {
      setCurrentUser(null)
      return
    }
    const doc = await getUserDocument(auth.currentUser.uid)
    setCurrentUser(doc)
  }, [])

  useEffect(() => {
    // Evita que a resposta de um login antigo (ex.: logout logo depois do login)
    // sobrescreva o estado de uma emissão mais nova do onAuthStateChanged.
    let latestEmission = 0

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const emission = ++latestEmission
      setUser(firebaseUser)

      if (!firebaseUser) {
        setCurrentUser(null)
        setLoading(false)
        return
      }

      // No login, o `loading` já foi para false na 1ª emissão (null, sem sessão). Sem religar
      // aqui, existe uma janela com user preenchido, loading=false e currentUser=null — e o
      // ProtectedRoute manda o usuário de volta ao onboarding. React agrupa as duas
      // atualizações no mesmo render, então não há frame intermediário.
      setLoading(true)
      getUserDocument(firebaseUser.uid)
        .then((doc) => {
          if (emission === latestEmission) setCurrentUser(doc)
        })
        .catch((error) => {
          console.error('Erro ao carregar o documento do usuário:', error)
          if (emission === latestEmission) setCurrentUser(null)
        })
        .finally(() => {
          if (emission === latestEmission) setLoading(false)
        })
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, currentUser, loading, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}
