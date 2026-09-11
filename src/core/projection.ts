// Projeção de patrimônio — usa o motor de juros compostos para responder "quanto vou ter
// em N anos". Consome os tipos já definidos em types.ts (ProjectionInput/ProjectionResult).

import { calculateCompoundInterest } from './compoundInterest'
import type { ProjectionInput, ProjectionResult } from './types'

export function calculateProjection({
  currentPatrimony,
  monthlyContribution,
  annualReturnRate,
  years,
}: ProjectionInput): ProjectionResult {
  const months = years * 12

  const finalAmount = calculateCompoundInterest({
    principal: currentPatrimony,
    monthlyContribution,
    annualRate: annualReturnRate,
    months,
  })

  const totalContributed = monthlyContribution * months
  const totalInterestEarned = finalAmount - currentPatrimony - totalContributed

  return {
    finalAmount,
    totalContributed,
    totalInterestEarned,
  }
}
