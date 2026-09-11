// Feature #9 (Despesas Zumbi) — PRD §4.9: "> 60 dias sem uso e não dispensado → zumbi".
//
// Usa differenceInCalendarDays (date-fns) em vez de subtrair milissegundos: subtração bruta
// de Date quebra perto de viradas de horário de verão / fuso horário, contando um dia a mais
// ou a menos na fronteira exata dos 60 dias (CENÁRIO 69). date-fns já é dependência do
// projeto.
//
// Datas chegam como `Date`, não `Timestamp` do Firestore — core/ nunca importa Firebase
// (conversão Timestamp → Date é responsabilidade da camada de hooks/services).

import { differenceInCalendarDays } from 'date-fns'

export interface ZombieCheckInput {
  lastActivityDate: Date
  dismissedAsZombie: boolean
}

export interface ZombieDetectionResult {
  isZombie: boolean
  daysSinceLastActivity: number
}

const DEFAULT_THRESHOLD_DAYS = 60

export function detectZombie(
  { lastActivityDate, dismissedAsZombie }: ZombieCheckInput,
  referenceDate: Date,
  thresholdDays: number = DEFAULT_THRESHOLD_DAYS,
): ZombieDetectionResult {
  const daysSinceLastActivity = differenceInCalendarDays(referenceDate, lastActivityDate)

  return {
    // "> 60", não ">= 60" — no dia exato do limite, ainda não é zumbi (CENÁRIO 47).
    isZombie: !dismissedAsZombie && daysSinceLastActivity > thresholdDays,
    daysSinceLastActivity,
  }
}
