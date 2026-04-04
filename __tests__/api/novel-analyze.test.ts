import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────
const mock = vi.hoisted(() => {
  const mockAnalyzeNovel = vi.fn()
  let authUser: { id: string } | null = { id: 'user-1' }

  return {
    mockAnalyzeNovel,
    getAuthUser: () => authUser,
    setAuth: (user: { id: string } | null) => { authUser = user },
  }
})

vi.mock('@/server/ai/analysis/novelAnalysisService', () => ({
  analyzeNovel: mock.mockAnalyzeNovel,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => {
        const user = mock.getAuthUser()
        return { data: { user }, error: user ? null : { message: 'not authenticated' } }
      },
    },
  }),
  getAuthUser: async () => mock.getAuthUser(),
}))

import { POST } from '../../src/app/api/ai/novel-analyze/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/novel-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/novel-analyze', () => {
  beforeEach(() => {
    mock.setAuth({ id: 'user-1' })
    mock.mockAnalyzeNovel.mockReset()
  })

  it('should return 401 for unauthenticated request', async () => {
    mock.setAuth(null)

    const response = await POST(makeRequest({ text: 'Hello world' }))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('should return 400 for empty text', async () => {
    const response = await POST(makeRequest({ text: '' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('text')
  })

  it('should return 400 for missing text field', async () => {
    const response = await POST(makeRequest({}))

    expect(response.status).toBe(400)
  })

  it('should return 400 for text exceeding 10,000 characters', async () => {
    const longText = 'a'.repeat(10_001)
    mock.mockAnalyzeNovel.mockRejectedValue(
      new Error('Text exceeds maximum length of 10,000 characters')
    )

    const response = await POST(makeRequest({ text: longText }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('10,000')
  })

  it('should return characters and scenes on success', async () => {
    mock.mockAnalyzeNovel.mockResolvedValue({
      characters: [{ id: 'john', name: 'John', description: 'A brave knight', aliases: [] }],
      scenes: [
        {
          title: 'The Quest Begins',
          summary: 'John sets out on his journey.',
          visualPrompt: 'A knight in shining armor leaving a castle at dawn',
          characters: ['john'],
          location: 'Castle gates',
          mood: 'adventurous',
          timeOfDay: 'dawn',
          sourceTextRange: { start: 0, end: 50 },
        },
      ],
    })

    const response = await POST(makeRequest({
      text: 'John the brave knight left the castle at dawn.',
      language: 'en',
      maxScenes: 10,
      sceneGranularity: 'coarse',
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.characters).toHaveLength(1)
    expect(body.characters[0].id).toBe('john')
    expect(body.scenes).toHaveLength(1)
    expect(body.scenes[0].visualPrompt).toContain('knight')
  })

  it('should pass parameters to analyzeNovel correctly', async () => {
    mock.mockAnalyzeNovel.mockResolvedValue({ characters: [], scenes: [] })

    await POST(makeRequest({
      text: 'Test text',
      language: 'zh',
      maxScenes: 5,
      sceneGranularity: 'fine',
    }))

    expect(mock.mockAnalyzeNovel).toHaveBeenCalledWith({
      text: 'Test text',
      language: 'zh',
      maxScenes: 5,
      sceneGranularity: 'fine',
    })
  })

  it('should return 500 for LLM provider errors', async () => {
    mock.mockAnalyzeNovel.mockRejectedValue(new Error('Gemini API error 500: Internal'))

    const response = await POST(makeRequest({ text: 'Some text here' }))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toContain('Gemini')
  })
})
