import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Distribution, PaydaySplit } from '../types/distribution'

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

// `hasSecondPayday` reflete User.payday2 — quando existe, popula um 2º PaydaySplit (mesmo
// default) e um split de renda 50/50 entre os dois dias. O destino do saldo das essenciais
// (surplusInvestmentsPercent) nasce ausente de propósito: "decisão pendente".
export function getDefaultDistribution(hasSecondPayday: boolean): Omit<Distribution, 'updatedAt'> {
  return {
    payday1Split: { ...DEFAULT_PAYDAY_SPLIT },
    ...(hasSecondPayday
      ? { payday2Split: { ...DEFAULT_PAYDAY_SPLIT }, payday1IncomeSharePercent: 50 }
      : {}),
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

// Merge (updateDoc), nunca overwrite: a tela de Distribuição salva o split da renda e a
// regra do saldo em ações separadas, e uma não pode apagar o campo da outra.
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
// percentuais do usuário pelo default). Só cria quando não existe; se o 2º pagamento foi
// adicionado depois, acrescenta apenas o split dele. Se foi removido, o payday2Split fica
// órfão e inofensivo — useDistribution deriva hasSecondPayday do User.
export async function ensureDistribution(uid: string, hasSecondPayday: boolean): Promise<void> {
  const existing = await getDistribution(uid)
  if (!existing) {
    await setDistribution(uid, getDefaultDistribution(hasSecondPayday))
    return
  }

  if (hasSecondPayday && existing.payday1Split && !existing.payday2Split) {
    const { payday2Split, payday1IncomeSharePercent } = getDefaultDistribution(true)
    if (payday2Split && payday1IncomeSharePercent !== undefined) {
      await updateDistribution(uid, { payday2Split, payday1IncomeSharePercent })
    }
  }
}
