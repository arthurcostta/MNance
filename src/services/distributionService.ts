import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Distribution } from '../types/distribution'
import type { RiskProfile } from '../types/user'
import { type AllocationModelKey } from '../core/allocationModels'

const RISK_PROFILE_TO_MODEL: Record<RiskProfile, AllocationModelKey> = {
  conservative: 'CONSERVATIVE',
  moderate: 'ALL_WEATHER',
  aggressive: 'AGGRESSIVE',
}

// Nível 1 default: regra 55/10/10/25 (essenciais/educação/lazer/investimentos), fiel ao
// PRD §5 — ponto de partida editável pelo usuário depois na Feature #13.
export function getDefaultDistribution(riskProfile: RiskProfile): Omit<Distribution, 'updatedAt'> {
  return {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
    allocationModel: RISK_PROFILE_TO_MODEL[riskProfile],
  }
}

function distributionRef(uid: string) {
  return doc(db, 'users', uid, 'distribution', 'current')
}

export async function getDistribution(uid: string): Promise<Distribution | null> {
  const snap = await getDoc(distributionRef(uid))
  return snap.exists() ? (snap.data() as Distribution) : null
}

export async function setDistribution(
  uid: string,
  data: Omit<Distribution, 'updatedAt'>
): Promise<void> {
  await setDoc(distributionRef(uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Usado pela tela de Distribuição (M5), que salva Nível 1 e Nível 2 em ações separadas —
// merge (updateDoc), nunca overwrite, para não apagar os campos do outro nível.
export async function updateDistribution(
  uid: string,
  data: Partial<Omit<Distribution, 'updatedAt'>>
): Promise<void> {
  await updateDoc(distributionRef(uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
