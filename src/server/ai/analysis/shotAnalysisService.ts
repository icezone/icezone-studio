import { analyzeVisionWithGemini } from './providers/geminiAnalysis'
import { shotAnalysisPrompt } from './prompts/shotAnalysis'
import { safeJsonParse } from './novelAnalysisService'
import type { ShotAnalysisParams, ShotAnalysisResult } from './types'

const MAX_ADDITIONAL_FRAMES = 8

/**
 * Analyze a shot (image or multi-frame) for professional cinematography attributes.
 * Uses Gemini Vision (multimodal) under the hood.
 */
export async function analyzeShot(params: ShotAnalysisParams): Promise<ShotAnalysisResult> {
  if (!params.imageUrl) {
    throw new Error('imageUrl is required')
  }

  const allImageUrls = [params.imageUrl]
  if (params.additionalFrameUrls && params.additionalFrameUrls.length > 0) {
    const additional = params.additionalFrameUrls.slice(0, MAX_ADDITIONAL_FRAMES)
    allImageUrls.push(...additional)
  }

  const language = params.language || 'en'
  const hasMultipleFrames = allImageUrls.length > 1

  const rawResult = await analyzeVisionWithGemini({
    systemPrompt: shotAnalysisPrompt.system,
    imageUrls: allImageUrls,
    userMessage: shotAnalysisPrompt.userTemplate(language, hasMultipleFrames),
    temperature: 0.3,
  })

  const parsed = safeJsonParse(rawResult)

  return normalizeShotResult(parsed)
}

/**
 * Normalize LLM output to a well-typed ShotAnalysisResult.
 * Provides sensible defaults for any missing fields.
 */
function normalizeShotResult(raw: Record<string, unknown>): ShotAnalysisResult {
  return {
    shotType: asString(raw.shotType, 'Unknown'),
    shotTypeConfidence: asNumber(raw.shotTypeConfidence, 0.5),
    cameraMovement: asString(raw.cameraMovement, 'Static'),
    movementDescription: asString(raw.movementDescription, ''),
    subject: asString(raw.subject, ''),
    subjectAction: asString(raw.subjectAction, ''),
    lightingType: asString(raw.lightingType, ''),
    lightingMood: asString(raw.lightingMood, ''),
    colorPalette: asStringArray(raw.colorPalette, []),
    mood: asString(raw.mood, ''),
    composition: asString(raw.composition, ''),
    directorNote: asString(raw.directorNote, ''),
  }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.min(1, value))
  }
  return fallback
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return fallback
}
