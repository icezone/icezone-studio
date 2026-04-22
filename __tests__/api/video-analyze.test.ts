// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetUser, mockProjectLookup } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockProjectLookup: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockProjectLookup }) }) }),
  }),
}))

vi.mock('@/server/video/analysis/sceneDetector', () => ({
  detectScenes: vi.fn().mockResolvedValue([
    { startTimeMs: 0, endTimeMs: 5000, keyframeTimestampMs: 200, confidence: 0.8 },
    { startTimeMs: 5000, endTimeMs: 10000, keyframeTimestampMs: 5200, confidence: 0.7 },
  ]),
}))

vi.mock('@/server/video/analysis/frameExtractor', () => ({
  extractKeyframes: vi.fn().mockResolvedValue([
    { timestampMs: 200, imageData: 'data:image/jpeg;base64,QUJD' },
    { timestampMs: 5200, imageData: 'data:image/jpeg;base64,REVG' },
  ]),
}))

vi.mock('@/server/video/analysis/keyframeStorage', () => ({
  uploadKeyframes: vi.fn().mockResolvedValue([
    'https://storage/kf-0.jpg',
    'https://storage/kf-1.jpg',
  ]),
}))

import { POST } from '@/app/api/video/analyze/route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/video/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/video/analyze', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProjectLookup.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing videoUrl', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(req({ projectId: 'p1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when project not owned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockProjectLookup.mockResolvedValue({ data: null })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(403)
  })

  it('returns scenes with keyframeUrls on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockProjectLookup.mockResolvedValue({ data: { id: 'p1' } })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.analysisId).toMatch(/[a-f0-9-]{8,}/)
    expect(body.scenes).toHaveLength(2)
    expect(body.scenes[0].keyframeUrl).toBe('https://storage/kf-0.jpg')
    expect(body.scenes[1].keyframeUrl).toBe('https://storage/kf-1.jpg')
  })
})
