'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddKeyInput } from './useKeyManager'

const BUILT_IN = [
  { value: 'kie', label: 'KIE' },
  { value: 'ppio', label: 'PPIO' },
  { value: 'grsai', label: 'GRSAI' },
  { value: 'fal', label: 'fal.ai' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

interface Props {
  onSubmit: (input: AddKeyInput) => Promise<void>
}

export function AddKeyForm({ onSubmit }: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'builtin' | 'custom'>('builtin')
  const [provider, setProvider] = useState('kie')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function customId(): string {
    return 'custom:' + crypto.randomUUID()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'builtin') {
        await onSubmit({ provider, key: apiKey })
      } else {
        if (!baseUrl) throw new Error(t('settings.addKey.customUrlRequired'))
        await onSubmit({
          provider: customId(),
          key: apiKey,
          base_url: baseUrl,
          protocol: 'openai-compat',
          display_name: displayName || undefined,
        })
      }
      setApiKey('')
      setBaseUrl('')
      setDisplayName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // ui-field provides: bg, border-color, border-radius, color, focus styles
  const fieldCls = 'ui-field border w-full px-2 py-1 text-sm'

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-[var(--ui-border-soft)] p-3"
    >
      <div className="flex gap-4 text-sm text-[var(--ui-fg)]">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={mode === 'builtin'} onChange={() => setMode('builtin')} />
          {t('settings.addKey.builtinProvider')}
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          {t('settings.addKey.customEndpoint')}
        </label>
      </div>

      {mode === 'builtin' ? (
        <label className="flex flex-col gap-1 text-sm text-[var(--ui-fg-muted)]">
          {t('settings.addKey.provider')}
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={`${fieldCls} [color-scheme:light_dark]`}
          >
            {BUILT_IN.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm text-[var(--ui-fg-muted)]">
            {t('settings.addKey.baseUrl')}
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className={fieldCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--ui-fg-muted)]">
            {t('settings.addKey.displayName')}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('settings.addKey.displayNamePlaceholder')}
              className={fieldCls}
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm text-[var(--ui-fg-muted)]">
        {t('settings.addKey.apiKey')}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className={`${fieldCls} font-mono`}
          required
          minLength={8}
        />
      </label>

      {error && <div className="text-xs text-red-500">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-[var(--ui-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--ui-primary-pressed)] disabled:opacity-50"
      >
        {submitting ? t('settings.addKey.adding') : t('settings.addKey.add')}
      </button>
    </form>
  )
}
