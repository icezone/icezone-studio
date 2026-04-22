// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => mock.existingSelect(),
            }),
          }),
        }),
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
})
