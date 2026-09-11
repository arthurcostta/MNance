import { useCallback, useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { calculateEmergencyReserve } from '../core/emergencyReserve'
import { getUserDocument, setUserDocument } from '../services/userService'
import { getDefaultDistribution, setDistribution } from '../services/distributionService'
import type { RiskProfile } from '../types/user'

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

// Função pura, testável isoladamente — cada step valida só os campos que expõe.
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

export function useOnboarding(uid: string | undefined) {
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLoadingInitial(false)
      return
    }
    let cancelled = false
    getUserDocument(uid).then((existing) => {
      if (cancelled) return
      if (existing) {
        setIsEditing(true)
        setData({
          name: existing.name,
          goalAmount: existing.goalAmount,
          goalYears: existing.goalYears,
          riskProfile: existing.riskProfile,
          currentPatrimony: existing.currentPatrimony,
          monthlyIncomeNet: existing.monthlyIncomeNet,
          essentialMonthlyCost: existing.essentialMonthlyCost,
          payday1: existing.payday1,
          payday2: existing.payday2,
          darkMode: existing.darkMode,
        })
      }
      setLoadingInitial(false)
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  const emergencyReserve = calculateEmergencyReserve({
    monthlyIncomeNet: data.monthlyIncomeNet,
  })

  const defaultDistribution = getDefaultDistribution(data.riskProfile)

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

  const save = useCallback(
    async (uidToSave: string, email: string) => {
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
      await setDistribution(uidToSave, getDefaultDistribution(data.riskProfile))
    },
    [data, emergencyReserve]
  )

  return {
    data,
    errors,
    currentStep,
    isEditing,
    loadingInitial,
    emergencyReserve,
    defaultDistribution,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    save,
  }
}
