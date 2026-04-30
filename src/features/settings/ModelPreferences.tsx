'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PROVIDER_CATALOG } from '@/config/provider-catalog'
import { UiSelect } from '@/components/ui/primitives'

interface ApiKey { id: string; provider: string; display_name: string | null }
interface Preference { level: string; target: string; preferred_key_id: string | null }

const ALL_MODELS = Array.from(
  new Set(Object.values(PROVIDER_CATALOG).flatMap(e => [...(e.logicalModels ?? [])]))
).sort()

export function ModelPreferences() {
  const { t } = useTranslation()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

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
        for (const p of data as Preference[]) if (p.level === 'model') map[p.target] = p.preferred_key_id ?? ''
        setPrefs(map)
      })
      .catch(() => {})
  }, [])

  async function save(model: string, keyId: string) {
    setSaving(model)
    try {
      await fetch('/api/settings/routing-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'model', target: model, preferred_key_id: keyId || null }),
      })
      setPrefs(p => ({ ...p, [model]: keyId }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex items-center gap-1 text-sm font-medium text-[var(--ui-fg)]"
        onClick={() => setExpanded(e => !e)}
      >
        <span>{expanded ? '▾' : '▸'}</span> {t('settings.modelPrefsAdvanced')}
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 pl-4">
          {ALL_MODELS.map(model => (
            <div key={model} className="flex items-center gap-2">
              <span className="w-36 truncate text-xs text-[var(--ui-fg-muted)]" title={model}>{model}</span>
              <UiSelect
                value={prefs[model] ?? ''}
                onChange={e => { void save(model, e.target.value) }}
                disabled={saving === model}
                className="flex-1 text-xs"
              >
                <option value="">{t('settings.autoSelect')}</option>
                {keys.map(k => (
                  <option key={k.id} value={k.id}>{k.display_name ?? k.provider}</option>
                ))}
              </UiSelect>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
