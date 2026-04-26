'use client'
import { useState, useEffect } from 'react'

interface Preference {
  id: string
  level: string
  target: string
  preferred_key_id: string | null
  fallback_enabled: boolean
}

interface ApiKey {
  id: string
  provider: string
  display_name: string | null
}

const SCENARIOS = ['image', 'video', 'text', 'analysis'] as const

export function ScenarioDefaults() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/api-keys').then(r => r.json()).then(setKeys)
    fetch('/api/settings/routing-preferences').then(r => r.json()).then((data: Preference[]) => {
      const map: Record<string, string> = {}
      for (const p of data) if (p.level === 'scenario') map[p.target] = p.preferred_key_id ?? ''
      setPrefs(map)
    })
  }, [])

  async function save(scenario: string, keyId: string) {
    setSaving(scenario)
    await fetch('/api/settings/routing-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'scenario', target: scenario, preferred_key_id: keyId || null }),
    })
    setPrefs(p => ({ ...p, [scenario]: keyId }))
    setSaving(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-gray-700">场景默认 Key</h3>
      {SCENARIOS.map(sc => (
        <div key={sc} className="flex items-center gap-2">
          <span className="w-20 text-sm capitalize text-gray-600">{sc}</span>
          <select
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={prefs[sc] ?? ''}
            onChange={e => { void save(sc, e.target.value) }}
            disabled={saving === sc}
          >
            <option value="">自动选优</option>
            {keys.map(k => (
              <option key={k.id} value={k.id}>
                {k.display_name ?? k.provider}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
