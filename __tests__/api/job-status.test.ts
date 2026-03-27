import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────────────────
const mock = vi.hoisted(() => {
  const mockPollJob = vi.fn()
  const mockGetJob = vi.fn()
  const mockUpdateJobStatus = vi.fn().mockResolvedValue(undefined)
  let authUser: { id: string } | null = { id: 'user-1' }

  const mockSupabaseUpdate = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }))

  return {
    mockPollJob,
    mockGetJob,
    mockUpdateJobStatus,
    mockSupabaseUpdate,
    getAuthUser: () => authUser,
    setAuth: (user: { id: string } | null) => { authUser = user },
  }
})

vi.mock('@/server/ai/registry', () => ({
  getProvider: vi.fn((id: string) => {
    if (id === 'grsai') return { id: 'grsai', name: 'GRSAI', pollJob: mock.mockPollJob }
    if (id === 'ppio') return { id: 'ppio', name: 'PPIO', generate: vi.fn() }
    return undefined
  }),
  registerProvider: vi.fn(),
}))

vi.mock('@/server/ai/index', () => ({}))

vi.mock('@/server/jobs/jobService', () => ({
  getJob: mock.mockGetJob,
  updateJobStatus: mock.mockUpdateJobStatus,
  JobNotFoundError: class JobNotFoundError extends Error {
    constructor(jobId: string) {
      super(`Job not found: ${jobId}`)
      this.name = 'JobNotFoundError'
    }
  },
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      update: mock.mockSupabaseUpdate,
    }),
    auth: {
      getUser: async () => {
        const user = mock.getAuthUser()
        return {
          data: { user },
          error: user ? null : { message: 'not authenticated' },
        }
      },
    },
  }),
  getAuthUser: async () => mock.getAuthUser(),
}))

import { GET } from '../../src/app/api/jobs/[id]/route'
import { NextRequest } from 'next/server'

function makeRequest(jobId: string) {
  return new NextRequest(`http://localhost/api/jobs/${jobId}`, { method: 'GET' })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/jobs/[id]', () => {
  beforeEach(() => {
    mock.setAuth({ id: 'user-1' })
    mock.mockPollJob.mockClear()
    mock.mockGetJob.mockClear()
    mock.mockUpdateJobStatus.mockClear()
  })

  it('should return 401 when not authenticated', async () => {
    mock.setAuth(null)

    const response = await GET(makeRequest('job-1'), makeParams('job-1'))

    expect(response.status).toBe(401)
  })

  it('should return 404 when job does not exist', async () => {
    const JNF = class JobNotFoundError extends Error {
      constructor(jobId: string) {
        super(`Job not found: ${jobId}`)
        this.name = 'JobNotFoundError'
      }
    }
    mock.mockGetJob.mockRejectedValue(new JNF('job-1'))

    const response = await GET(makeRequest('job-1'), makeParams('job-1'))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toContain('not found')
  })

  it('should return job status from DB when job is completed', async () => {
    mock.mockGetJob.mockResolvedValue({
      id: 'job-1',
      user_id: 'user-1',
      provider_id: 'grsai',
      external_job_id: 'grsai-task-001',
      status: 'completed',
      result: { url: 'https://cdn.grsai.com/output.png' },
      error: null,
    })

    const response = await GET(makeRequest('job-1'), makeParams('job-1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('completed')
    expect(body.imageUrl).toBe('https://cdn.grsai.com/output.png')
  })

  it('should poll provider and return completed when job is pending', async () => {
    mock.mockGetJob.mockResolvedValue({
      id: 'job-1',
      user_id: 'user-1',
      provider_id: 'grsai',
      external_job_id: 'grsai-task-001',
      status: 'pending',
      result: null,
      error: null,
    })
    mock.mockPollJob.mockResolvedValue({
      status: 'completed',
      imageUrl: 'https://cdn.grsai.com/fresh-output.png',
    })

    const response = await GET(makeRequest('job-1'), makeParams('job-1'))

    expect(mock.mockPollJob).toHaveBeenCalledWith('grsai-task-001')
    expect(mock.mockUpdateJobStatus).toHaveBeenCalledWith('job-1', 'completed', {
      outputUrl: 'https://cdn.grsai.com/fresh-output.png',
    })
    const body = await response.json()
    expect(body.status).toBe('completed')
    expect(body.imageUrl).toBe('https://cdn.grsai.com/fresh-output.png')
  })

  it('should poll provider and return failed when provider reports failure', async () => {
    mock.mockGetJob.mockResolvedValue({
      id: 'job-1',
      user_id: 'user-1',
      provider_id: 'grsai',
      external_job_id: 'grsai-task-001',
      status: 'pending',
      result: null,
      error: null,
    })
    mock.mockPollJob.mockResolvedValue({
      status: 'failed',
      errorMessage: 'Content moderation failed',
    })

    const response = await GET(makeRequest('job-1'), makeParams('job-1'))

    expect(mock.mockUpdateJobStatus).toHaveBeenCalledWith('job-1', 'failed', {
      errorMessage: 'Content moderation failed',
    })
    const body = await response.json()
    expect(body.status).toBe('failed')
    expect(body.errorMessage).toBe('Content moderation failed')
  })

  it('should return DB status when provider has no pollJob (sync provider)', async () => {
    mock.mockGetJob.mockResolvedValue({
      id: 'job-2',
      user_id: 'user-1',
      provider_id: 'ppio',
      external_job_id: null,
      status: 'pending',
      result: null,
      error: null,
    })

    const response = await GET(makeRequest('job-2'), makeParams('job-2'))

    expect(mock.mockPollJob).not.toHaveBeenCalled()
    const body = await response.json()
    expect(body.status).toBe('pending')
  })

  it('should return errorMessage from DB for failed jobs', async () => {
    mock.mockGetJob.mockResolvedValue({
      id: 'job-3',
      user_id: 'user-1',
      provider_id: 'grsai',
      external_job_id: 'task-003',
      status: 'failed',
      result: null,
      error: 'NSFW content rejected',
    })

    const response = await GET(makeRequest('job-3'), makeParams('job-3'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('failed')
    expect(body.errorMessage).toBe('NSFW content rejected')
  })
})
