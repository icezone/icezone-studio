// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  capabilityRows: [
    { key_id: 'k1', logical_model_id: 'gpt-4o', source: 'probed' },
    { key_id: 'k1', logical_model_id: 'nano-banana-2', source: 'probed' },
    { key_id: 'k2', logical_model_id: 'veo-3', source: 'catalog' },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'user_key_capabilities') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mock.capabilityRows, error: null }),
          }),
        }
      }
      if (table === 'user_api_keys') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'k1' }, { id: 'k2' }], error: null }),
          }),
        }
      }
      return {}
    },
  }),
  getAuthUser: async () => mock.authUser,
}))

describe('GET /api/settings/capabilities', () => {
  it('未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/capabilities/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('返回 { byKey, all } 两视图', async () => {
    mock.authUser = { id: 'u1' }
    const { GET } = await import('@/app/api/settings/capabilities/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.byKey).toEqual({
      k1: ['gpt-4o', 'nano-banana-2'],
      k2: ['veo-3'],
    })
    expect(body.all.sort()).toEqual(['gpt-4o', 'nano-banana-2', 'veo-3'])
  })
})
