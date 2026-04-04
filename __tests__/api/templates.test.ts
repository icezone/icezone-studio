// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase ───────────────────────────────────────────────────
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

  // For RPC calls
  const rpc = (..._args: unknown[]) => Promise.resolve(resolvedResult)

  const from = () => chainable

  return {
    client: { from, rpc, auth: {
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

// ─── Imports ─────────────────────────────────────────────────────────
import { GET, POST } from '../../src/app/api/templates/route'
import { GET as GET_ONE, DELETE } from '../../src/app/api/templates/[id]/route'
import { POST as USE } from '../../src/app/api/templates/[id]/use/route'

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeRequest(body?: unknown, method = 'GET', url = 'http://localhost/api/templates') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const validTemplateData = {
  version: 1,
  nodes: [{ id: 'n1', type: 'imageNode', position: { x: 0, y: 0 }, data: {} }],
  edges: [],
  metadata: { name: 'Test', description: '', requiredNodeTypes: ['imageNode'] },
}

beforeEach(() => {
  mock.setAuth('user-1')
  mock.setResult(null)
})

// ─── Tests ───────────────────────────────────────────────────────────

describe('Templates API', () => {
  describe('GET /api/templates', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await GET(makeRequest())
      expect(res.status).toBe(401)
    })

    it('should return templates list', async () => {
      const templates = [
        { id: UUID, name: 'Template 1', category: 'custom' },
      ]
      mock.setResult(templates)
      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.templates).toBeDefined()
    })
  })

  describe('POST /api/templates', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await POST(makeRequest({ name: 'T', templateData: validTemplateData }, 'POST'))
      expect(res.status).toBe(401)
    })

    it('should return 400 for missing name', async () => {
      const res = await POST(makeRequest({ templateData: validTemplateData }, 'POST'))
      expect(res.status).toBe(400)
    })

    it('should return 400 for missing templateData', async () => {
      const res = await POST(makeRequest({ name: 'Test' }, 'POST'))
      expect(res.status).toBe(400)
    })

    it('should create new template', async () => {
      mock.setResult({
        id: UUID,
        name: 'My Template',
        category: 'custom',
        created_at: new Date().toISOString(),
      })
      const res = await POST(makeRequest({
        name: 'My Template',
        description: 'A template',
        tags: ['test'],
        templateData: validTemplateData,
      }, 'POST'))
      expect(res.status).toBe(201)
    })
  })

  describe('GET /api/templates/[id]', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await GET_ONE(makeRequest(), makeParams(UUID))
      expect(res.status).toBe(401)
    })

    it('should return template detail', async () => {
      mock.setResult({ id: UUID, name: 'Template', template_data: validTemplateData })
      const res = await GET_ONE(makeRequest(), makeParams(UUID))
      expect(res.status).toBe(200)
    })
  })

  describe('DELETE /api/templates/[id]', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams(UUID))
      expect(res.status).toBe(401)
    })

    it('should delete own template', async () => {
      mock.setResult({ id: UUID })
      const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams(UUID))
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/templates/[id]/use', () => {
    it('should return 401 for unauthenticated', async () => {
      mock.setAuth(null)
      const res = await USE(makeRequest(undefined, 'POST'), makeParams(UUID))
      expect(res.status).toBe(401)
    })

    it('should increment use_count', async () => {
      mock.setResult({ id: UUID, use_count: 1 })
      const res = await USE(makeRequest(undefined, 'POST'), makeParams(UUID))
      expect(res.status).toBe(200)
    })
  })
})
