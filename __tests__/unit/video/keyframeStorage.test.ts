import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}))

import { uploadKeyframes } from '@/server/video/analysis/keyframeStorage'

describe('uploadKeyframes', () => {
  beforeEach(() => {
    mockUpload.mockReset()
    mockCreateSignedUrl.mockReset()
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed/url' },
      error: null,
    })
  })

  it('uploads each buffer and returns signed URLs in insertion order', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'stub' }, error: null })

    const urls = await uploadKeyframes({
      projectId: 'p1',
      analysisId: 'a1',
      keyframes: [
        { timestampMs: 200,  buffer: Buffer.from('a') },
        { timestampMs: 5200, buffer: Buffer.from('b') },
      ],
    })

    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://signed/url')
    expect(mockUpload).toHaveBeenCalledTimes(2)
    const firstPath = mockUpload.mock.calls[0][0]
    expect(firstPath).toMatch(/^p1\/a1\/frame-200\.jpg$/)
  })

  it('throws if any upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(
      uploadKeyframes({
        projectId: 'p1',
        analysisId: 'a1',
        keyframes: [{ timestampMs: 0, buffer: Buffer.from('x') }],
      }),
    ).rejects.toThrow(/boom/)
  })
})
