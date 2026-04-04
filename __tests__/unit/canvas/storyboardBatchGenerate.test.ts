import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoryboardGenFrameItem } from '@/features/canvas/domain/canvasNodes'
import {
  submitBatchJobs,
  pollBatchJobs,
  type BatchJobState,
  type BatchGenerateContext,
} from '@/features/canvas/application/storyboardBatchGenerate'

describe('Batch Generate', () => {
  const makeFrame = (
    id: string,
    description: string,
    overrides: Partial<StoryboardGenFrameItem> = {}
  ): StoryboardGenFrameItem => ({
    id,
    description,
    referenceIndex: null,
    startFrameMode: 'none',
    endFrameMode: 'none',
    ...overrides,
  })

  const makeContext = (overrides: Partial<BatchGenerateContext> = {}): BatchGenerateContext => ({
    model: 'test-model',
    requestModel: 'test-model',
    size: '1K',
    aspectRatio: '16:9',
    extraParams: {},
    ...overrides,
  })

  describe('submitBatchJobs', () => {
    it('should submit all frames jobs in parallel', async () => {
      const frames = [
        makeFrame('f1', 'scene 1'),
        makeFrame('f2', 'scene 2'),
        makeFrame('f3', 'scene 3'),
      ]
      const submitFn = vi.fn()
        .mockResolvedValueOnce('job-1')
        .mockResolvedValueOnce('job-2')
        .mockResolvedValueOnce('job-3')

      const result = await submitBatchJobs(frames, makeContext(), submitFn)

      expect(submitFn).toHaveBeenCalledTimes(3)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ frameId: 'f1', jobId: 'job-1', error: null })
      expect(result[1]).toEqual({ frameId: 'f2', jobId: 'job-2', error: null })
      expect(result[2]).toEqual({ frameId: 'f3', jobId: 'job-3', error: null })
    })

    it('should continue other frames when partial failure on submit', async () => {
      const frames = [
        makeFrame('f1', 'scene 1'),
        makeFrame('f2', 'scene 2'),
        makeFrame('f3', 'scene 3'),
      ]
      const submitFn = vi.fn()
        .mockResolvedValueOnce('job-1')
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce('job-3')

      const result = await submitBatchJobs(frames, makeContext(), submitFn)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ frameId: 'f1', jobId: 'job-1', error: null })
      expect(result[1]).toEqual({ frameId: 'f2', jobId: null, error: 'API error' })
      expect(result[2]).toEqual({ frameId: 'f3', jobId: 'job-3', error: null })
    })

    it('should pass start/end frame params to submit function', async () => {
      const frames = [
        makeFrame('f1', 'scene 1', {
          startFrameUrl: 'https://example.com/start.png',
          endFrameUrl: 'https://example.com/end.png',
          startFrameMode: 'reference',
          endFrameMode: 'strict',
          referenceImageUrls: ['https://example.com/ref1.png'],
          referenceWeights: [0.7],
        }),
      ]
      const submitFn = vi.fn().mockResolvedValueOnce('job-1')

      await submitBatchJobs(frames, makeContext(), submitFn)

      expect(submitFn).toHaveBeenCalledTimes(1)
      const payload = submitFn.mock.calls[0][0]
      expect(payload.extraParams.startFrame).toBe('https://example.com/start.png')
      expect(payload.extraParams.endFrame).toBe('https://example.com/end.png')
      expect(payload.extraParams.startFrameMode).toBe('reference')
      expect(payload.extraParams.endFrameMode).toBe('strict')
      expect(payload.extraParams.referenceWeights).toEqual([0.7])
      expect(payload.referenceImages).toEqual(['https://example.com/ref1.png'])
    })
  })

  describe('pollBatchJobs', () => {
    it('should poll all job statuses in parallel', async () => {
      const jobs: BatchJobState[] = [
        { frameId: 'f1', jobId: 'job-1', error: null },
        { frameId: 'f2', jobId: 'job-2', error: null },
      ]
      const pollFn = vi.fn()
        .mockResolvedValueOnce({ job_id: 'job-1', status: 'succeeded', result: 'img1.png' })
        .mockResolvedValueOnce({ job_id: 'job-2', status: 'succeeded', result: 'img2.png' })

      const result = await pollBatchJobs(jobs, pollFn)

      expect(pollFn).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ frameId: 'f1', jobId: 'job-1', status: 'succeeded', result: 'img1.png', error: null })
      expect(result[1]).toEqual({ frameId: 'f2', jobId: 'job-2', status: 'succeeded', result: 'img2.png', error: null })
    })

    it('should correctly track batch progress with partial failure', async () => {
      const jobs: BatchJobState[] = [
        { frameId: 'f1', jobId: 'job-1', error: null },
        { frameId: 'f2', jobId: null, error: 'submit failed' },
        { frameId: 'f3', jobId: 'job-3', error: null },
      ]
      const pollFn = vi.fn()
        .mockResolvedValueOnce({ job_id: 'job-1', status: 'succeeded', result: 'img1.png' })
        .mockResolvedValueOnce({ job_id: 'job-3', status: 'failed', error: 'gen failed' })

      const result = await pollBatchJobs(jobs, pollFn)

      // Should only poll the 2 that have jobIds
      expect(pollFn).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(3)
      // f1: succeeded
      expect(result[0].status).toBe('succeeded')
      expect(result[0].result).toBe('img1.png')
      // f2: skipped (submit failed)
      expect(result[1].status).toBe('failed')
      expect(result[1].error).toBe('submit failed')
      // f3: failed
      expect(result[2].status).toBe('failed')
      expect(result[2].error).toBe('gen failed')
    })

    it('should handle poll errors gracefully', async () => {
      const jobs: BatchJobState[] = [
        { frameId: 'f1', jobId: 'job-1', error: null },
      ]
      const pollFn = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const result = await pollBatchJobs(jobs, pollFn)

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('failed')
      expect(result[0].error).toBe('Network error')
    })
  })
})
