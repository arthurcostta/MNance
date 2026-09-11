// Feature #1 (Onboarding) — reserva de emergência.
//
// Desvio consciente do PRD §4.1: o PRD calcula a reserva sobre o custo essencial mensal
// (essentialMonthlyCost). Esta implementação usa a renda líquida mensal (monthlyIncomeNet)
// como base. Raciocínio: quem ganha R$ 5.000 e gasta R$ 2.000 em essenciais dificilmente
// aceita, numa emergência real, cair para um padrão de vida de R$ 2.000 — a reserva precisa
// sustentar a renda real da pessoa, não só a sobrevivência mínima.
//
// Pendência para M2 (Onboarding): a UI precisa explicar esse raciocínio ao usuário — não é
// só mostrar o número, é educação financeira sobre por que a base é a renda, não o gasto.
//
// Sem validação defensiva de input aqui (renda negativa, etc.) — isso é responsabilidade da
// borda (formulário de Onboarding), não do motor de cálculo.

export interface EmergencyReserveInput {
  monthlyIncomeNet: number
}

export interface EmergencyReserveResult {
  minimumReserve: number
  safeReserve: number
}

const MINIMUM_MONTHS = 6
const SAFE_MONTHS = 12

export function calculateEmergencyReserve({
  monthlyIncomeNet,
}: EmergencyReserveInput): EmergencyReserveResult {
  return {
    minimumReserve: monthlyIncomeNet * MINIMUM_MONTHS,
    safeReserve: monthlyIncomeNet * SAFE_MONTHS,
  }
}
