import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { EssentialExpenseItem, EssentialExpenseItemWithId } from '../types/essentialExpense'

function essentialExpensesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'essentialExpenses')
}

function essentialExpenseDocRef(uid: string, itemId: string) {
  return doc(db, 'users', uid, 'essentialExpenses', itemId)
}

export async function getEssentialExpenses(uid: string): Promise<EssentialExpenseItemWithId[]> {
  const querySnapshot = await getDocs(essentialExpensesCollectionRef(uid))
  return querySnapshot.docs.map(
    (snap) =>
      ({
        id: snap.id,
        ...snap.data(),
      }) as EssentialExpenseItemWithId
  )
}

export async function addEssentialExpense(
  uid: string,
  data: Omit<EssentialExpenseItem, 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(essentialExpensesCollectionRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateEssentialExpense(
  uid: string,
  itemId: string,
  data: Partial<Omit<EssentialExpenseItem, 'createdAt'>>
): Promise<void> {
  await updateDoc(essentialExpenseDocRef(uid, itemId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Hard delete (não soft-delete como assetService.archiveAsset): itens de orçamento
// recalculáveis, sem valor histórico a preservar — diferente de posições de investimento.
export async function deleteEssentialExpense(uid: string, itemId: string): Promise<void> {
  await deleteDoc(essentialExpenseDocRef(uid, itemId))
}
