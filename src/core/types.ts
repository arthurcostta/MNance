// Tipos compartilhados pelo motor de cálculo (src/core).
// Este módulo é TypeScript puro: nunca importa React, Firebase ou tipos do Firestore
// (ver regra em CLAUDE.md — core/ precisa ser portável para Cloud Functions no futuro).

export interface ProjectionInput {
  currentPatrimony: number
  monthlyContribution: number
  annualReturnRate: number
  years: number
}

export interface ProjectionResult {
  finalAmount: number
  totalContributed: number
  totalInterestEarned: number
}
