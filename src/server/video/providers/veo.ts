import type { VideoProvider, VideoGenerateRequest, VideoJobPollResult } from '../types'
import {
  KIE_VIDEO_BASE_URL,
  getKieApiKey,
  uploadImageToKie,
  mapKieVideoStatus,
} from './kie-common'

// ---------------------------------------------------------------------------
// Seed clamping
// ---------------------------------------------------------------------------

export const VEO_SEED_MIN = 10000
export const VEO_SEED_MAX = 99999

export function clampVeoSeed(seed: number): number {
  return Math.min(VEO_SEED_MAX, Math.max(VEO_SEED_MIN, seed))
}

// ---------------------------------------------------------------------------
// Endpoint mapping
// ---------------------------------------------------------------------------

const VEO_ENDPOINTS: Record<string, string> = {
  'veo/veo3': `${KIE_VIDEO_BASE_URL}/v1/veo3/image-to-video`,
  'veo/veo3_fast': `${KIE_VIDEO_BASE_URL}/v1/veo3-fast/image-to-video`,
}

export function getVeoEndpoint(modelId: string): string {
  const endpoint = VEO_ENDPOINTS[modelId]
  if (!endpoint) {
    throw new Error(`Unknown Veo model ID: ${modelId}`)
  }
  return endpoint
}

// Poll endpoint per model
const VEO_POLL_PREFIXES: Record<string, string> = {
  'veo/veo3': `${KIE_VIDEO_BASE_URL}/v1/veo3/task`,
  'veo/veo3_fast': `${KIE_VIDEO_BASE_URL}/v1/veo3-fast/task`,
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface VeoSubmitResponse {
  task_id?: string
  data?: { task_id?: string }
  code?: number
  msg?: string
}

interface VeoPollResponse {
  status?: string
  state?: string
  video_url?: string
  cover_image_url?: string
  progress?: number
  error?: string
  msg?: string
  code?: number
}

// ---------------------------------------------------------------------------
// Factory: create a Veo provider for a given model
// ---------------------------------------------------------------------------

function createVeoProvider(modelId: 'veo/veo3' | 'veo/veo3_fast'): VideoProvider {
  const providerId = modelId === 'veo/veo3' ? 'veo' : 'veo_fast'
  const submitEndpoint = VEO_ENDPOINTS[modelId]
  const pollPrefix = VEO_POLL_PREFIXES[modelId]

  return {
    id: providerId,
    name: modelId === 'veo/veo3' ? 'Veo 3.1' : 'Veo 3.1 Fast',

    async submitJob(request: VideoGenerateRequest): Promise<string> {
      const apiKey = getKieApiKey()

      const body: Record<string, unknown> = {
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio,
      }

      // Clamp seed to valid Veo range
      if (request.seed !== undefined) {
        body.seed = clampVeoSeed(request.seed)
      }

      if (request.imageUrl) {
        body.image_url = await uploadImageToKie(request.imageUrl)
      }

      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Veo submit error ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as VeoSubmitResponse
      const taskId = data.task_id ?? data.data?.task_id
      if (!taskId) {
        throw new Error(`Veo submit returned no task_id: ${data.msg ?? 'unknown error'}`)
      }

      return taskId
    },

    async pollJob(providerJobId: string): Promise<VideoJobPollResult> {
      const apiKey = getKieApiKey()

      const response = await fetch(
        `${pollPrefix}/${encodeURIComponent(providerJobId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Veo poll error ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as VeoPollResponse
      const rawStatus = data.status ?? data.state
      const status = mapKieVideoStatus(rawStatus)

      return {
        status,
        videoUrl: status === 'completed' ? data.video_url : undefined,
        coverImageUrl: status === 'completed' ? data.cover_image_url : undefined,
        errorMessage:
          status === 'failed'
            ? (data.error ?? data.msg ?? 'Veo generation failed')
            : undefined,
        progress: data.progress,
      }
    },
  }
}

export const veoProvider = createVeoProvider('veo/veo3')
export const veoFastProvider = createVeoProvider('veo/veo3_fast')
