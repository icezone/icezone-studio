import { describe, it, expect, vi, beforeEach } from 'vitest'

// 在 vi.hoisted 中创建不引用外部变量的 mock 状态
const mock = vi.hoisted(() => {
  let resolvedResult: { data: unknown; error: unknown } = { data: null, error: null }
  let authUser: { id: string } | null = { id: 'user-1' }

  // 真正的 chainable 对象 — 所有方法返回自身
  const chainable: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'upsert']
  for (const m of methods) {
    chainable[m] = (..._args: unknown[]) => chainable
  }
  chainable.single = () => Promise.resolve(resolvedResult)
  chainable.maybeSingle = () => Promise.resolve(resolvedResult)
  // thenable
  chainable.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(resolvedResult).then(resolve, reject)

  const from = () => chainable

  return {
    client: {
      from,
      auth: {
        getUser: () => Promise.resolve(
          authUser
            ? { data: { user: authUser }, error: null }
            : { data: { user: null }, error: { message: 'not authenticated' } }
        ),
      },
    },
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

import { GET, POST } from '../../src/app/api/projects/route'
import { GET as GET_ONE, PATCH, DELETE } from '../../src/app/api/projects/[id]/route'

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeRequest(body?: unknown, method = 'GET') {
  return new Request('http://localhost/api/projects', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function makeParamsRequest(id: string, body?: unknown, method = 'GET') {
  return new Request(`http://localhost/api/projects/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('POST /api/projects', () => {
  beforeEach(() => { mock.setAuth('user-1') })

  it('应该创建项目并返回 201', async () => {
    mock.setResult({ id: 'p-1', name: 'My Project', created_at: '2026-01-01T00:00:00Z' })
    const res = await POST(makeRequest({ name: 'My Project' }, 'POST'))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('p-1')
    expect(json.name).toBe('My Project')
  })

  it('应该拒绝空名称', async () => {
    const res = await POST(makeRequest({ name: '' }, 'POST'))
    expect(res.status).toBe(400)
  })

  it('应该返回 401 未认证', async () => {
    mock.setAuth(null)
    const res = await POST(makeRequest({ name: 'Test' }, 'POST'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/projects', () => {
  beforeEach(() => { mock.setAuth('user-1') })

  it('应该返回项目列表', async () => {
    mock.setResult([{ id: 'p-1', name: 'Project 1', created_at: '2026-01-01', updated_at: '2026-01-01' }])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe('p-1')
  })
})

describe('GET /api/projects/[id]', () => {
  beforeEach(() => { mock.setAuth('user-1') })

  it('应该返回单个项目', async () => {
    mock.setResult({ id: UUID, name: 'Test', created_at: '2026-01-01', updated_at: '2026-01-01' })
    const res = await GET_ONE(
      makeParamsRequest(UUID),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(UUID)
  })

  it('应该对无效 UUID 返回 400', async () => {
    const res = await GET_ONE(
      makeParamsRequest('invalid'),
      { params: Promise.resolve({ id: 'invalid' }) }
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => { mock.setAuth('user-1') })

  it('应该重命名项目', async () => {
    mock.setResult({ id: UUID, name: 'New Name' })
    const res = await PATCH(
      makeParamsRequest(UUID, { name: 'New Name' }, 'PATCH'),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('New Name')
  })
})

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => { mock.setAuth('user-1') })

  it('应该删除项目并返回 204', async () => {
    mock.setResult(null)
    const res = await DELETE(
      makeParamsRequest(UUID, undefined, 'DELETE'),
      { params: Promise.resolve({ id: UUID }) }
    )
    expect(res.status).toBe(204)
  })
})
