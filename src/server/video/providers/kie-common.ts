import type { VideoJobPollResult } from '../types'

export const KIE_VIDEO_BASE_URL = 'https://kieai.erp.mofasuan.com/api'

// -----------------------------------------------------------------------------
// API Key
// -----------------------------------------------------------------------------

export function getKieApiKey(): string {
  const key = process.env.KIE_API_KEY
  if (!key) throw new Error('KIE_API_KEY is not configured')
  return key
}

// -----------------------------------------------------------------------------
// Response type shapes
// -----------------------------------------------------------------------------

interface KieUploadUrlResponse {
  url?: string
  data?: { url?: string }
  code?: number
  msg?: string
}

interface KieUploadFileResponse {
  url?: string
  data?: { url?: string }
  code?: number
  msg?: string
}

interface KiePollResponse {
  status?: string          // 'pending' | 'processing' | 'succeed' | 'failed'
  state?: string           // alternate field name
  result?: string          // direct video URL
  output?: {
    video_url?: string
    cover_image_url?: string
    images?: Array<{ url: string }>
  }
  video_url?: string
  cover_image_url?: string
  progress?: number
  error?: string
  msg?: string
  code?: number
}

// -----------------------------------------------------------------------------
// Image upload
// -----------------------------------------------------------------------------

/**
 * Upload an image to KIE storage and return a hosted URL.
 * - http/https URLs: attempted via URL upload endpoint; falls back to direct URL.
 * - data: URI or raw base64: uploaded as multipart file.
 */
export async function uploadImageToKie(imageUrl: string): Promise<string> {
  const apiKey = getKieApiKey()

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const response = await fetch(`${KIE_VIDEO_BASE_URL}/upload/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url: imageUrl }),
    })
    if (response.ok) {
      const data = (await response.json()) as KieUploadUrlResponse
      const uploadedUrl = data.url ?? data.data?.url
      if (uploadedUrl) return uploadedUrl
    }
    // Fallback: KIE accepts direct URLs for many endpoints
    return imageUrl
  }

  // data: URI or raw base64
  let base64Data: string
  let mimeType = 'image/png'

  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) throw new Error('Invalid data URI format')
    mimeType = matches[1]
    base64Data = matches[2]
  } else {
    base64Data = imageUrl
  }

  const binaryData = Buffer.from(base64Data, 'base64')
  const ext = mimeType.split('/')[1] ?? 'png'
  const formData = new FormData()
  const blob = new Blob([binaryData], { type: mimeType })
  formData.append('file', blob, `image.${ext}`)

  const response = await fetch(`${KIE_VIDEO_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`KIE image upload failed ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as KieUploadFileResponse
  const uploadedUrl = data.url ?? data.data?.url
  if (!uploadedUrl) {
    throw new Error(`KIE image upload returned no URL: ${data.msg ?? 'unknown'}`)
  }
  return uploadedUrl
}

// -----------------------------------------------------------------------------
// Status mapping
// -----------------------------------------------------------------------------

export function mapKieVideoStatus(
  status: string | undefined
): VideoJobPollResult['status'] {
  switch (status) {
    case 'succeed':
    case 'succeeded':
    case 'completed':
      return 'completed'
    case 'failed':
    case 'error':
      return 'failed'
    case 'processing':
    case 'running':
    case 'in_progress':
      return 'processing'
    default:
      return 'pending'
  }
}

// -----------------------------------------------------------------------------
// Generic poll helper (used by providers that share the same task endpoint)
// -----------------------------------------------------------------------------

export async function pollKieJob(taskId: string): Promise<VideoJobPollResult> {
  const apiKey = getKieApiKey()

  const response = await fetch(
    `${KIE_VIDEO_BASE_URL}/v1/task/${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`KIE poll error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as KiePollResponse
  const rawStatus = data.status ?? data.state
  const status = mapKieVideoStatus(rawStatus)

  const videoUrl =
    status === 'completed'
      ? (data.video_url ?? data.result ?? data.output?.video_url)
      : undefined

  const coverImageUrl =
    status === 'completed' ? data.cover_image_url ?? data.output?.cover_image_url : undefined

  return {
    status,
    videoUrl,
    coverImageUrl,
    errorMessage:
      status === 'failed' ? (data.error ?? data.msg ?? 'Video generation failed') : undefined,
    progress: data.progress,
  }
}
