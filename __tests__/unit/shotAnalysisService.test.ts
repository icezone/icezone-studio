import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the gemini provider before importing the service
vi.mock('@/server/ai/analysis/providers/geminiAnalysis', () => ({
  analyzeVisionWithGemini: vi.fn(),
}))

import { analyzeShot } from '@/server/ai/analysis/shotAnalysisService'
import { analyzeVisionWithGemini } from '@/server/ai/analysis/providers/geminiAnalysis'

const mockAnalyzeVision = vi.mocked(analyzeVisionWithGemini)

const MOCK_RESULT = {
  shotType: 'LS (Long Shot)',
  shotTypeConfidence: 0.85,
  cameraMovement: 'Static',
  movementDescription: 'Locked-off tripod shot',
  subject: 'A lone figure standing on a cliff edge',
  subjectAction: 'Gazing into the distance',
  lightingType: 'Natural backlight, soft golden hour quality',
  lightingMood: 'Warm golden hour',
  colorPalette: ['#D4944C', '#2B3A4E', '#F5E0C3', '#1A1A2E', '#8B6F47'],
  mood: 'Solitary, epic, contemplative',
  composition: 'Rule of Thirds, Leading Lines',
  directorNote:
    'A wide establishing shot at golden hour. The lone figure is positioned at the right third, silhouetted against the warm sky. Leading lines from the cliff edge draw the eye toward the subject.',
}

describe('shotAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should analyze a single image and return structured result', async () => {
    mockAnalyzeVision.mockResolvedValue(JSON.stringify(MOCK_RESULT))

    const result = await analyzeShot({
      imageUrl: 'https://example.com/image.jpg',
      language: 'en',
    })

    expect(result.shotType).toBe('LS (Long Shot)')
    expect(result.shotTypeConfidence).toBe(0.85)
    expect(result.cameraMovement).toBe('Static')
    expect(result.subject).toContain('lone figure')
    expect(result.colorPalette).toHaveLength(5)
    expect(result.directorNote).toContain('golden hour')

    // Verify the call was made with correct params
    expect(mockAnalyzeVision).toHaveBeenCalledTimes(1)
    const call = mockAnalyzeVision.mock.calls[0][0]
    expect(call.imageUrls).toEqual(['https://example.com/image.jpg'])
    expect(call.temperature).toBe(0.3)
  })

  it('should pass multiple frame URLs for movement analysis', async () => {
    mockAnalyzeVision.mockResolvedValue(
      JSON.stringify({ ...MOCK_RESULT, cameraMovement: 'Dolly In' })
    )

    const result = await analyzeShot({
      imageUrl: 'https://example.com/frame1.jpg',
      additionalFrameUrls: [
        'https://example.com/frame2.jpg',
        'https://example.com/frame3.jpg',
      ],
      language: 'en',
    })

    expect(result.cameraMovement).toBe('Dolly In')

    const call = mockAnalyzeVision.mock.calls[0][0]
    expect(call.imageUrls).toHaveLength(3)
  })

  it('should limit additional frames to 8', async () => {
    mockAnalyzeVision.mockResolvedValue(JSON.stringify(MOCK_RESULT))

    const manyFrames = Array.from({ length: 15 }, (_, i) => `https://example.com/frame${i}.jpg`)

    await analyzeShot({
      imageUrl: 'https://example.com/main.jpg',
      additionalFrameUrls: manyFrames,
      language: 'en',
    })

    const call = mockAnalyzeVision.mock.calls[0][0]
    // 1 main + 8 additional = 9 total
    expect(call.imageUrls).toHaveLength(9)
  })

  it('should throw when imageUrl is missing', async () => {
    await expect(
      analyzeShot({ imageUrl: '', language: 'en' })
    ).rejects.toThrow('imageUrl is required')
  })

  it('should handle Chinese language parameter', async () => {
    mockAnalyzeVision.mockResolvedValue(JSON.stringify(MOCK_RESULT))

    await analyzeShot({
      imageUrl: 'https://example.com/image.jpg',
      language: 'zh',
    })

    const call = mockAnalyzeVision.mock.calls[0][0]
    expect(call.userMessage).toContain('Chinese')
  })

  it('should normalize missing fields with defaults', async () => {
    mockAnalyzeVision.mockResolvedValue(JSON.stringify({
      shotType: 'CU',
      // Everything else missing
    }))

    const result = await analyzeShot({
      imageUrl: 'https://example.com/image.jpg',
      language: 'en',
    })

    expect(result.shotType).toBe('CU')
    expect(result.shotTypeConfidence).toBe(0.5) // default
    expect(result.cameraMovement).toBe('Static') // default
    expect(result.colorPalette).toEqual([]) // default
    expect(result.directorNote).toBe('') // default
  })

  it('should handle malformed LLM output gracefully', async () => {
    mockAnalyzeVision.mockResolvedValue('not valid json at all')

    const result = await analyzeShot({
      imageUrl: 'https://example.com/image.jpg',
      language: 'en',
    })

    // Should return defaults instead of throwing
    expect(result.shotType).toBe('Unknown')
    expect(result.cameraMovement).toBe('Static')
  })

  it('should clamp confidence to 0-1 range', async () => {
    mockAnalyzeVision.mockResolvedValue(
      JSON.stringify({ ...MOCK_RESULT, shotTypeConfidence: 1.5 })
    )

    const result = await analyzeShot({
      imageUrl: 'https://example.com/image.jpg',
      language: 'en',
    })

    expect(result.shotTypeConfidence).toBe(1.0)
  })
})
