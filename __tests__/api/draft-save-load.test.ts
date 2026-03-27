import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => {
  let singleResults: Array<{ data: unknown; error: unknown }> = []
  let singleIdx = 0
  let authUser: { id: string } | null = { id: 'user-1' }

  const chainable: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit']
  for (const m of methods) {
    chainable[m] = (..._args: unknown[]) => chainable
  }
  chainable.single = () => {
    const r = singleResults[singleIdx] ?? singleResults[singleResults.length - 1] ?? { data: null, error: null }
    singleIdx++
    return Promise.resolve(r)
  }
  chainable.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    const r = singleResults[0] ?? { data: null, error: null }
    return Promise.resolve(r).then(resolve, reject)
  }

  return {
    client: {
      from: () => chainable,
      auth: {
        getUser: () => Promise.resolve(
          authUser
            ? { data: { user: authUser }, error: null }
            : { data: { user: null }, error: { message: 'not authenticated' } }
        ),
      },
    },
    setSingleSequence(results: Array<{ data: unknown; error: unknown }>) {
      singleResults = results
      singleIdx = 0
    },
    setAuth(userId: string | null) {
      authUser = userId ? { id: userId } : null
    },
    reset() {
      singleResults = []
      singleIdx = 0
    },
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mock.client),
  getAuthUser: async (supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } }> } }) => {
    const { data } = await supabase.auth.getUser()
    return data.user
  },
}))

import { GET, PUT } from '../../src/app/api/projects/[id]/draft/route'

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeDraftRequest(id: string, body?: unknown, method = 'GET') {
  return new Request(`http://localhost/api/projects/${id}/draft`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('GET /api/projects/[id]/draft', () => {
  beforeEach(() => { mock.setAuth('user-1'); mock.reset() })

  it('应该返回草稿数据', async () => {
    mock.setSingleSequence([
      { data: { data: { nodes: [] }, revision: 3, updated_at: '2026-01-01T00:00:00Z' }, error: null },
    ])
    const res = await GET(
      makeDraftRequest(UUID),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.revision).toBe(3)
    expect(json.data).toEqual({ nodes: [] })
  })

  it('未认证应返回 401', async () => {
    mock.setAuth(null)
    const res = await GET(
      makeDraftRequest(UUID),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/projects/[id]/draft', () => {
  beforeEach(() => { mock.setAuth('user-1'); mock.reset() })

  it('应该保存草稿并返回新 revision', async () => {
    mock.setSingleSequence([
      { data: { revision: 5 }, error: null },   // check revision
      { data: { revision: 6 }, error: null },   // update
    ])
    const res = await PUT(
      makeDraftRequest(UUID, { data: { nodes: [1] }, expectedRevision: 5 }, 'PUT'),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.revision).toBe(6)
  })

  it('缺少 expectedRevision 应返回 400', async () => {
    const res = await PUT(
      makeDraftRequest(UUID, { data: { nodes: [] } }, 'PUT'),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(400)
  })
})
