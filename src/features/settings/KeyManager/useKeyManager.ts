import { useCallback, useEffect, useState } from 'react'

export interface KeyRowData {
  id: string
  provider: string
  maskedValue: string
  key_index: number
  status: string
  base_url: string | null
  protocol: string
  display_name: string | null
  last_verified_at: string | null
  last_error: string | null
  capabilities: string[]
  aliasIds: string[]
}

interface ApiKeyResponse {
  id: string
  provider: string
  maskedValue: string
  key_index: number
  status: string
  base_url: string | null
  protocol: string
  display_name: string | null
  last_verified_at: string | null
  last_error: string | null
  last_used_at: string | null
  error_count: number
  created_at: string
}

interface CapabilitiesResponse {
  byKey: Record<string, string[]>
  all: string[]
}

export interface AddKeyInput {
  provider: string
  key: string
  base_url?: string
  protocol?: 'native' | 'openai-compat'
  display_name?: string
}

// 统一解析错误响应：body 非 JSON（如 502 HTML）时回退到默认消息，避免抛出 SyntaxError
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return body?.error ?? fallback
  } catch {
    return fallback
  }
}

export function useKeyManager() {
  const [keys, setKeys] = useState<KeyRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 并发拉取 keys 列表与 capabilities 映射，合并后存入 state
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [keysRes, capRes] = await Promise.all([
        fetch('/api/settings/api-keys'),
        fetch('/api/settings/capabilities'),
      ])
      if (!keysRes.ok) throw new Error(`api-keys ${keysRes.status}`)
      if (!capRes.ok) throw new Error(`capabilities ${capRes.status}`)
      const keyRows = (await keysRes.json()) as ApiKeyResponse[]
      const cap = (await capRes.json()) as CapabilitiesResponse

      const customKeys = keyRows.filter((r) => r.provider.startsWith('custom:'))
      const aliasResults = await Promise.all(
        customKeys.map((r) =>
          fetch(`/api/settings/api-keys/${r.id}/capabilities`)
            .then((res) => (res.ok ? res.json() : { capabilities: [] }))
            .then((data: { capabilities: { logicalModelId: string; source: string }[] }) => ({
              keyId: r.id,
              aliasIds: data.capabilities
                .filter((c) => c.source === 'alias')
                .map((c) => c.logicalModelId),
            }))
            .catch(() => ({ keyId: r.id, aliasIds: [] as string[] })),
        ),
      )
      const aliasMap = Object.fromEntries(aliasResults.map(({ keyId, aliasIds }) => [keyId, aliasIds]))

      setKeys(
        keyRows.map((r) => ({
          id: r.id,
          provider: r.provider,
          maskedValue: r.maskedValue,
          key_index: r.key_index,
          status: r.status,
          base_url: r.base_url,
          protocol: r.protocol,
          display_name: r.display_name,
          last_verified_at: r.last_verified_at,
          last_error: r.last_error,
          capabilities: cap.byKey[r.id] ?? [],
          aliasIds: aliasMap[r.id] ?? [],
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // 挂载时自动加载
  useEffect(() => {
    void reload()
  }, [reload])

  // 新增 key，成功后重新拉取列表
  const addKey = useCallback(
    async (input: AddKeyInput) => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readError(res, 'add failed'))
      await reload()
    },
    [reload]
  )

  // 删除 key，成功后重新拉取列表
  const deleteKey = useCallback(
    async (provider: string, keyIndex: number) => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, key_index: keyIndex }),
      })
      if (!res.ok) throw new Error(await readError(res, 'delete failed'))
      await reload()
    },
    [reload]
  )

  // 触发 probe 检测，完成后重新拉取列表以更新 capabilities
  const probe = useCallback(
    async (keyId: string) => {
      const res = await fetch(`/api/settings/api-keys/${keyId}/probe`, { method: 'POST' })
      if (!res.ok) throw new Error(await readError(res, 'probe failed'))
      await reload()
    },
    [reload]
  )

  const addAlias = useCallback(
    async (keyId: string, logicalModelId: string) => {
      const res = await fetch(`/api/settings/api-keys/${keyId}/capabilities`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ logicalModelId }),
      })
      if (!res.ok) throw new Error(await readError(res, 'add alias failed'))
      await reload()
    },
    [reload],
  )

  const removeAlias = useCallback(
    async (keyId: string, logicalModelId: string) => {
      const res = await fetch(`/api/settings/api-keys/${keyId}/capabilities`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ logicalModelId }),
      })
      if (!res.ok) throw new Error(await readError(res, 'remove alias failed'))
      await reload()
    },
    [reload],
  )

  return { keys, loading, error, reload, addKey, deleteKey, probe, addAlias, removeAlias }
}
