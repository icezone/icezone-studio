'use client'

import { useEffect, useState } from 'react'

interface CapabilitiesResponse {
  byKey: Record<string, string[]>
  all: string[]
}

export interface UnlockedModelsState {
  unlockedIds: Set<string>
  loading: boolean
  /** 用户是否有至少一个已解锁模型 */
  hasKeys: boolean
  error: Error | null
}

export function useUnlockedModels(): UnlockedModelsState {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/capabilities')
      .then((r) => {
        if (!r.ok) throw new Error(`capabilities ${r.status}`)
        return r.json() as Promise<CapabilitiesResponse>
      })
      .then((data) => {
        if (!cancelled) {
          setUnlockedIds(new Set(data.all))
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { unlockedIds, loading, hasKeys: unlockedIds.size > 0, error }
}
