import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────
const mock = vi.hoisted(() => {
  const mockAnalyze = vi.fn()
  return { mockAnalyze }
})

vi.mock('@/server/ai/analysis/providers/geminiAnalysis', () => ({
  analyzeWithGemini: mock.mockAnalyze,
}))

import { analyzeNovel, detectLanguage, safeJsonParse } from '@/server/ai/analysis/novelAnalysisService'

describe('novelAnalysisService', () => {
  beforeEach(() => {
    mock.mockAnalyze.mockReset()
  })

  describe('analyzeNovel', () => {
    const sampleLlmResponse = JSON.stringify({
      characters: [
        { id: 'li-ming', name: '李明', description: 'A young scholar', aliases: ['小李'] },
      ],
      scenes: [
        {
          title: 'Morning at the Temple',
          summary: 'Li Ming arrives at the ancient temple.',
          visualPrompt: 'A young Chinese scholar standing before an ancient temple at dawn, golden light filtering through mist',
          characters: ['li-ming'],
          location: 'Ancient temple',
          mood: 'peaceful',
          timeOfDay: 'dawn',
          sourceTextRange: { start: 0, end: 100 },
        },
      ],
    })

    it('should extract characters from text', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      const result = await analyzeNovel({ text: '李明走进了古寺。' })

      expect(result.characters).toHaveLength(1)
      expect(result.characters[0].id).toBe('li-ming')
      expect(result.characters[0].name).toBe('李明')
      expect(result.characters[0].aliases).toContain('小李')
    })

    it('should segment scenes with visual prompts', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      const result = await analyzeNovel({ text: '李明走进了古寺。' })

      expect(result.scenes).toHaveLength(1)
      expect(result.scenes[0].title).toBe('Morning at the Temple')
      expect(result.scenes[0].visualPrompt).toContain('temple')
      expect(result.scenes[0].characters).toContain('li-ming')
      expect(result.scenes[0].sourceTextRange).toEqual({ start: 0, end: 100 })
    })

    it('should pass maxScenes limit to LLM', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '测试文本', maxScenes: 5 })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('Max scenes: 5')
    })

    it('should default maxScenes to 20', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '测试文本' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('Max scenes: 20')
    })

    it('should support granularity parameter', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '测试文本', sceneGranularity: 'fine' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('Granularity: fine')
    })

    it('should default granularity to medium', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '测试文本' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('Granularity: medium')
    })

    it('should auto-detect zh language for Chinese text', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '李明走进了古寺。', language: 'auto' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('Chinese')
    })

    it('should auto-detect en language for English text', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: 'John walked into the temple.', language: 'auto' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.userMessage).toContain('English')
    })

    it('should throw error for empty text', async () => {
      await expect(analyzeNovel({ text: '' })).rejects.toThrow('Text is required')
    })

    it('should throw error for whitespace-only text', async () => {
      await expect(analyzeNovel({ text: '   ' })).rejects.toThrow('Text is required')
    })

    it('should throw error for text exceeding 10,000 characters', async () => {
      const longText = 'a'.repeat(10_001)
      await expect(analyzeNovel({ text: longText })).rejects.toThrow('10,000 characters')
    })

    it('should accept text at exactly 10,000 characters', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      const exactText = 'a'.repeat(10_000)
      const result = await analyzeNovel({ text: exactText })

      expect(result.characters).toBeDefined()
      expect(result.scenes).toBeDefined()
    })

    it('should return empty arrays when LLM returns invalid JSON', async () => {
      mock.mockAnalyze.mockResolvedValue('This is not JSON at all')

      const result = await analyzeNovel({ text: '测试文本' })

      expect(result.characters).toEqual([])
      expect(result.scenes).toEqual([])
    })

    it('should use temperature 0.3 for deterministic results', async () => {
      mock.mockAnalyze.mockResolvedValue(sampleLlmResponse)

      await analyzeNovel({ text: '测试文本' })

      const callArgs = mock.mockAnalyze.mock.calls[0][0]
      expect(callArgs.temperature).toBe(0.3)
    })
  })

  describe('detectLanguage', () => {
    it('should detect Chinese text', () => {
      expect(detectLanguage('你好世界')).toBe('zh')
    })

    it('should detect English text', () => {
      expect(detectLanguage('Hello world')).toBe('en')
    })

    it('should respect explicit zh hint', () => {
      expect(detectLanguage('Hello world', 'zh')).toBe('zh')
    })

    it('should respect explicit en hint', () => {
      expect(detectLanguage('你好世界', 'en')).toBe('en')
    })

    it('should auto-detect when hint is auto', () => {
      expect(detectLanguage('你好世界', 'auto')).toBe('zh')
      expect(detectLanguage('Hello world', 'auto')).toBe('en')
    })
  })

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"characters": [], "scenes": []}')
      expect(result).toEqual({ characters: [], scenes: [] })
    })

    it('should handle markdown code fences', () => {
      const input = '```json\n{"characters": [], "scenes": []}\n```'
      const result = safeJsonParse(input)
      expect(result).toEqual({ characters: [], scenes: [] })
    })

    it('should return empty structure for unparseable content', () => {
      const result = safeJsonParse('This is not JSON')
      expect(result).toEqual({ characters: [], scenes: [] })
    })

    it('should handle code fences without language tag', () => {
      const input = '```\n{"characters": [{"id":"a"}], "scenes": []}\n```'
      const result = safeJsonParse(input)
      expect(result.characters).toHaveLength(1)
    })
  })
})
