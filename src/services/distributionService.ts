import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Distribution } from '../types/distribution'
import type { RiskProfile } from '../types/user'
import { type AllocationModelKey } from '../core/allocationModels'

const RISK_PROFILE_TO_MODEL: Record<RiskProfile, AllocationModelKey> = {
  conservative: 'CONSERVATIVE',
  moderate: 'ALL_WEATHER',
  aggressive: 'AGGRESSIVE',
}

// Nível 1 default: regra 50/30/20 (essenciais/liberdade/investimentos) — ponto de
// partida editável pelo usuário depois na Feature #13, não uma decisão travada do PRD.
export function getDefaultDistribution(riskProfile: RiskProfile): Omit<Distribution, 'updatedAt'> {
  return {
    essentialsPercent: 50,
    freedomPercent: 30,
    investmentsPercent: 20,
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
