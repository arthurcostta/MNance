import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Distribution, PaydaySplit, StoredDistribution } from '../types/distribution'

// Default de cada dia de pagamento: 55/10/10/25 (despesas/educação pessoal/lazer/investimentos),
// fiel ao PRD §5, sem categorias personalizadas. Quem precisa de outra categoria (ex.: Caixa da
// Empresa) cria na tela de Distribuição, reduzindo as outras — nada é auto-rebalanceado.
function defaultSplit(): PaydaySplit {
  return {
    essentialsPercent: 55,
    educationPercent: 10,
    leisurePercent: 10,
    investmentsPercent: 25,
    customPercents: {},
  }
}

// `hasSecondPayday` reflete User.payday2 — quando existe, popula um 2º PaydaySplit (mesmo
// default) e um split de renda 50/50 entre os dois dias. O destino do saldo das essenciais
// (surplusInvestmentsPercent) nasce ausente de propósito: "decisão pendente".
export function getDefaultDistribution(hasSecondPayday: boolean): Omit<Distribution, 'updatedAt'> {
  return {
    payday1Split: defaultSplit(),
    customCategories: [],
    ...(hasSecondPayday
      ? { payday2Split: defaultSplit(), payday1IncomeSharePercent: 50 }
      : {}),
  }
}

function distributionRef(uid: string) {
  return doc(db, 'users', uid, 'distribution', 'current')
}

export async function getDistribution(uid: string): Promise<StoredDistribution | null> {
  const snap = await getDoc(distributionRef(uid))
  return snap.exists() ? (snap.data() as StoredDistribution) : null
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
