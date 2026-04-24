// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── ffmpeg mocks ──────────────────────────────────────────────────────────────
const mockFfmpeg = vi.hoisted(() => {
  let probeResult: { format: { duration: number }; streams: Array<{ codec_type: string; r_frame_rate: string; width: number; height: number }> } = {
    format: { duration: 10 },
    streams: [{ codec_type: 'video', r_frame_rate: '30/1', width: 1920, height: 1080 }],
  }

  // Simulated showinfo output lines for scene detection
  let showInfoOutput: string[] = []

  const setProbeResult = (result: typeof probeResult) => {
    probeResult = result
  }

  const setShowInfoOutput = (lines: string[]) => {
    showInfoOutput = lines
  }

  // fluent-ffmpeg mock
  const ffmpegInstance = {
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    videoFilters: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    on: vi.fn(function (this: typeof ffmpegInstance, event: string, cb: (...args: unknown[]) => void) {
      if (event === 'end') {
        (ffmpegInstance as unknown as Record<string, unknown>)._endCb = cb
      }
      if (event === 'error') {
        (ffmpegInstance as unknown as Record<string, unknown>)._errorCb = cb
      }
      if (event === 'stderr') {
        (ffmpegInstance as unknown as Record<string, unknown>)._stderrCb = cb
      }
      return ffmpegInstance
    }),
    run: vi.fn(() => {
      // Emit stderr lines for scene detection
      const stderrCb = (ffmpegInstance as unknown as Record<string, (...args: unknown[]) => void>)._stderrCb
      if (stderrCb) {
        for (const line of showInfoOutput) {
          stderrCb(line)
        }
      }
      // Then emit end
      const endCb = (ffmpegInstance as unknown as Record<string, (...args: unknown[]) => void>)._endCb
      if (endCb) {
        endCb()
      }
    }),
  }

  const ffmpegConstructor = vi.fn(() => ffmpegInstance)

  // ffprobe mock
  const ffprobe = vi.fn((_path: string, cb: (err: Error | null, data: typeof probeResult) => void) => {
    cb(null, probeResult)
  })

  ;(ffmpegConstructor as unknown as Record<string, unknown>).ffprobe = ffprobe

  return {
    ffmpegConstructor,
    ffmpegInstance,
    ffprobe,
    setProbeResult,
    setShowInfoOutput,
  }
})

vi.mock('fluent-ffmpeg', () => {
  const fn = mockFfmpeg.ffmpegConstructor as unknown as Record<string, unknown>
  fn.ffprobe = mockFfmpeg.ffprobe
  return { default: fn }
})

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/usr/bin/ffmpeg',
}))

import { detectScenes } from '@/server/video/analysis/sceneDetector'

describe('SceneDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFfmpeg.setProbeResult({
      format: { duration: 10 },
      streams: [{ codec_type: 'video', r_frame_rate: '30/1', width: 1920, height: 1080 }],
    })
    mockFfmpeg.setShowInfoOutput([])
  })

  it('should detect single scene video and return 1 scene', async () => {
    // No scene changes detected — the entire video is 1 scene
    mockFfmpeg.setShowInfoOutput([])

    const scenes = await detectScenes('https://example.com/video.mp4')

    expect(scenes).toHaveLength(1)
    expect(scenes[0].startTimeMs).toBe(0)
    expect(scenes[0].endTimeMs).toBe(10000)
  })

  it('should adjust detection count based on sensitivity threshold', async () => {
    mockFfmpeg.setShowInfoOutput([
      '[Parsed_showinfo_1 @ 0x1234] n:  60 pts:  60060 pts_time:2.002    pos: 100000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.45',
      '[Parsed_showinfo_1 @ 0x1234] n: 150 pts: 150150 pts_time:5.005    pos: 250000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.25',
      '[Parsed_showinfo_1 @ 0x1234] n: 240 pts: 240240 pts_time:8.008    pos: 400000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.60',
    ])

    const scenes = await detectScenes('https://example.com/video.mp4', {
      sensitivityThreshold: 0.3,
    })

    // 3 scene cuts => 4 scenes (before first cut, between cuts, after last cut)
    expect(scenes).toHaveLength(4)
  })

  it('should respect maxKeyframes limit', async () => {
    mockFfmpeg.setShowInfoOutput([
      '[Parsed_showinfo_1 @ 0x1234] n:  30 pts:  30030 pts_time:1.001    pos: 50000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.50',
      '[Parsed_showinfo_1 @ 0x1234] n:  90 pts:  90090 pts_time:3.003    pos: 150000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.40',
      '[Parsed_showinfo_1 @ 0x1234] n: 150 pts: 150150 pts_time:5.005    pos: 250000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.60',
      '[Parsed_showinfo_1 @ 0x1234] n: 210 pts: 210210 pts_time:7.007    pos: 350000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.35',
      '[Parsed_showinfo_1 @ 0x1234] n: 270 pts: 270270 pts_time:9.009    pos: 450000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.55',
    ])

    const scenes = await detectScenes('https://example.com/video.mp4', {
      maxKeyframes: 2,
    })

    // maxKeyframes=2 means at most 2 scenes returned
    expect(scenes.length).toBeLessThanOrEqual(2)
  })

  it('should return correct timestamp ranges', async () => {
    mockFfmpeg.setShowInfoOutput([
      '[Parsed_showinfo_1 @ 0x1234] n:  90 pts:  90090 pts_time:3.003    pos: 150000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.50',
      '[Parsed_showinfo_1 @ 0x1234] n: 210 pts: 210210 pts_time:7.007    pos: 350000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.40',
    ])

    const scenes = await detectScenes('https://example.com/video.mp4')

    // 2 cuts => 3 scenes: [0, 3003), [3003, 7007), [7007, 10000)
    expect(scenes).toHaveLength(3)

    expect(scenes[0].startTimeMs).toBe(0)
    expect(scenes[0].endTimeMs).toBe(3003)

    expect(scenes[1].startTimeMs).toBe(3003)
    expect(scenes[1].endTimeMs).toBe(7007)

    expect(scenes[2].startTimeMs).toBe(7007)
    expect(scenes[2].endTimeMs).toBe(10000)
  })

  it('should filter short scenes per minSceneDurationMs', async () => {
    // Scenes at 2s, 2.3s (very close — 300ms gap), 8s
    mockFfmpeg.setShowInfoOutput([
      '[Parsed_showinfo_1 @ 0x1234] n:  60 pts:  60060 pts_time:2.000    pos: 100000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.50',
      '[Parsed_showinfo_1 @ 0x1234] n:  69 pts:  69069 pts_time:2.300    pos: 115000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.40',
      '[Parsed_showinfo_1 @ 0x1234] n: 240 pts: 240240 pts_time:8.000    pos: 400000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.60',
    ])

    const scenes = await detectScenes('https://example.com/video.mp4', {
      minSceneDurationMs: 500,
    })

    // The 300ms scene between 2.0s and 2.3s should be merged/filtered
    // All returned scenes should have duration >= 500ms
    for (const scene of scenes) {
      expect(scene.endTimeMs - scene.startTimeMs).toBeGreaterThanOrEqual(500)
    }
  })

  it('should use ffmpeg score as confidence (not hard-coded 1.0)', async () => {
    mockFfmpeg.setShowInfoOutput([
      '[Parsed_showinfo_1 @ 0x1234] n:  60 pts:  60060 pts_time:2.000    pos: 100000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.42',
      '[Parsed_showinfo_1 @ 0x1234] n: 150 pts: 150150 pts_time:5.005    pos: 250000 fmt:yuv420p sar:1/1 s:1920x1080 i:P iskey:1 type:I cmb:0 cmb_raw:0.0 score:0.91',
    ])

    const scenes = await detectScenes('https://example.com/video.mp4')

    // First scene (0 to 2000ms) should use the score from the NEXT boundary (0.42)
    expect(scenes[0].confidence).toBeCloseTo(0.42, 2)
    // Second scene should use 0.91
    expect(scenes[1].confidence).toBeCloseTo(0.91, 2)
  })

  it('should throw when ffmpeg fails (no silent single-scene fallback)', async () => {
    // Mock ffmpeg to fail
    mockFfmpeg.ffmpegInstance.run.mockImplementationOnce(() => {
      const errorCb = (mockFfmpeg.ffmpegInstance as unknown as Record<string, (err: Error) => void>)._errorCb
      if (errorCb) {
        errorCb(new Error('ffmpeg not found'))
      }
    })

    await expect(detectScenes('/does/not/exist.mp4')).rejects.toThrow(/ffmpeg/i)
  })
})
