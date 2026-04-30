'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { UiSelect } from '@/components/ui/primitives'

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
  const { t } = useTranslation()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/api-keys')
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setKeys(data) })
      .catch(() => {})
    fetch('/api/settings/routing-preferences')
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (!Array.isArray(data)) return
        const map: Record<string, string> = {}
        for (const p of data as Preference[]) if (p.level === 'scenario') map[p.target] = p.preferred_key_id ?? ''
        setPrefs(map)
      })
      .catch(() => {})
  }, [])

  async function save(scenario: string, keyId: string) {
    setSaving(scenario)
    try {
      await fetch('/api/settings/routing-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'scenario', target: scenario, preferred_key_id: keyId || null }),
      })
      setPrefs(p => ({ ...p, [scenario]: keyId }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-[var(--ui-fg)]">{t('settings.scenarioDefaults')}</h3>
      {SCENARIOS.map(sc => (
        <div key={sc} className="flex items-center gap-2">
          <span className="w-20 text-sm capitalize text-[var(--ui-fg-muted)]">{sc}</span>
          <UiSelect
            value={prefs[sc] ?? ''}
            onChange={e => { void save(sc, e.target.value) }}
            disabled={saving === sc}
            className="flex-1 text-sm"
          >
            <option value="">{t('settings.autoSelect')}</option>
            {keys.map(k => (
              <option key={k.id} value={k.id}>
                {k.display_name ?? k.provider}
              </option>
            ))}
          </UiSelect>
        </div>
      ))}
    </div>
  )
}
