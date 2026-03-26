import type { VideoProvider, VideoGenerateRequest, VideoJobPollResult } from '../types'
import {
  KIE_VIDEO_BASE_URL,
  getKieApiKey,
  uploadImageToKie,
  mapKieVideoStatus,
} from './kie-common'

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface KlingSubmitResponse {
  task_id?: string
  data?: { task_id?: string }
  code?: number
  msg?: string
}

interface KlingPollResponse {
  status?: string
  state?: string
  video_url?: string
  cover_image_url?: string
  progress?: number
  error?: string
  msg?: string
  code?: number
  data?: {
    task_id?: string
    task_status?: string
    task_info?: {
      image_url?: string
    }
    works?: Array<{
      video?: { resource?: string; cover_image_url?: string }
    }>
  }
}

// ---------------------------------------------------------------------------
// Kling 3.0 provider
// Model ID: 'kling/kling-3.0'
// Durations: 3s / 5s / 10s / 15s
// Aspect ratios: 16:9 / 9:16 / 1:1
// Extra params: mode, multi_shots, kling_elements
// ---------------------------------------------------------------------------

export const klingProvider: VideoProvider = {
  id: 'kling',
  name: 'Kling',

  async submitJob(request: VideoGenerateRequest): Promise<string> {
    const apiKey = getKieApiKey()

    const isImageToVideo = Boolean(request.imageUrl)
    const endpoint = isImageToVideo
      ? `${KIE_VIDEO_BASE_URL}/v1/kling/image-to-video`
      : `${KIE_VIDEO_BASE_URL}/v1/kling/text-to-video`

    const body: Record<string, unknown> = {
      model: 'kling-v3',
      prompt: request.prompt,
      duration: String(request.duration),
      aspect_ratio: request.aspectRatio,
    }

    if (request.seed !== undefined) {
      body.seed = request.seed
    }

    // Extra params from model definition
    const extra = request.extraParams ?? {}
    if (extra.mode) body.mode = extra.mode
    if (extra.multi_shots !== undefined) body.multi_shots = extra.multi_shots
    if (Array.isArray(extra.kling_elements) && extra.kling_elements.length > 0) {
      body.kling_elements = extra.kling_elements
    }

    // Upload reference image for image-to-video
    if (request.imageUrl) {
      body.image_url = await uploadImageToKie(request.imageUrl)
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Kling submit error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as KlingSubmitResponse
    const taskId = data.task_id ?? data.data?.task_id
    if (!taskId) {
      throw new Error(`Kling submit returned no task_id: ${data.msg ?? 'unknown error'}`)
    }

    return taskId
  },

  async pollJob(providerJobId: string): Promise<VideoJobPollResult> {
    const apiKey = getKieApiKey()

    const response = await fetch(
      `${KIE_VIDEO_BASE_URL}/v1/kling/task/${encodeURIComponent(providerJobId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Kling poll error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as KlingPollResponse

    // The Kling API may nest status inside `data`
    const rawStatus = data.status ?? data.state ?? data.data?.task_status
    const status = mapKieVideoStatus(rawStatus)

    // Extract video URL from various response shapes
    let videoUrl: string | undefined
    let coverImageUrl: string | undefined

    if (status === 'completed') {
      videoUrl =
        data.video_url ??
        data.data?.works?.[0]?.video?.resource

      coverImageUrl =
        data.cover_image_url ??
        data.data?.works?.[0]?.video?.cover_image_url
    }

    return {
      status,
      videoUrl,
      coverImageUrl,
      errorMessage:
        status === 'failed'
          ? (data.error ?? data.msg ?? 'Kling generation failed')
          : undefined,
      progress: data.progress,
    }
  },
}
