// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => {
  let resolvedResult: { data: unknown; error: unknown } = { data: null, error: null }
  let authUser: { id: string } | null = { id: 'user-1' }

  const chainable: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit',
    'or', 'is', 'contains', 'overlaps', 'ilike',
  ]
  for (const m of methods) {
    chainable[m] = (..._args: unknown[]) => chainable
  }
  chainable.single = () => Promise.resolve(resolvedResult)
  chainable.maybeSingle = () => Promise.resolve(resolvedResult)
  chainable.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(resolvedResult).then(resolve, reject)

  const from = () => chainable

  return {
    client: { from, auth: {
      getUser: () => Promise.resolve(
        authUser
          ? { data: { user: authUser }, error: null }
          : { data: { user: null }, error: { message: 'not authenticated' } }
      ),
    }},
    chainable,
    setResult(data: unknown, error?: unknown) {
      resolvedResult = { data, error: error ?? null }
    },
    setAuth(userId: string | null) {
      authUser = userId ? { id: userId } : null
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

import { PATCH } from '../../src/app/api/templates/[id]/publish/route'

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeRequest(body?: unknown, method = 'PATCH') {
  return new Request('http://localhost/api/templates/' + UUID + '/publish', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  mock.setAuth('user-1')
  mock.setResult(null)
})

describe('Template Sharing', () => {
  describe('PATCH /api/templates/[id]/publish', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await PATCH(makeRequest({}), makeParams(UUID))
      expect(res.status).toBe(401)
    })

    it('should publish a template', async () => {
      mock.setResult({ id: UUID, is_public: true, category: 'shared' })
      const res = await PATCH(
        makeRequest({ action: 'publish' }),
        makeParams(UUID)
      )
      expect(res.status).toBe(200)
    })

    it('should unpublish a template', async () => {
      mock.setResult({ id: UUID, is_public: false, category: 'custom' })
      const res = await PATCH(
        makeRequest({ action: 'unpublish' }),
        makeParams(UUID)
      )
      expect(res.status).toBe(200)
    })
  })
})
