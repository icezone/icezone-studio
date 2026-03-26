import { describe, it, expect, vi, beforeEach } from 'vitest'
import { klingProvider } from '@/server/video/providers/kling'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Kling Provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.KIE_API_KEY = 'test-kling-key'
  })

  describe('submitJob', () => {
    it('constructs text-to-video request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-task-001' }),
      })

      const taskId = await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'A cat playing piano',
        duration: 5,
        aspectRatio: '16:9',
      })

      expect(taskId).toBe('kling-task-001')

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('text-to-video')
      const body = JSON.parse(opts.body as string)
      expect(body.prompt).toBe('A cat playing piano')
      expect(body.duration).toBe('5')
      expect(body.aspect_ratio).toBe('16:9')
    })

    it('uses image-to-video endpoint when imageUrl is provided', async () => {
      // First call: uploadImageToKie (URL upload)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://kie-cdn.com/ref.png' }),
      })
      // Second call: submit job
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-task-img-001' }),
      })

      const taskId = await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'Animate this image',
        imageUrl: 'https://example.com/image.png',
        duration: 10,
        aspectRatio: '9:16',
      })

      expect(taskId).toBe('kling-task-img-001')
      const [submitUrl, submitOpts] = mockFetch.mock.calls[1]
      expect(submitUrl).toContain('image-to-video')
      const body = JSON.parse(submitOpts.body as string)
      expect(body.image_url).toBe('https://kie-cdn.com/ref.png')
    })

    it('passes multi_shots extra param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-task-ms' }),
      })

      await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'A cinematic shot',
        duration: 15,
        aspectRatio: '16:9',
        extraParams: { multi_shots: true, mode: 'pro' },
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.multi_shots).toBe(true)
      expect(body.mode).toBe('pro')
    })

    it('passes kling_elements extra param when non-empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-task-el' }),
      })

      const elements = [{ name: 'hero', description: 'A brave knight' }]
      await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'Epic battle',
        duration: 5,
        aspectRatio: '16:9',
        extraParams: { kling_elements: elements },
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.kling_elements).toEqual(elements)
    })

    it('does not include empty kling_elements array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-task-no-el' }),
      })

      await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'Simple video',
        duration: 3,
        aspectRatio: '1:1',
        extraParams: { kling_elements: [] },
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.kling_elements).toBeUndefined()
    })

    it('passes seed when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'kling-seed-task' }),
      })

      await klingProvider.submitJob({
        modelId: 'kling/kling-3.0',
        prompt: 'Test',
        duration: 5,
        aspectRatio: '16:9',
        seed: 42,
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.seed).toBe(42)
    })

    it('throws when task_id is missing in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ msg: 'internal error' }),
      })

      await expect(
        klingProvider.submitJob({
          modelId: 'kling/kling-3.0',
          prompt: 'Test',
          duration: 5,
          aspectRatio: '16:9',
        })
      ).rejects.toThrow('no task_id')
    })

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(
        klingProvider.submitJob({
          modelId: 'kling/kling-3.0',
          prompt: 'Test',
          duration: 5,
          aspectRatio: '16:9',
        })
      ).rejects.toThrow('Kling submit error 401')
    })
  })

  describe('pollJob', () => {
    it('returns pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      })

      const result = await klingProvider.pollJob('kling-task-001')
      expect(result.status).toBe('pending')
    })

    it('returns completed with video URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'succeed',
            video_url: 'https://kie-cdn.com/kling-video.mp4',
            cover_image_url: 'https://kie-cdn.com/kling-cover.jpg',
          }),
      })

      const result = await klingProvider.pollJob('kling-task-001')
      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe('https://kie-cdn.com/kling-video.mp4')
      expect(result.coverImageUrl).toBe('https://kie-cdn.com/kling-cover.jpg')
    })

    it('extracts video URL from nested data.works response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              task_status: 'succeed',
              works: [{ video: { resource: 'https://kie-cdn.com/nested.mp4' } }],
            },
          }),
      })

      const result = await klingProvider.pollJob('kling-task-nested')
      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe('https://kie-cdn.com/nested.mp4')
    })

    it('throws on poll HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      })

      await expect(klingProvider.pollJob('bad-task')).rejects.toThrow('Kling poll error 500')
    })
  })
})
