import { useCallback, useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
import { getUserDocument, setUserDocument } from '../services/userService'
import { ensureDistribution, getDefaultDistribution } from '../services/distributionService'
import { usePortfolio } from './usePortfolio'
import type { RiskProfile, User } from '../types/user'

export interface OnboardingData {
  name: string
  goalAmount: number
  goalYears: number
  riskProfile: RiskProfile
  currentPatrimony: number
  monthlyIncomeNet: number
  essentialMonthlyCost: number
  payday1: number
  payday2: number | null
  // Não editável no Onboarding (é da Feature #14) — só preservado ao reeditar para não
  // resetar a preferência do usuário quando ele volta para atualizar outros dados.
  darkMode: boolean
}

export type ValidationErrors = Partial<Record<keyof OnboardingData, string>>

const INITIAL_DATA: OnboardingData = {
  name: '',
  goalAmount: 0,
  goalYears: 20,
  riskProfile: 'moderate',
  currentPatrimony: 0,
  monthlyIncomeNet: 0,
  essentialMonthlyCost: 0,
  payday1: 1,
  payday2: null,
  darkMode: false,
}

export const TOTAL_STEPS = 5
export const REVIEW_STEP = TOTAL_STEPS

// Função pura, testável isoladamente — valida um passo específico.
export function validateStep(step: number, data: OnboardingData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (step === 1) {
    if (!data.name.trim()) errors.name = 'Informe seu nome.'
    if (data.goalAmount <= 0) errors.goalAmount = 'A meta precisa ser maior que zero.'
    if (data.goalYears <= 0 || data.goalYears > 100) {
      errors.goalYears = 'O prazo precisa estar entre 1 e 100 anos.'
    }
  }

  if (step === 2) {
    if (data.currentPatrimony < 0) {
      errors.currentPatrimony = 'O patrimônio não pode ser negativo.'
    }
  }

  if (step === 3) {
    if (data.monthlyIncomeNet <= 0) {
      errors.monthlyIncomeNet = 'A renda precisa ser maior que zero.'
    }
    if (data.essentialMonthlyCost < 0) {
      errors.essentialMonthlyCost = 'O custo essencial não pode ser negativo.'
    } else if (data.essentialMonthlyCost > data.monthlyIncomeNet) {
      errors.essentialMonthlyCost = 'O custo essencial não pode ser maior que a renda.'
    }
  }

  if (step === 4) {
    if (data.payday1 < 1 || data.payday1 > 31) {
      errors.payday1 = 'Escolha um dia entre 1 e 31.'
    }
    if (data.payday2 !== null) {
      if (data.payday2 < 1 || data.payday2 > 31) {
        errors.payday2 = 'Escolha um dia entre 1 e 31.'
      } else if (data.payday2 === data.payday1) {
        errors.payday2 = 'O segundo dia precisa ser diferente do primeiro.'
      }
    }
  }

  return errors
}

// Junta os erros dos passos de preenchimento (1–4); a revisão (passo 5) não tem campos.
export function validateAll(data: OnboardingData): ValidationErrors {
  const errors: ValidationErrors = {}
  for (let step = 1; step < REVIEW_STEP; step++) {
    Object.assign(errors, validateStep(step, data))
  }
  return errors
}

// Primeiro passo (1–4) com erro, ou null se tudo é válido. Usado para levar o usuário
// ao bloco certo quando um documento antigo/incompleto não passa na validação ao salvar.
export function firstInvalidStep(data: OnboardingData): number | null {
  for (let step = 1; step < REVIEW_STEP; step++) {
    if (Object.keys(validateStep(step, data)).length > 0) return step
  }
  return null
}

// `darkMode` fica de fora de propósito: não é editável aqui, então nunca conta como alteração.
export function isOnboardingDirty(initial: OnboardingData, current: OnboardingData): boolean {
  return (
    initial.name !== current.name ||
    initial.goalAmount !== current.goalAmount ||
    initial.goalYears !== current.goalYears ||
    initial.riskProfile !== current.riskProfile ||
    initial.currentPatrimony !== current.currentPatrimony ||
    initial.monthlyIncomeNet !== current.monthlyIncomeNet ||
    initial.essentialMonthlyCost !== current.essentialMonthlyCost ||
    initial.payday1 !== current.payday1 ||
    initial.payday2 !== current.payday2
  )
}

// Com ativos ativos no Portfólio o patrimônio é o total deles — o mesmo número do card do Radar
// (`useProjection`). O valor digitado no onboarding (`User.currentPatrimony`) só vale como
// estimativa enquanto não há ativos; sem isso a edição mostraria o valor velho (ex.: R$ 0).
export function resolveCurrentPatrimony(
  storedValue: number,
  assetCount: number,
  portfolioTotal: number
): number {
  return assetCount > 0 ? Math.round(portfolioTotal * 100) / 100 : storedValue
}

export function useOnboarding(uid: string | undefined) {
  const portfolio = usePortfolio(uid)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  // Foto dos dados como vieram do Firestore (só em edição) — base do "Cancelar" com confirmação.
  const [initialData, setInitialData] = useState<OnboardingData | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [existingUser, setExistingUser] = useState<User | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!uid) {
      setUserLoaded(true)
      return
    }
    let cancelled = false
    getUserDocument(uid).then((existing) => {
      if (cancelled) return
      setExistingUser(existing)
      setUserLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  // Inicializa uma única vez, quando o usuário e o Portfólio já carregaram: o patrimônio
  // exibido depende dos dois, e inicializar antes mostraria o valor velho por um instante.
  useEffect(() => {
    if (ready || !userLoaded || portfolio.loadingInitial) return
    if (existingUser) {
      const loaded: OnboardingData = {
        name: existingUser.name,
        goalAmount: existingUser.goalAmount,
        goalYears: existingUser.goalYears,
        riskProfile: existingUser.riskProfile,
        currentPatrimony: resolveCurrentPatrimony(
          existingUser.currentPatrimony,
          portfolio.assets.length,
          portfolio.totalValue
        ),
        monthlyIncomeNet: existingUser.monthlyIncomeNet,
        essentialMonthlyCost: existingUser.essentialMonthlyCost,
        payday1: existingUser.payday1,
        payday2: existingUser.payday2,
        darkMode: existingUser.darkMode,
      }
      setIsEditing(true)
      setData(loaded)
      setInitialData(loaded)
      // Quem já tem cadastro não precisa responder tudo de novo: abre na revisão, com os
      // dados atuais, e escolhe qual bloco alterar.
      setCurrentStep(REVIEW_STEP)
    }
    setReady(true)
  }, [ready, userLoaded, existingUser, portfolio.loadingInitial, portfolio.assets.length, portfolio.totalValue])

  const loadingInitial = !ready
  // Em edição com ativos cadastrados o patrimônio vem do Portfólio e não é editável aqui.
  const patrimonyFromPortfolio = isEditing && portfolio.assets.length > 0

  const emergencyReserve = calculateEmergencyReserve({
    monthlyIncomeNet: data.monthlyIncomeNet,
  })

  const defaultDistribution = getDefaultDistribution(data.payday2 !== null)

  const updateField = useCallback(
    <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const validateCurrentStep = useCallback(() => {
    const stepErrors = validateStep(currentStep, data)
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }, [currentStep, data])

  const nextStep = useCallback(() => {
    if (!validateCurrentStep()) return false
    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS))
    return true
  }, [validateCurrentStep])

  const prevStep = useCallback(() => {
    setErrors({})
    setCurrentStep((step) => Math.max(step - 1, 1))
  }, [])

  const goToStep = useCallback((step: number) => {
    setErrors({})
    setCurrentStep(step)
  }, [])

  // Termina a edição de um bloco aberto a partir da revisão: só volta se o bloco estiver válido.
  const finishStepEdit = useCallback(() => {
    if (!validateCurrentStep()) return false
    setCurrentStep(REVIEW_STEP)
    return true
  }, [validateCurrentStep])

  const isDirty = isEditing && initialData !== null && isOnboardingDirty(initialData, data)

  const save = useCallback(
    async (uidToSave: string, email: string) => {
      // Defesa contra documento antigo/incompleto: se algo não passa, leva ao bloco com erro
      // em vez de gravar dado inválido.
      const invalidStep = firstInvalidStep(data)
      if (invalidStep !== null) {
        setErrors(validateAll(data))
        setCurrentStep(invalidStep)
        return false
      }

      await setUserDocument(uidToSave, {
        name: data.name,
        email,
        goalAmount: data.goalAmount,
        goalYears: data.goalYears,
        riskProfile: data.riskProfile,
        currentPatrimony: data.currentPatrimony,
        monthlyIncomeNet: data.monthlyIncomeNet,
        essentialMonthlyCost: data.essentialMonthlyCost,
        emergencyReserveMin: emergencyReserve.minimumReserve,
        emergencyReserveSafe: emergencyReserve.safeReserve,
        payday1: data.payday1,
        payday2: data.payday2,
        darkMode: data.darkMode,
        onboardingCompletedAt: Timestamp.now(),
      })
      await ensureDistribution(uidToSave, data.payday2 !== null)
      return true
    },
    [data, emergencyReserve]
  )

  return {
    data,
    errors,
    currentStep,
    isEditing,
    isDirty,
    loadingInitial,
    patrimonyFromPortfolio,
    emergencyReserve,
    defaultDistribution,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    finishStepEdit,
    save,
  }
}
