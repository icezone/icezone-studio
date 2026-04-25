// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  probeResult: {
    keyId: 'k1',
    status: 'active' as const,
    capabilities: [{ logical_model_id: 'gpt-4o', source: 'probed' as const }],
    probedAt: '2026-04-22T10:00:00Z',
  },
  probeKey: vi.fn(),
}))

vi.mock('@/server/ai/capability/prober', () => ({
  probeKey: mock.probeKey,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({}),
  getAuthUser: async () => mock.authUser,
}))

beforeEach(() => {
  mock.probeKey.mockReset().mockResolvedValue(mock.probeResult)
})

describe('POST /api/settings/api-keys/[id]/probe', () => {
  it('未登录返回 401', async () => {
    mock.authUser = null
    const { POST } = await import('@/app/api/settings/api-keys/[id]/probe/route')
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: 'k1' }) })
    expect(res.status).toBe(401)
  })

  it('登录后调用 probeKey 并返回结果', async () => {
    mock.authUser = { id: 'u1' }
    const { POST } = await import('@/app/api/settings/api-keys/[id]/probe/route')
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: 'k1' }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mock.probeResult)
    expect(mock.probeKey).toHaveBeenCalledWith(expect.anything(), 'u1', 'k1')
  })
})
