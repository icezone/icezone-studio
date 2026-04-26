// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  upsertError: null as { message: string } | null,
  upsertFn: vi.fn(),
  prefRows: [
    { id: 'p1', level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1', fallback_enabled: true },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (_t: string) => ({
      upsert: (...args: unknown[]) => {
        mock.upsertFn(...args)
        return Promise.resolve({ error: mock.upsertError })
      },
      select: () => ({ eq: () => Promise.resolve({ data: mock.prefRows, error: null }) }),
    }),
  }),
  getAuthUser: async (supabase: any) => mock.authUser,
}))

describe('routing-preferences API', () => {
  beforeEach(() => {
    mock.authUser = { id: 'u1' }
    mock.upsertError = null
    mock.upsertFn.mockClear()
  })

  it('GET 未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/routing-preferences/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET 返回偏好列表', async () => {
    const { GET } = await import('@/app/api/settings/routing-preferences/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body[0].level).toBe('model')
  })

  it('POST 未登录返回 401', async () => {
    mock.authUser = null
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(401)
  })

  it('POST 缺少 level/target 返回 400', async () => {
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ level: 'model' }) }))
    expect(res.status).toBe(400)
  })

  it('POST 合法 body upsert 返回 200', async () => {
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1', fallback_enabled: true }),
    }))
    expect(res.status).toBe(200)
    expect(mock.upsertFn).toHaveBeenCalledOnce()
    expect(mock.upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', level: 'model', target: 'nano-banana-2' }),
      { onConflict: 'user_id,level,target' }
    )
  })
})
