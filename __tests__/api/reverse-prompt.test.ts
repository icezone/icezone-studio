// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
  getAuthUser: vi.fn(),
}))

vi.mock('@/server/ai/analysis/reversePromptService', () => ({
  generateReversePrompt: vi.fn(),
}))

import { POST } from '@/app/api/ai/reverse-prompt/route'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'
import { getAuthUser } from '@/lib/supabase/server'
import { generateReversePrompt } from '@/server/ai/analysis/reversePromptService'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockGenerate = vi.mocked(generateReversePrompt)

function req(body: unknown) {
  return new NextRequest('http://localhost/api/ai/reverse-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/reverse-prompt', () => {
  beforeEach(() => {
    mockGetAuthUser.mockReset()
    mockGenerate.mockReset()
  })

  it('401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(401)
  })

  it('400 when imageUrl missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'u1' } as unknown as never)
    const r = await POST(req({ style: 'generic' }))
    expect(r.status).toBe(400)
  })

  it('defaults to generic style when style invalid', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'u1' } as unknown as never)
    mockGenerate.mockResolvedValue({
      prompt: 'test',
      confidence: 0.8,
    })
    const r = await POST(req({ imageUrl: 'https://x', style: 'weird' }))
    expect(r.status).toBe(200)
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ style: 'generic' })
    )
  })

  it('503 when GEMINI_API_KEY missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'u1' } as unknown as never)
    mockGenerate.mockRejectedValue(new GeminiKeyMissingError())
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(503)
  })

  it('returns 200 with result on success', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'u1' } as unknown as never)
    mockGenerate.mockResolvedValue({
      prompt: 'a beautiful shot',
      negativePrompt: 'blurry',
      tags: ['cinematic'],
      confidence: 0.9,
    })
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.prompt).toBe('a beautiful shot')
  })
})
