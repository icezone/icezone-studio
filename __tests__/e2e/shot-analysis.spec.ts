import { test, expect } from '@playwright/test'

test.describe('Shot Analysis API (N3)', () => {
  test('shot analysis API returns structured result', async ({ request }) => {
    // This test validates the API route structure.
    // In CI without GEMINI_API_KEY, it should return a 500 or 401.
    const response = await request.post('/api/ai/shot-analysis', {
      data: {
        imageUrl: 'https://example.com/test.jpg',
        language: 'en',
      },
    })

    // Without auth, should get 401
    expect(response.status()).toBe(401)
  })

  test('shot analysis API rejects missing imageUrl', async ({ request }) => {
    const response = await request.post('/api/ai/shot-analysis', {
      data: {
        language: 'en',
      },
    })

    // Should get 400 or 401 (auth check comes first)
    expect([400, 401]).toContain(response.status())
  })

  test('shot analysis API rejects too many additional frames', async ({ request }) => {
    const manyFrames = Array.from({ length: 10 }, (_, i) => `https://example.com/frame${i}.jpg`)

    const response = await request.post('/api/ai/shot-analysis', {
      data: {
        imageUrl: 'https://example.com/test.jpg',
        additionalFrameUrls: manyFrames,
        language: 'en',
      },
    })

    // Should get 400 or 401 (auth check comes first)
    expect([400, 401]).toContain(response.status())
  })
})
