// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock state — must be created inside vi.hoisted to be available for vi.mock factories
// ---------------------------------------------------------------------------
const mock = vi.hoisted(() => {
  let authUser: { id: string } | null = { id: 'user-1' }
  let jobId = 'job-uuid-001'
  let creditBalance = 500
  let jobCreateError: string | null = null
  let providerTaskId = 'provider-task-001'
  let providerSubmitError: string | null = null

  // Minimal chainable supabase mock
  const chainable: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'upsert']
  for (const m of methods) {
    chainable[m] = (..._args: unknown[]) => chainable
  }
  chainable.single = () =>
    Promise.resolve({
      data: { id: jobId, balance: creditBalance },
      error: null,
    })
  chainable.maybeSingle = () =>
    Promise.resolve({
      data: { balance: creditBalance },
      error: null,
    })
  chainable.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve({ data: { id: jobId }, error: null }).then(resolve, reject)

  const from = () => chainable

  return {
    client: { from, auth: { getUser: () => Promise.resolve(authUser ? { data: { user: authUser }, error: null } : { data: { user: null }, error: { message: 'unauthenticated' } }) } },
    setAuth(userId: string | null) { authUser = userId ? { id: userId } : null },
    setJobId(id: string) { jobId = id },
    setCreditBalance(balance: number) { creditBalance = balance },
    setJobCreateError(err: string | null) { jobCreateError = err },
    setProviderTaskId(id: string) { providerTaskId = id },
    setProviderSubmitError(err: string | null) { providerSubmitError = err },
    getJobCreateError: () => jobCreateError,
    getProviderTaskId: () => providerTaskId,
    getProviderSubmitError: () => providerSubmitError,
    getCreditBalance: () => creditBalance,
  }
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mock.client),
  getAuthUser: async (supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } }> } }) => {
    const { data } = await supabase.auth.getUser()
    return data.user
  },
}))

vi.mock('@/server/jobs/jobService', () => ({
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(required: number, available: number) {
      super(`Insufficient credits: required ${required}, available ${available}`)
      this.name = 'InsufficientCreditsError'
    }
  },
  createJob: vi.fn(async () => {
    const err = mock.getJobCreateError()
    if (err === 'insufficient') {
      const { InsufficientCreditsError } = await import('@/server/jobs/jobService')
      throw new InsufficientCreditsError(100, 0)
    }
    if (err) throw new Error(err)
    return 'job-uuid-001'
  }),
  updateJobStatus: vi.fn(async () => {}),
}))

// Mock the video provider registry
const mockProvider = {
  id: 'kling',
  name: 'Kling',
  submitJob: vi.fn(async () => {
    const err = mock.getProviderSubmitError()
    if (err) throw new Error(err)
    return mock.getProviderTaskId()
  }),
  pollJob: vi.fn(),
}

vi.mock('@/server/video/registry', () => ({
  getVideoProvider: vi.fn((id: string) => {
    if (id === 'kling') return mockProvider
    return undefined
  }),
}))

// Prevent index.ts from importing real providers
vi.mock('@/server/video/index', () => ({}))

// ---------------------------------------------------------------------------
// Import route under test
// ---------------------------------------------------------------------------
import { POST } from '../../src/app/api/ai/video/generate/route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/ai/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/ai/video/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.setAuth('user-1')
    mock.setJobCreateError(null)
    mock.setProviderSubmitError(null)
    mock.setProviderTaskId('provider-task-001')
    mock.setCreditBalance(500)
  })

  it('returns 401 for unauthenticated request', async () => {
    mock.setAuth(null)

    const res = await POST(makeRequest({
      modelId: 'kling/kling-3.0',
      prompt: 'test',
      duration: 5,
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/unauthorized/i)
  })

  it('returns 400 for missing modelId', async () => {
    const res = await POST(makeRequest({
      prompt: 'test',
      duration: 5,
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/modelId/i)
  })

  it('returns 400 for missing prompt', async () => {
    const res = await POST(makeRequest({
      modelId: 'kling/kling-3.0',
      duration: 5,
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/prompt/i)
  })

  it('returns 400 for missing duration', async () => {
    const res = await POST(makeRequest({
      modelId: 'kling/kling-3.0',
      prompt: 'test',
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/duration/i)
  })

  it('returns 400 when provider is not found', async () => {
    const res = await POST(makeRequest({
      modelId: 'unknown/model',
      prompt: 'test',
      duration: 5,
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/No video provider/i)
  })

  it('returns 202 with jobId on success', async () => {
    const res = await POST(makeRequest({
      modelId: 'kling/kling-3.0',
      prompt: 'A sunset over the ocean',
      duration: 5,
      aspectRatio: '16:9',
      projectId: 'project-123',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.jobId).toBe('job-uuid-001')
    expect(mockProvider.submitJob).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'kling/kling-3.0',
        prompt: 'A sunset over the ocean',
        duration: 5,
        aspectRatio: '16:9',
      })
    )
  })

  it('returns 502 when provider submission fails', async () => {
    mock.setProviderSubmitError('Provider rate limit exceeded')

    const res = await POST(makeRequest({
      modelId: 'kling/kling-3.0',
      prompt: 'test',
      duration: 5,
      aspectRatio: '16:9',
    }) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toContain('Provider rate limit exceeded')
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(
      new Request('http://localhost/api/ai/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }) as unknown as import('next/server').NextRequest
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/JSON/i)
  })
})
