import type { Timestamp } from 'firebase/firestore'

// Lista item a item comparada contra o orçamento de essenciais (Nível 1) — mais simples
// que a futura Feature #6 (M6.5/M7): sem status/recorrência/parcelas de propósito.
// Quando M7 (Despesas Zumbi/Priorização) for implementado, não reaproveitar o nome de
// coleção `essentialExpenses` para outra finalidade — ela já pertence a esta comparação.
export interface EssentialExpenseItem {
  name: string
  amount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface EssentialExpenseItemWithId extends EssentialExpenseItem {
  id: string
}
