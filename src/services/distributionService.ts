import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Distribution, PaydaySplit } from '../types/distribution'
import type { RiskProfile } from '../types/user'
import { type AllocationModelKey } from '../core/allocationModels'
import { generateId } from '../utils/generateId'

const RISK_PROFILE_TO_MODEL: Record<RiskProfile, AllocationModelKey> = {
  conservative: 'CONSERVATIVE',
  moderate: 'ALL_WEATHER',
  aggressive: 'AGGRESSIVE',
}

// Default de cada dia de pagamento: 55/10/10/25 (essenciais/educação/lazer/investimentos),
// fiel ao PRD §5, com companyCashPercent: 0 — decisão M5.5 corrigida em sessão: a 5ª
// categoria nasce zerada para não piorar o default de quem não tem empresa (a maioria).
// Quem precisar (como o usuário que pediu a feature) ajusta manualmente na tela de
// Distribuição, reduzindo as outras categorias — nada é auto-rebalanceado.
const DEFAULT_PAYDAY_SPLIT: PaydaySplit = {
  essentialsPercent: 55,
  educationPercent: 10,
  leisurePercent: 10,
  investmentsPercent: 25,
  companyCashPercent: 0,
}

// Nível 1 + Nível 2 default. `hasSecondPayday` reflete User.payday2 — quando existe,
// popula um 2º PaydaySplit (mesmo default) e um split de renda 50/50 entre os dois dias.
export function getDefaultDistribution(
  riskProfile: RiskProfile,
  hasSecondPayday: boolean
): Omit<Distribution, 'updatedAt'> {
  return {
    payday1Split: { ...DEFAULT_PAYDAY_SPLIT },
    ...(hasSecondPayday
      ? { payday2Split: { ...DEFAULT_PAYDAY_SPLIT }, payday1IncomeSharePercent: 50 }
      : {}),
    investmentBuckets: [
      {
        id: generateId(),
        name: 'Meus Investimentos',
        percentOfInvestments: 100,
        allocationModel: RISK_PROFILE_TO_MODEL[riskProfile],
      },
    ],
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

// Usado pela tela de Distribuição, que salva Nível 1 e Nível 2 em ações separadas —
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

// Usado pelo Onboarding ao salvar. Reeditar o onboarding NÃO pode jogar fora uma
// Distribuição já personalizada (achado do QA de 07/10/2026: "Atualizar" trocava os
// objetivos e percentuais do usuário pelo default). Só cria quando não existe; se o 2º
// pagamento foi adicionado depois, acrescenta apenas o split dele. Se foi removido, o
// payday2Split fica órfão e inofensivo — useDistribution deriva hasSecondPayday do User.
export async function ensureDistribution(
  uid: string,
  riskProfile: RiskProfile,
  hasSecondPayday: boolean
): Promise<void> {
  const existing = await getDistribution(uid)
  if (!existing) {
    await setDistribution(uid, getDefaultDistribution(riskProfile, hasSecondPayday))
    return
  }

  if (hasSecondPayday && existing.payday1Split && !existing.payday2Split) {
    const { payday2Split, payday1IncomeSharePercent } = getDefaultDistribution(riskProfile, true)
    if (payday2Split && payday1IncomeSharePercent !== undefined) {
      await updateDistribution(uid, { payday2Split, payday1IncomeSharePercent })
    }
  }
}
