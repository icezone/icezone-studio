import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────────────────
const mock = vi.hoisted(() => {
  const mockGenerate = vi.fn()
  const mockSubmitJob = vi.fn()
  const mockCreateJob = vi.fn().mockResolvedValue('job-uuid-001')
  const mockUpdateJobStatus = vi.fn().mockResolvedValue(undefined)
  let authUser: { id: string } | null = { id: 'user-1' }

  return {
    mockGenerate,
    mockSubmitJob,
    mockCreateJob,
    mockUpdateJobStatus,
    getAuthUser: () => authUser,
    setAuth: (user: { id: string } | null) => { authUser = user },
  }
})

vi.mock('@/server/ai/registry', () => ({
  getProvider: vi.fn((id: string) => {
    if (id === 'ppio') return { id: 'ppio', name: 'PPIO', generate: mock.mockGenerate }
    if (id === 'grsai') return { id: 'grsai', name: 'GRSAI', submitJob: mock.mockSubmitJob }
    return undefined
  }),
  getAllProviders: vi.fn(() => []),
  registerProvider: vi.fn(),
}))

vi.mock('@/server/ai/index', () => ({}))

vi.mock('@/server/jobs/jobService', () => ({
  createJob: mock.mockCreateJob,
  updateJobStatus: mock.mockUpdateJobStatus,
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(required: number, available: number) {
      super(`Insufficient credits: required ${required}, available ${available}`)
      this.name = 'InsufficientCreditsError'
    }
  },
  JobNotFoundError: class JobNotFoundError extends Error {
    constructor(jobId: string) {
      super(`Job not found: ${jobId}`)
      this.name = 'JobNotFoundError'
    }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => {
        const user = mock.getAuthUser()
        return { data: { user }, error: user ? null : { message: 'not authenticated' } }
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { balance: 100 }, error: null }) }) }),
    }),
  }),
  getAuthUser: async () => mock.getAuthUser(),
}))

import { POST } from '../../src/app/api/ai/image/generate/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown, url = 'http://localhost/api/ai/image/generate') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/image/generate', () => {
  beforeEach(() => {
    mock.setAuth({ id: 'user-1' })
    mock.mockGenerate.mockClear()
    mock.mockSubmitJob.mockClear()
    mock.mockCreateJob.mockClear()
    mock.mockUpdateJobStatus.mockClear()
    mock.mockCreateJob.mockResolvedValue('job-uuid-001')
  })

  it('should return 401 when not authenticated', async () => {
    mock.setAuth(null)

    const response = await POST(makeRequest({
      modelId: 'ppio/test',
      prompt: 'test',
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('should return 400 when modelId is missing', async () => {
    const response = await POST(makeRequest({
      prompt: 'test',
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(400)
  })

  it('should return 400 when prompt is missing', async () => {
    const response = await POST(makeRequest({
      modelId: 'ppio/test',
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(400)
  })

  it('should return 400 for unknown provider', async () => {
    const response = await POST(makeRequest({
      modelId: 'unknown/model',
      prompt: 'test',
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('unknown')
  })

  it('should return imageUrl for synchronous provider (ppio)', async () => {
    mock.mockGenerate.mockResolvedValue({ imageUrl: 'https://cdn.ppio.com/output.png' })

    const response = await POST(makeRequest({
      modelId: 'ppio/gemini-3.1-flash',
      prompt: 'A beautiful sunset',
      projectId: 'proj-1',
      creditCost: 10,
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.imageUrl).toBe('https://cdn.ppio.com/output.png')
    expect(body.jobId).toBeDefined()
  })

  it('should return jobId for async provider (grsai)', async () => {
    mock.mockSubmitJob.mockResolvedValue('grsai-external-task-001')

    const response = await POST(makeRequest({
      modelId: 'grsai/nano-banana-pro',
      prompt: 'A mountain',
      projectId: 'proj-1',
      creditCost: 10,
    }))

    expect(response.status).toBe(202)
    const body = await response.json()
    expect(body.jobId).toBeDefined()
    expect(body.status).toBe('pending')
  })

  it('should return 402 when credits are insufficient', async () => {
    const ICE = class InsufficientCreditsError extends Error {
      constructor(required: number, available: number) {
        super(`Insufficient credits: required ${required}, available ${available}`)
        this.name = 'InsufficientCreditsError'
      }
    }
    mock.mockCreateJob.mockRejectedValue(new ICE(100, 5))

    const response = await POST(makeRequest({
      modelId: 'ppio/test',
      prompt: 'test',
      projectId: 'proj-1',
      creditCost: 100,
    }))

    expect(response.status).toBe(402)
  })
})
