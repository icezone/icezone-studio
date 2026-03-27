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

import { PUT } from '../../src/app/api/projects/[id]/draft/route'

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeDraftRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/projects/${id}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('草稿冲突检测 (INV-5)', () => {
  beforeEach(() => { mock.setAuth('user-1'); mock.reset() })

  it('revision 不匹配应返回 409', async () => {
    mock.setSingleSequence([
      { data: { revision: 7 }, error: null },
    ])
    const res = await PUT(
      makeDraftRequest(UUID, { data: {}, expectedRevision: 5 }),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('conflict')
    expect(json.serverRevision).toBe(7)
  })

  it('revision 匹配应返回 200', async () => {
    mock.setSingleSequence([
      { data: { revision: 5 }, error: null },
      { data: { revision: 6 }, error: null },
    ])
    const res = await PUT(
      makeDraftRequest(UUID, { data: { nodes: [] }, expectedRevision: 5 }),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.revision).toBe(6)
  })
})
