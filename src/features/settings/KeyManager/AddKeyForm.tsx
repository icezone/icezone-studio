'use client'

import { useState } from 'react'
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
        if (!baseUrl) throw new Error('自定义端点需要 Base URL')
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border p-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === 'builtin'} onChange={() => setMode('builtin')} />
          内置 Provider
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          自定义 OpenAI-compat 端点
        </label>
      </div>

      {mode === 'builtin' ? (
        <label className="flex flex-col gap-1 text-sm">
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border px-2 py-1">
            {BUILT_IN.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Base URL
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            显示名(可选)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Aggregator"
              className="rounded border px-2 py-1"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        API Key
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="rounded border px-2 py-1 font-mono"
          required
          minLength={8}
        />
      </label>

      {error && <div className="text-xs text-red-500">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {submitting ? '添加中...' : '添加'}
      </button>
    </form>
  )
}
