// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockList = vi.hoisted(() => ({
  rows: [
    {
      id: 'k1',
      provider: 'custom:a1b2c3',
      encrypted_key: 'bm9wZQ==', // decrypt will throw → masked placeholder
      iv: 'AAAAAAAAAAAAAAAA',
      key_index: 0,
      status: 'active',
      base_url: 'https://api.example.com/v1',
      protocol: 'openai-compat',
      display_name: 'My Aggregator',
      last_verified_at: '2026-04-22T10:00:00Z',
      last_error: null,
      last_used_at: null,
      error_count: 0,
      created_at: '2026-04-21T00:00:00Z',
    },
  ],
}))

const mock = vi.hoisted(() => {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const existingSelect = vi.fn().mockResolvedValue({ data: [], error: null })
  const authUser = { id: 'user-1' }
  return { upsert, existingSelect, authUser }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (_table: string) => ({
      upsert: mock.upsert,
      select: () => ({
        eq: (col: string, _val: unknown) => {
          if (col === 'user_id') {
            return {
              // POST path: existing key count lookup
              eq: () => ({
                order: () => ({
                  limit: () => mock.existingSelect(),
                }),
              }),
              // GET path: list all keys sorted by provider, key_index
              order: () => ({
                order: () =>
                  Promise.resolve({ data: mockList.rows, error: null }),
              }),
            }
          }
          return {}
        },
      }),
    }),
  }),
  getAuthUser: async () => mock.authUser,
}))

import { POST } from '@/app/api/settings/api-keys/route'

describe('POST /api/settings/api-keys', () => {
  beforeEach(() => {
    mock.upsert.mockClear()
    mock.existingSelect.mockClear().mockResolvedValue({ data: [], error: null })
  })

  it('接受自定义 custom:<uuid> provider 与 base_url/protocol/display_name', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'custom:a1b2c3',
        key: 'sk-abc-12345',
        base_url: 'https://api.example.com/v1',
        protocol: 'openai-compat',
        display_name: 'My Aggregator',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mock.upsert).toHaveBeenCalledTimes(1)
    const row = mock.upsert.mock.calls[0][0]
    expect(row.provider).toBe('custom:a1b2c3')
    expect(row.base_url).toBe('https://api.example.com/v1')
    expect(row.protocol).toBe('openai-compat')
    expect(row.display_name).toBe('My Aggregator')
  })

  it('内置 provider 不带 base_url 时 protocol 默认 native', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ provider: 'kie', key: 'sk-kie-test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const row = mock.upsert.mock.calls[0][0]
    expect(row.protocol).toBe('native')
    expect(row.base_url).toBeUndefined()
  })

  it('custom 前缀必须带 base_url,否则 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ provider: 'custom:x', key: 'sk-1234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('bare custom: 前缀无后缀被拒', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'custom:',
        key: 'sk-12345678',
        base_url: 'https://api.example.com/v1',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('base_url 非 http/https scheme 被拒', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'custom:a1',
        key: 'sk-12345678',
        base_url: 'javascript:alert(1)',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('显式 protocol 优先于自动推导,不被 base_url 覆写', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'custom:b2',
        key: 'sk-12345678',
        base_url: 'https://api.example.com/v1',
        protocol: 'native',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const row = mock.upsert.mock.calls[0][0]
    expect(row.protocol).toBe('native')
  })

  it('GET 返回 base_url / protocol / display_name / last_verified_at', async () => {
    const { GET } = await import('@/app/api/settings/api-keys/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      id: 'k1',
      provider: 'custom:a1b2c3',
      base_url: 'https://api.example.com/v1',
      protocol: 'openai-compat',
      display_name: 'My Aggregator',
      last_verified_at: '2026-04-22T10:00:00Z',
    })
  })
})
