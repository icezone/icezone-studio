import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadImageToKie, mapKieVideoStatus, pollKieJob } from '@/server/video/providers/kie-common'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock Buffer (available in Node, but let's be explicit for test env)
// Buffer is available in Node, so no mock needed.

describe('KIE Common', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.KIE_API_KEY = 'test-kie-key'
  })

  // -------------------------------------------------------------------------
  // mapKieVideoStatus
  // -------------------------------------------------------------------------
  describe('mapKieVideoStatus', () => {
    it.each([
      ['succeed', 'completed'],
      ['succeeded', 'completed'],
      ['completed', 'completed'],
      ['failed', 'failed'],
      ['error', 'failed'],
      ['processing', 'processing'],
      ['running', 'processing'],
      ['in_progress', 'processing'],
      ['pending', 'pending'],
      ['unknown', 'pending'],
      [undefined, 'pending'],
    ] as const)('maps "%s" → "%s"', (input, expected) => {
      expect(mapKieVideoStatus(input)).toBe(expected)
    })
  })

  // -------------------------------------------------------------------------
  // uploadImageToKie — http URL passes through (or is uploaded by URL)
  // -------------------------------------------------------------------------
  describe('uploadImageToKie', () => {
    it('returns http URL directly when upload/url call returns no URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      })

      const result = await uploadImageToKie('http://example.com/image.png')
      expect(result).toBe('http://example.com/image.png')
    })

    it('returns uploaded URL when upload/url call succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://kie-cdn.com/uploaded.png' }),
      })

      const result = await uploadImageToKie('https://example.com/image.png')
      expect(result).toBe('https://kie-cdn.com/uploaded.png')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload/url'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('uploads data: URI as multipart', async () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII='

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://kie-cdn.com/base64-upload.png' }),
      })

      const result = await uploadImageToKie(dataUrl)
      expect(result).toBe('https://kie-cdn.com/base64-upload.png')
      // Should call the /upload endpoint (not /upload/url)
      const call = mockFetch.mock.calls[0]
      expect(call[0]).toContain('/upload')
      expect(call[0]).not.toContain('/upload/url')
    })

    it('throws when data: URI has invalid format', async () => {
      await expect(uploadImageToKie('data:invalid-no-base64')).rejects.toThrow(
        'Invalid data URI format'
      )
    })

    it('throws when upload fails for base64 data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('bad request'),
      })

      const dataUrl = 'data:image/png;base64,abc123'
      await expect(uploadImageToKie(dataUrl)).rejects.toThrow('KIE image upload failed 400')
    })

    it('throws KIE_API_KEY not configured when env var is missing', async () => {
      delete process.env.KIE_API_KEY
      await expect(uploadImageToKie('https://example.com/img.png')).rejects.toThrow(
        'KIE_API_KEY is not configured'
      )
    })
  })

  // -------------------------------------------------------------------------
  // pollKieJob
  // -------------------------------------------------------------------------
  describe('pollKieJob', () => {
    it('returns pending status for unknown task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      })

      const result = await pollKieJob('task-123')
      expect(result.status).toBe('pending')
      expect(result.videoUrl).toBeUndefined()
    })

    it('returns completed status with videoUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'succeed',
            video_url: 'https://kie-cdn.com/video.mp4',
            cover_image_url: 'https://kie-cdn.com/cover.jpg',
          }),
      })

      const result = await pollKieJob('task-456')
      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe('https://kie-cdn.com/video.mp4')
      expect(result.coverImageUrl).toBe('https://kie-cdn.com/cover.jpg')
    })

    it('returns failed status with errorMessage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'failed',
            error: 'Content policy violation',
          }),
      })

      const result = await pollKieJob('task-789')
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBe('Content policy violation')
    })

    it('throws on poll HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('task not found'),
      })

      await expect(pollKieJob('nonexistent')).rejects.toThrow('KIE poll error 404')
    })
  })
})
