// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────
const mockFrameData = vi.hoisted(() => {
  const jpegBuffer = Buffer.from('fake-jpeg-data')

  const writableChunks: Buffer[] = []

  // Mock ffmpeg for frame extraction
  const ffmpegInstance = {
    seekInput: vi.fn().mockReturnThis(),
    frames: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    pipe: vi.fn((writable: { write: (chunk: Buffer, encoding: string, cb: () => void) => void; emit: (event: string) => void }) => {
      // Simulate writing jpeg data then finishing
      writable.write(jpegBuffer, 'binary', () => {
        writable.emit('finish')
      })
      return writable
    }),
    on: vi.fn().mockReturnThis(),
    run: vi.fn(),
  }

  const ffmpegConstructor = vi.fn(() => ffmpegInstance)

  return {
    jpegBuffer,
    writableChunks,
    ffmpegConstructor,
    ffmpegInstance,
    reset() {
      writableChunks.length = 0
      vi.clearAllMocks()
    },
  }
})

vi.mock('fluent-ffmpeg', () => {
  const fn = mockFrameData.ffmpegConstructor as unknown as Record<string, unknown>
  fn.ffprobe = vi.fn()
  return { default: fn }
})

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/usr/bin/ffmpeg',
}))

import { extractKeyframes } from '@/server/video/analysis/frameExtractor'

describe('FrameExtractor', () => {
  beforeEach(() => {
    mockFrameData.reset()
  })

  it('should return empty array for empty timestamps', async () => {
    const frames = await extractKeyframes('https://example.com/video.mp4', [])
    expect(frames).toEqual([])
  })

  it('should extract keyframes at specified timestamps', async () => {
    const frames = await extractKeyframes('https://example.com/video.mp4', [1000, 3000, 5000])

    expect(frames).toHaveLength(3)
    expect(frames[0].timestampMs).toBe(1000)
    expect(frames[1].timestampMs).toBe(3000)
    expect(frames[2].timestampMs).toBe(5000)
  })

  it('should return base64 data URI for each keyframe', async () => {
    const frames = await extractKeyframes('https://example.com/video.mp4', [2000])

    expect(frames).toHaveLength(1)
    expect(frames[0].imageData).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should call ffmpeg with correct seek times', async () => {
    await extractKeyframes('https://example.com/video.mp4', [1500, 4000])

    // seekInput should be called with seconds (ms / 1000)
    expect(mockFrameData.ffmpegInstance.seekInput).toHaveBeenCalledWith(1.5)
    expect(mockFrameData.ffmpegInstance.seekInput).toHaveBeenCalledWith(4)
  })

  it('should request single frame per timestamp', async () => {
    await extractKeyframes('https://example.com/video.mp4', [1000])

    expect(mockFrameData.ffmpegInstance.frames).toHaveBeenCalledWith(1)
  })
})
