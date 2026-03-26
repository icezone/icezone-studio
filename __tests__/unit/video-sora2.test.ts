import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sora2Provider, durationToNFrames } from '@/server/video/providers/sora2'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Sora2 Provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.KIE_API_KEY = 'test-sora2-key'
  })

  // -------------------------------------------------------------------------
  // durationToNFrames
  // -------------------------------------------------------------------------
  describe('durationToNFrames', () => {
    it('maps 10s to 250 frames', () => {
      expect(durationToNFrames(10)).toBe(250)
    })

    it('maps 15s to 375 frames', () => {
      expect(durationToNFrames(15)).toBe(375)
    })

    it('throws for unsupported duration 5s', () => {
      expect(() => durationToNFrames(5)).toThrow('Sora2 does not support duration 5s')
    })

    it('throws for unsupported duration 3s', () => {
      expect(() => durationToNFrames(3)).toThrow('Sora2 does not support duration 3s')
    })

    it('throws for unsupported duration 0s', () => {
      expect(() => durationToNFrames(0)).toThrow('Sora2 does not support duration 0s')
    })
  })

  // -------------------------------------------------------------------------
  // submitJob
  // -------------------------------------------------------------------------
  describe('submitJob', () => {
    it('constructs request with correct n_frames for 10s', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'sora2-task-001' }),
      })

      const taskId = await sora2Provider.submitJob({
        modelId: 'sora2/sora-2-image-to-video',
        prompt: 'Ocean waves',
        duration: 10,
        aspectRatio: '16:9',
      })

      expect(taskId).toBe('sora2-task-001')
      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.n_frames).toBe(250)
      expect(body.aspect_ratio).toBe('16:9')
      expect(body.prompt).toBe('Ocean waves')
    })

    it('constructs request with correct n_frames for 15s', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'sora2-task-002' }),
      })

      await sora2Provider.submitJob({
        modelId: 'sora2/sora-2-image-to-video',
        prompt: 'Cityscape at night',
        duration: 15,
        aspectRatio: '9:16',
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.n_frames).toBe(375)
    })

    it('throws for unsupported duration 5s', async () => {
      await expect(
        sora2Provider.submitJob({
          modelId: 'sora2/sora-2-image-to-video',
          prompt: 'Test',
          duration: 5,
          aspectRatio: '16:9',
        })
      ).rejects.toThrow('Sora2 does not support duration 5s')

      // fetch should never have been called
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uploads image when imageUrl provided', async () => {
      // Upload call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://kie-cdn.com/sora2-ref.png' }),
      })
      // Submit call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'sora2-img-task' }),
      })

      await sora2Provider.submitJob({
        modelId: 'sora2/sora-2-image-to-video',
        prompt: 'Animate',
        imageUrl: 'https://example.com/image.png',
        duration: 10,
        aspectRatio: '16:9',
      })

      const [, submitOpts] = mockFetch.mock.calls[1]
      const body = JSON.parse(submitOpts.body as string)
      expect(body.image_url).toBe('https://kie-cdn.com/sora2-ref.png')
    })

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      })

      await expect(
        sora2Provider.submitJob({
          modelId: 'sora2/sora-2-image-to-video',
          prompt: 'Test',
          duration: 10,
          aspectRatio: '16:9',
        })
      ).rejects.toThrow('Sora2 submit error 429')
    })

    it('throws when task_id is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ msg: 'error' }),
      })

      await expect(
        sora2Provider.submitJob({
          modelId: 'sora2/sora-2-image-to-video',
          prompt: 'Test',
          duration: 10,
          aspectRatio: '16:9',
        })
      ).rejects.toThrow('no task_id')
    })
  })

  // -------------------------------------------------------------------------
  // pollJob
  // -------------------------------------------------------------------------
  describe('pollJob', () => {
    it('returns pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      })

      const result = await sora2Provider.pollJob('sora2-task-001')
      expect(result.status).toBe('pending')
    })

    it('returns completed with video URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'succeed',
            video_url: 'https://kie-cdn.com/sora2-video.mp4',
          }),
      })

      const result = await sora2Provider.pollJob('sora2-task-001')
      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe('https://kie-cdn.com/sora2-video.mp4')
    })

    it('returns failed with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'failed',
            error: 'Unsafe content detected',
          }),
      })

      const result = await sora2Provider.pollJob('sora2-task-fail')
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBe('Unsafe content detected')
    })
  })
})
