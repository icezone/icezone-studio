'use client'

import { useState, useCallback } from 'react'

export const ONBOARDING_STORAGE_KEY = 'smart-routing-onboarded'

export interface OnboardingState {
  show: boolean
  dismiss: () => void
}

export function useOnboardingState(keyCount: number): OnboardingState {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  })

  const show = !dismissed && keyCount === 0

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    }
    setDismissed(true)
  }, [])

  return { show, dismiss }
}
