import type { LlmAnalysisRequest, LlmMultimodalRequest, LlmVisionAnalysisRequest } from '../types'

export class GeminiKeyMissingError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not configured')
    this.name = 'GeminiKeyMissingError'
  }
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiKeyMissingError()
  }
  const model = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.0-flash'
  return { apiKey, model }
}

/**
 * Call Gemini API for text analysis.
 * Uses the generativelanguage.googleapis.com REST endpoint.
 */
export async function analyzeWithGemini(request: LlmAnalysisRequest): Promise<string> {
  const { apiKey, model } = getGeminiConfig()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userMessage }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.3,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini API returned no content')
  }

  return text
}

/**
 * Call Gemini API with multimodal input (text + image).
 * Used for reverse prompt generation (N2).
 */
export async function analyzeWithGeminiMultimodal(request: LlmMultimodalRequest): Promise<string> {
  const { apiKey, model } = getGeminiConfig()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // Build user parts: image (if provided) + text
  const userParts: Record<string, unknown>[] = []

  if (request.imageUrl) {
    const imageData = await resolveImageToBase64(request.imageUrl)
    userParts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    })
  }

  userParts.push({ text: request.userMessage })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.4,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini API returned no content')
  }

  return text
}

/**
 * Convert an image URL to a Gemini-compatible inline data part.
 * Supports data: URIs and http(s) URLs.
 */
async function imageUrlToPart(imageUrl: string): Promise<{ inlineData: { mimeType: string; data: string } }> {
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URL format')
    return { inlineData: { mimeType: match[1], data: match[2] } }
  }

  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const base64 = Buffer.from(buffer).toString('base64')
  return { inlineData: { mimeType: contentType, data: base64 } }
}

/**
 * Call Gemini API for vision (multimodal) analysis.
 * Used for shot analysis (N3).
 * Sends images alongside text for analysis.
 */
export async function analyzeVisionWithGemini(request: LlmVisionAnalysisRequest): Promise<string> {
  const { apiKey, model } = getGeminiConfig()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // Build parts: images first, then text
  const imageParts = await Promise.all(request.imageUrls.map(imageUrlToPart))
  const parts = [
    ...imageParts,
    { text: request.userMessage },
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.3,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini Vision API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini Vision API returned no content')
  }

  return text
}

/**
 * Resolve image URL to base64 data for Gemini inline_data.
 * Supports http(s) URLs and data: URIs.
 */
async function resolveImageToBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  // Handle data: URI
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      throw new Error('Invalid data URI format')
    }
    return { mimeType: match[1], base64: match[2] }
  }

  // Fetch remote image
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const mimeType = contentType.split(';')[0].trim()
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  return { mimeType, base64 }
}
