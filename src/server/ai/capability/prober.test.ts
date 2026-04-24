// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeKey } from './prober'

const supaMock = vi.hoisted(() => {
  return {
    keyRow: {
      id: 'k1',
      user_id: 'u1',
      provider: 'custom:abc',
      protocol: 'openai-compat',
      base_url: 'https://api.example.com/v1',
      encrypted_key: '',
      iv: '',
    },
    capabilitiesDelete: vi.fn().mockResolvedValue({ error: null }),
    capabilitiesInsert: vi.fn().mockResolvedValue({ error: null }),
    keyUpdate: vi.fn().mockResolvedValue({ error: null }),
    decryptResult: 'sk-live-test',
  }
})

vi.mock('@/server/ai/keyFetcher', () => ({
  decryptKeyForTesting: () => supaMock.decryptResult,
}))

vi.mock('@/server/ai/providers/openaiCompat', () => ({
  listOpenAICompatModels: vi.fn(async () => ['gpt-4o', 'claude-3-5-sonnet']),
}))

vi.mock('@/config/provider-catalog', () => ({
  getProviderCapabilities: vi.fn((provider: string) =>
    provider === 'kie' ? ['nano-banana-2', 'veo-3'] : []
  ),
}))

function makeSupabase(keyRow: typeof supaMock.keyRow | null, opts: { listError?: string } = {}) {
  return {
    from: (table: string) => {
      if (table === 'user_api_keys') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  opts.listError
                    ? Promise.resolve({ data: null, error: { message: opts.listError } })
                    : Promise.resolve({ data: keyRow, error: null }),
              }),
            }),
          }),
          update: (patch: unknown) => {
            supaMock.keyUpdate(patch)
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }
          },
        }
      }
      if (table === 'user_key_capabilities') {
        return {
          delete: () => ({
            eq: () => {
              supaMock.capabilitiesDelete()
              return Promise.resolve({ error: null })
            },
          }),
          insert: (rows: unknown) => {
            supaMock.capabilitiesInsert(rows)
            return Promise.resolve({ error: null })
          },
        }
      }
      return {}
    },
  }
}

describe('probeKey', () => {
  beforeEach(() => {
    supaMock.capabilitiesDelete.mockClear()
    supaMock.capabilitiesInsert.mockClear()
    supaMock.keyUpdate.mockClear()
  })

  it('custom:<uuid> 通过 listOpenAICompatModels 写入 probed capabilities', async () => {
    const result = await probeKey(makeSupabase(supaMock.keyRow) as never, 'u1', 'k1')
    expect(result.status).toBe('active')
    expect(result.capabilities).toEqual([
      { logical_model_id: 'gpt-4o', source: 'probed' },
      { logical_model_id: 'claude-3-5-sonnet', source: 'probed' },
    ])
    expect(supaMock.capabilitiesInsert).toHaveBeenCalledWith([
      { key_id: 'k1', logical_model_id: 'gpt-4o', source: 'probed' },
      { key_id: 'k1', logical_model_id: 'claude-3-5-sonnet', source: 'probed' },
    ])
    expect(supaMock.keyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', last_error: null })
    )
  })

  it('built-in provider 从 catalog 填入 capabilities', async () => {
    const row = { ...supaMock.keyRow, provider: 'kie', protocol: 'native', base_url: null }
    const result = await probeKey(makeSupabase(row) as never, 'u1', 'k1')
    expect(result.status).toBe('active')
    expect(result.capabilities).toEqual([
      { logical_model_id: 'nano-banana-2', source: 'catalog' },
      { logical_model_id: 'veo-3', source: 'catalog' },
    ])
  })

  it('listOpenAICompatModels 抛错时 status=invalid,记录 last_error', async () => {
    const { listOpenAICompatModels } = await import('@/server/ai/providers/openaiCompat')
    ;(listOpenAICompatModels as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'))
    const result = await probeKey(makeSupabase(supaMock.keyRow) as never, 'u1', 'k1')
    expect(result.status).toBe('invalid')
    expect(result.error).toContain('401')
    // 失败路径:能力数组必须为空,不残留任何条目
    expect(result.capabilities).toEqual([])
    expect(supaMock.keyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'invalid' })
    )
  })

  it('key 不存在返回 status=invalid 不抛错', async () => {
    const result = await probeKey(makeSupabase(null) as never, 'u1', 'missing')
    expect(result.status).toBe('invalid')
    expect(result.error).toMatch(/not found/i)
    // key 不存在时不应写任何表,capabilities 必须为空
    expect(result.capabilities).toEqual([])
    expect(supaMock.capabilitiesDelete).not.toHaveBeenCalled()
    expect(supaMock.keyUpdate).not.toHaveBeenCalled()
  })
})
