// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  histRows: [
    { logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 500, cost_estimate_cents: 4, created_at: new Date().toISOString() },
    { logical_model_id: 'nano-banana-2', status: 'failed', latency_ms: 1200, cost_estimate_cents: 0, created_at: new Date().toISOString() },
    { logical_model_id: 'veo-3', status: 'success', latency_ms: 3000, cost_estimate_cents: 100, created_at: new Date().toISOString() },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mock.histRows, error: null })
            })
          })
        })
      }),
    }),
  }),
  getAuthUser: async () => mock.authUser,
}))

describe('GET /api/settings/call-history', () => {
  beforeEach(() => { mock.authUser = { id: 'u1' } })

  it('未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/call-history/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('返回 30 天汇总:total / success / avgLatency / totalCost', async () => {
    const { GET } = await import('@/app/api/settings/call-history/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.total).toBe(3)
    expect(body.successCount).toBe(2)
    expect(body.byModel).toBeDefined()
    expect(body.byModel['nano-banana-2'].total).toBe(2)
  })
})
