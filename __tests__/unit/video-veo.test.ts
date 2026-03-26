import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  veoProvider,
  veoFastProvider,
  clampVeoSeed,
  getVeoEndpoint,
  VEO_SEED_MIN,
  VEO_SEED_MAX,
} from '@/server/video/providers/veo'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Veo Provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.KIE_API_KEY = 'test-veo-key'
  })

  // -------------------------------------------------------------------------
  // clampVeoSeed
  // -------------------------------------------------------------------------
  describe('clampVeoSeed', () => {
    it('returns seed unchanged when in valid range', () => {
      expect(clampVeoSeed(50000)).toBe(50000)
      expect(clampVeoSeed(VEO_SEED_MIN)).toBe(VEO_SEED_MIN)
      expect(clampVeoSeed(VEO_SEED_MAX)).toBe(VEO_SEED_MAX)
    })

    it('clamps seed below minimum to 10000', () => {
      expect(clampVeoSeed(0)).toBe(10000)
      expect(clampVeoSeed(9999)).toBe(10000)
      expect(clampVeoSeed(-1)).toBe(10000)
    })

    it('clamps seed above maximum to 99999', () => {
      expect(clampVeoSeed(100000)).toBe(99999)
      expect(clampVeoSeed(999999)).toBe(99999)
    })
  })

  // -------------------------------------------------------------------------
  // getVeoEndpoint
  // -------------------------------------------------------------------------
  describe('getVeoEndpoint', () => {
    it('returns veo3 endpoint for veo/veo3', () => {
      const endpoint = getVeoEndpoint('veo/veo3')
      expect(endpoint).toContain('veo3')
      expect(endpoint).not.toContain('veo3-fast')
    })

    it('returns veo3-fast endpoint for veo/veo3_fast', () => {
      const endpoint = getVeoEndpoint('veo/veo3_fast')
      expect(endpoint).toContain('veo3-fast')
    })

    it('throws for unknown model ID', () => {
      expect(() => getVeoEndpoint('veo/unknown')).toThrow('Unknown Veo model ID')
    })
  })

  // -------------------------------------------------------------------------
  // veoProvider (veo3)
  // -------------------------------------------------------------------------
  describe('veoProvider (veo3)', () => {
    it('has id "veo"', () => {
      expect(veoProvider.id).toBe('veo')
    })

    describe('submitJob', () => {
      it('submits to veo3 endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ task_id: 'veo3-task-001' }),
        })

        const taskId = await veoProvider.submitJob({
          modelId: 'veo/veo3',
          prompt: 'Sunset timelapse',
          duration: 0,
          aspectRatio: '16:9',
        })

        expect(taskId).toBe('veo3-task-001')
        const [url] = mockFetch.mock.calls[0]
        expect(url).toContain('veo3')
        expect(url).not.toContain('veo3-fast')
      })

      it('clamps seed below 10000', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ task_id: 'veo3-seed-low' }),
        })

        await veoProvider.submitJob({
          modelId: 'veo/veo3',
          prompt: 'Test',
          duration: 0,
          aspectRatio: '16:9',
          seed: 42,
        })

        const [, opts] = mockFetch.mock.calls[0]
        const body = JSON.parse(opts.body as string)
        expect(body.seed).toBe(10000)
      })

      it('clamps seed above 99999', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ task_id: 'veo3-seed-high' }),
        })

        await veoProvider.submitJob({
          modelId: 'veo/veo3',
          prompt: 'Test',
          duration: 0,
          aspectRatio: '16:9',
          seed: 500000,
        })

        const [, opts] = mockFetch.mock.calls[0]
        const body = JSON.parse(opts.body as string)
        expect(body.seed).toBe(99999)
      })

      it('uses valid seed unchanged', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ task_id: 'veo3-seed-valid' }),
        })

        await veoProvider.submitJob({
          modelId: 'veo/veo3',
          prompt: 'Test',
          duration: 0,
          aspectRatio: '16:9',
          seed: 55000,
        })

        const [, opts] = mockFetch.mock.calls[0]
        const body = JSON.parse(opts.body as string)
        expect(body.seed).toBe(55000)
      })

      it('does not include seed when not provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ task_id: 'veo3-no-seed' }),
        })

        await veoProvider.submitJob({
          modelId: 'veo/veo3',
          prompt: 'Test',
          duration: 0,
          aspectRatio: '16:9',
        })

        const [, opts] = mockFetch.mock.calls[0]
        const body = JSON.parse(opts.body as string)
        expect(body.seed).toBeUndefined()
      })

      it('throws on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service unavailable'),
        })

        await expect(
          veoProvider.submitJob({
            modelId: 'veo/veo3',
            prompt: 'Test',
            duration: 0,
            aspectRatio: '16:9',
          })
        ).rejects.toThrow('Veo submit error 503')
      })
    })

    describe('pollJob', () => {
      it('returns completed with video URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'succeed',
              video_url: 'https://kie-cdn.com/veo3-video.mp4',
            }),
        })

        const result = await veoProvider.pollJob('veo3-task-001')
        expect(result.status).toBe('completed')
        expect(result.videoUrl).toBe('https://kie-cdn.com/veo3-video.mp4')
      })

      it('polls the veo3 endpoint (not veo3-fast)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'pending' }),
        })

        await veoProvider.pollJob('veo3-task-001')
        const [url] = mockFetch.mock.calls[0]
        expect(url).toContain('veo3')
        expect(url).not.toContain('veo3-fast')
      })
    })
  })

  // -------------------------------------------------------------------------
  // veoFastProvider (veo3_fast)
  // -------------------------------------------------------------------------
  describe('veoFastProvider (veo3_fast)', () => {
    it('has id "veo_fast"', () => {
      expect(veoFastProvider.id).toBe('veo_fast')
    })

    it('submits to veo3-fast endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'veo3-fast-task-001' }),
      })

      await veoFastProvider.submitJob({
        modelId: 'veo/veo3_fast',
        prompt: 'Fast video',
        duration: 0,
        aspectRatio: '16:9',
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('veo3-fast')
    })

    it('polls the veo3-fast endpoint (not veo3)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      })

      await veoFastProvider.pollJob('veo3-fast-task-001')
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('veo3-fast')
    })

    it('also applies seed clamping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task_id: 'veo3-fast-seed' }),
      })

      await veoFastProvider.submitJob({
        modelId: 'veo/veo3_fast',
        prompt: 'Test',
        duration: 0,
        aspectRatio: '16:9',
        seed: 1,
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body as string)
      expect(body.seed).toBe(10000)
    })
  })
})
