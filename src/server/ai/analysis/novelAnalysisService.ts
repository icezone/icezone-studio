import { analyzeWithGemini } from './providers/geminiAnalysis'
import { novelAnalysisPrompt } from './prompts/novelAnalysis'
import type { NovelAnalysisParams, NovelAnalysisResult } from './types'

const MAX_TEXT_LENGTH = 10_000

/**
 * Analyze novel/script text to extract characters and segment scenes.
 * Uses Gemini LLM under the hood.
 */
export async function analyzeNovel(params: NovelAnalysisParams): Promise<NovelAnalysisResult> {
  // Validate input
  if (!params.text || params.text.trim().length === 0) {
    throw new Error('Text is required')
  }
  if (params.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH.toLocaleString('en-US')} characters`)
  }

  const maxScenes = params.maxScenes ?? 20
  const granularity = params.sceneGranularity ?? 'medium'

  // Auto-detect language
  const language = detectLanguage(params.text, params.language)

  // Call LLM
  const rawResult = await analyzeWithGemini({
    systemPrompt: novelAnalysisPrompt.system,
    userMessage: novelAnalysisPrompt.userTemplate(params.text, maxScenes, granularity, language),
    temperature: 0.3,
  })

  // Parse JSON robustly
  const parsed = safeJsonParse(rawResult)

  return {
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
  }
}

/**
 * Detect language from text content.
 * If 'auto' or unset, checks for CJK characters.
 */
export function detectLanguage(text: string, hint?: 'auto' | 'zh' | 'en'): 'zh' | 'en' {
  if (hint && hint !== 'auto') return hint
  // Check if text contains significant CJK characters
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en'
}

/**
 * Robustly parse JSON from LLM output.
 * Handles markdown code blocks and other common LLM quirks.
 */
export function safeJsonParse(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // no-op, try cleanup
  }

  // Strip markdown code fences
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Return empty structure as fallback
    return { characters: [], scenes: [] }
  }
}
