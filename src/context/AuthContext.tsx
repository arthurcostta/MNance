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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        getUserDocument(firebaseUser.uid)
          .then(setCurrentUser)
          .finally(() => setLoading(false))
      } else {
        setCurrentUser(null)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, currentUser, loading, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}
