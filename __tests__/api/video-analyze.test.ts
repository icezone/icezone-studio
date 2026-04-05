// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the scene detection and frame extraction to avoid real ffmpeg calls
vi.mock('@/server/video/analysis/sceneDetector', () => ({
  detectScenes: vi.fn().mockResolvedValue([
    { startTimeMs: 0, endTimeMs: 5000, keyframeTimestampMs: 200, confidence: 1.0 },
    { startTimeMs: 5000, endTimeMs: 10000, keyframeTimestampMs: 5200, confidence: 0.8 },
  ]),
}))

vi.mock('@/server/video/analysis/frameExtractor', () => ({
  extractKeyframes: vi.fn().mockResolvedValue([
    { timestampMs: 200, imageData: 'data:image/jpeg;base64,abc123' },
    { timestampMs: 5200, imageData: 'data:image/jpeg;base64,def456' },
  ]),
}))

import { POST } from '../../src/app/api/video/analyze/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/video/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/video/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 for missing videoUrl', async () => {
    const response = await POST(makeRequest({
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/videoUrl/i)
  })

  it('should return 400 for missing projectId', async () => {
    const response = await POST(makeRequest({
      videoUrl: 'https://example.com/video.mp4',
    }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/projectId/i)
  })

  it('should return scenes for valid request', async () => {
    const response = await POST(makeRequest({
      videoUrl: 'https://example.com/video.mp4',
      projectId: 'proj-1',
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.scenes).toHaveLength(2)
    expect(body.scenes[0]).toMatchObject({
      startTimeMs: 0,
      endTimeMs: 5000,
      keyframeUrl: 'data:image/jpeg;base64,abc123',
      confidence: 1.0,
    })
    expect(body.scenes[1]).toMatchObject({
      startTimeMs: 5000,
      endTimeMs: 10000,
      keyframeUrl: 'data:image/jpeg;base64,def456',
      confidence: 0.8,
    })
    expect(body.totalDurationMs).toBe(10000)
  })

  it('should accept optional parameters', async () => {
    const response = await POST(makeRequest({
      videoUrl: 'https://example.com/video.mp4',
      projectId: 'proj-1',
      sensitivityThreshold: 0.5,
      minSceneDurationMs: 1000,
      maxKeyframes: 20,
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.scenes).toBeDefined()
  })
})
