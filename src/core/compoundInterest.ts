// Motor de juros compostos com aportes mensais — base para projection.ts e goalTimeline.ts.
// Fórmula clássica de valor futuro (capital inicial + anuidade), com aportes lançados no
// fim de cada mês (convenção padrão de calculadoras financeiras).

export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

export interface CompoundInterestInput {
  principal: number
  monthlyContribution: number
  annualRate: number
  months: number
}

export function calculateCompoundInterest({
  principal,
  monthlyContribution,
  annualRate,
  months,
}: CompoundInterestInput): number {
  // Taxa zero é caso especial: a fórmula de anuidade divide por taxa e explodiria em
  // divisão por zero, mas o resultado financeiro correto é apenas a soma linear dos aportes.
  if (annualRate === 0) {
    return principal + monthlyContribution * months
  }

  const monthlyRate = annualToMonthlyRate(annualRate)
  const growthFactor = Math.pow(1 + monthlyRate, months)
  const principalGrowth = principal * growthFactor
  const contributionsGrowth = monthlyContribution * ((growthFactor - 1) / monthlyRate)

  return principalGrowth + contributionsGrowth
}
