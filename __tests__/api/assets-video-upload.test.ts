// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockCreateSignedUploadUrl = vi.fn()
const mockSelectProject = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    storage: { from: () => ({ createSignedUploadUrl: mockCreateSignedUploadUrl }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockSelectProject }) }) }),
  }),
}))

import { POST } from '@/app/api/assets/video-upload/route'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/assets/video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/assets/video-upload', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockCreateSignedUploadUrl.mockReset()
    mockSelectProject.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when fields missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when project not owned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelectProject.mockResolvedValue({ data: null, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(403)
  })

  it('returns signed URLs on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelectProject.mockResolvedValue({ data: { id: 'p1' }, error: null })
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase/upload', path: 'p1/abc.mp4', token: 't' },
      error: null,
    })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uploadUrl).toBe('https://supabase/upload')
    expect(body.objectPath).toMatch(/^p1\/.+\.mp4$/)
  })

  it('rejects invalid mime type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.gif', mimeType: 'image/gif' }))
    expect(res.status).toBe(400)
  })
})
