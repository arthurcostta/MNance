import {
  collection,
  deleteField,
  doc,
  getDocs,
  getDocsFromServer,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Asset, AssetWithId } from '../types/asset'

function assetsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'assets')
}

function assetDocRef(uid: string, assetId: string) {
  return doc(db, 'users', uid, 'assets', assetId)
}

// Campos opcionais do aporte programado: na edição, `null` remove o campo do documento (o Firestore não
// aceita `undefined`), e ausente deixa como está.
// `excludedFromGrowth: null` remove o campo (volta a contar no crescimento).
export type AssetUpdate = Partial<
  Omit<Asset, 'status' | 'createdAt' | 'updatedAt' | 'monthlyContribution' | 'contributionEndsAt' | 'excludedFromGrowth'>
> & {
  monthlyContribution?: number | null
  contributionEndsAt?: string | null
  excludedFromGrowth?: boolean | null
}

// Sempre pede ao servidor: o cache local pode ter o saldo de antes de um aporte. Só cai para o cache
// quando o aparelho está offline (getDocsFromServer falha nesse caso).
export async function getAssets(uid: string): Promise<AssetWithId[]> {
  const ref = assetsCollectionRef(uid)
  const querySnapshot = await getDocsFromServer(ref).catch(() => getDocs(ref))
  return querySnapshot.docs.map((snap) => ({
    id: snap.id,
    ...snap.data(),
  } as AssetWithId))
}

export async function addAsset(
  uid: string,
  data: Omit<Asset, 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(assetsCollectionRef(uid), {
    ...data,
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateAsset(uid: string, assetId: string, data: AssetUpdate): Promise<void> {
  const { monthlyContribution, contributionEndsAt, excludedFromGrowth, ...rest } = data

  await updateDoc(assetDocRef(uid, assetId), {
    ...rest,
    ...(monthlyContribution === undefined
      ? {}
      : { monthlyContribution: monthlyContribution === null ? deleteField() : monthlyContribution }),
    ...(contributionEndsAt === undefined
      ? {}
      : { contributionEndsAt: contributionEndsAt === null ? deleteField() : contributionEndsAt }),
    ...(excludedFromGrowth === undefined
      ? {}
      : { excludedFromGrowth: excludedFromGrowth === null ? deleteField() : excludedFromGrowth }),
    updatedAt: serverTimestamp(),
  })
}

export async function archiveAsset(uid: string, assetId: string): Promise<void> {
  await updateDoc(assetDocRef(uid, assetId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  })
}
