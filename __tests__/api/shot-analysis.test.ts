// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetUser, mockAnalyze } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAnalyze: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/server/ai/analysis/shotAnalysisService', () => ({
  analyzeShot: mockAnalyze,
}))

import { POST } from '@/app/api/ai/shot-analysis/route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/ai/shot-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/shot-analysis', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockAnalyze.mockReset()
  })

  it('401 unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await POST(req({ imageUrl: 'x', language: 'en' }))
    expect(r.status).toBe(401)
  })

  it('400 missing imageUrl', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ language: 'en' }))
    expect(r.status).toBe(400)
  })

  it('400 invalid language', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ imageUrl: 'https://x', language: 'fr' }))
    expect(r.status).toBe(400)
  })

  it('returns analysis with additional frames', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockAnalyze.mockResolvedValue({
      shotType: 'MS', shotTypeConfidence: 0.9, cameraMovement: 'Static',
      movementDescription: '', subject: 'musician', subjectAction: 'playing',
      lightingType: '', lightingMood: '', colorPalette: [], mood: '',
      composition: '', directorNote: '',
    })
    const r = await POST(req({
      imageUrl: 'https://x/0.jpg',
      additionalFrameUrls: ['https://x/1.jpg', 'https://x/2.jpg'],
      language: 'zh',
    }))
    expect(r.status).toBe(200)
    const called = mockAnalyze.mock.calls[0][0]
    expect(called.additionalFrameUrls).toHaveLength(2)
    expect(called.language).toBe('zh')
  })
})
