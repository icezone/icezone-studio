import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- hoisted mocks ---
const {
  mockMaybeSingle, mockSelect, mockEq, mockUpsert, mockDelete,
  mockFrom, mockSupabase,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockUpsert = vi.fn()
  const mockDelete = vi.fn()

  const chain: Record<string, unknown> = {
    select: mockSelect,
    eq: mockEq,
    upsert: mockUpsert,
    delete: mockDelete,
    maybeSingle: mockMaybeSingle,
  }
  mockSelect.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockUpsert.mockReturnValue(chain)
  mockDelete.mockReturnValue(chain)

  const mockFrom = vi.fn(() => chain)
  const mockSupabase = { from: mockFrom }

  return { mockMaybeSingle, mockSelect, mockEq, mockUpsert, mockDelete, mockFrom, mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  getAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

import { GET, POST, DELETE } from './route'

const KEY_ID = 'key-uuid-1'

function makeCtx() {
  return { params: Promise.resolve({ id: KEY_ID }) }
}

function makeReq(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/settings/api-keys/${KEY_ID}/capabilities`, {
    method,
    ...(body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  const chain: Record<string, unknown> = {
    select: mockSelect,
    eq: mockEq,
    upsert: mockUpsert,
    delete: mockDelete,
    maybeSingle: mockMaybeSingle,
  }
  mockFrom.mockReturnValue(chain)
  mockSelect.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockUpsert.mockReturnValue(chain)
  mockDelete.mockReturnValue(chain)
})

describe('GET /api/settings/api-keys/[id]/capabilities', () => {
  it('未认证时返回 401', async () => {
    const { getAuthUser } = await import('@/lib/supabase/server')
    vi.mocked(getAuthUser).mockResolvedValueOnce(null)
    const res = await GET(makeReq('GET'), makeCtx())
    expect(res.status).toBe(401)
  })

  it('key 不属于用户时返回 404', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await GET(makeReq('GET'), makeCtx())
    expect(res.status).toBe(404)
  })

  it('返回该 key 的 capabilities 列表', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    // verifyOwner calls .eq('id') then .eq('user_id') — both must return the chain
    // so that .maybeSingle() is reachable; the data-query's .eq() resolves with data.
    const chain = { select: mockSelect, eq: mockEq, upsert: mockUpsert, delete: mockDelete, maybeSingle: mockMaybeSingle }
    mockEq.mockReturnValueOnce(chain)
    mockEq.mockReturnValueOnce(chain)
    mockEq.mockResolvedValueOnce({
      data: [
        { logical_model_id: 'nano-banana-2', source: 'probe' },
        { logical_model_id: 'grok-image', source: 'alias' },
      ],
      error: null,
    })
    const res = await GET(makeReq('GET'), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.capabilities).toHaveLength(2)
    expect(body.capabilities[1].source).toBe('alias')
  })
})

describe('POST /api/settings/api-keys/[id]/capabilities', () => {
  it('缺少 logicalModelId 时返回 400', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    const res = await POST(makeReq('POST', {}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('成功插入 alias 后返回 ok', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    mockUpsert.mockResolvedValueOnce({ error: null })
    const res = await POST(makeReq('POST', { logicalModelId: 'nano-banana-2' }), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})

describe('DELETE /api/settings/api-keys/[id]/capabilities', () => {
  it('缺少 logicalModelId 时返回 400', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    const res = await DELETE(makeReq('DELETE', {}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('成功删除 alias 后返回 ok', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    // All eq calls use default mockReturnValue(chain) from beforeEach;
    // the awaited delete chain has no error property → undefined → no error path.
    const res = await DELETE(makeReq('DELETE', { logicalModelId: 'nano-banana-2' }), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})
