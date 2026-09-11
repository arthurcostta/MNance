import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { User } from '../types/user'

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

export async function getUserDocument(uid: string): Promise<User | null> {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? (snap.data() as User) : null
}

// Preserva createdAt em reedições (onboarding permite voltar e atualizar dados) —
// só o primeiro setDoc de um uid deve gravar createdAt.
export async function setUserDocument(
  uid: string,
  data: Omit<User, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const ref = userRef(uid)
  const existing = await getDoc(ref)
  await setDoc(ref, {
    ...data,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserDocument(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(userRef(uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
