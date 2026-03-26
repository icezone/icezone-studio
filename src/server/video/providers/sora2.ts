import type { VideoProvider, VideoGenerateRequest, VideoJobPollResult } from '../types'
import {
  KIE_VIDEO_BASE_URL,
  getKieApiKey,
  uploadImageToKie,
  mapKieVideoStatus,
} from './kie-common'

// ---------------------------------------------------------------------------
// duration → n_frames mapping
// ---------------------------------------------------------------------------

const DURATION_TO_N_FRAMES: Record<number, number> = {
  10: 250,
  15: 375,
}

export function durationToNFrames(duration: number): number {
  const frames = DURATION_TO_N_FRAMES[duration]
  if (frames === undefined) {
    throw new Error(
      `Sora2 does not support duration ${duration}s. Supported: ${Object.keys(DURATION_TO_N_FRAMES).join(', ')}s`
    )
  }
  return frames
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface Sora2SubmitResponse {
  task_id?: string
  data?: { task_id?: string }
  code?: number
  msg?: string
}

interface Sora2PollResponse {
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
// Sora2 provider
// Model ID: 'sora2/sora-2-image-to-video'
// Durations: 10s / 15s (mapped to n_frames: 250 / 375)
// Aspect ratios: 16:9 / 9:16
// ---------------------------------------------------------------------------

export const sora2Provider: VideoProvider = {
  id: 'sora2',
  name: 'Sora2',

  async submitJob(request: VideoGenerateRequest): Promise<string> {
    const apiKey = getKieApiKey()
    const nFrames = durationToNFrames(request.duration)

    const body: Record<string, unknown> = {
      prompt: request.prompt,
      n_frames: nFrames,
      aspect_ratio: request.aspectRatio,
    }

    // Sora2 is image-to-video; upload reference image when provided
    if (request.imageUrl) {
      body.image_url = await uploadImageToKie(request.imageUrl)
    }

    const response = await fetch(`${KIE_VIDEO_BASE_URL}/v1/sora2/image-to-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Sora2 submit error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as Sora2SubmitResponse
    const taskId = data.task_id ?? data.data?.task_id
    if (!taskId) {
      throw new Error(`Sora2 submit returned no task_id: ${data.msg ?? 'unknown error'}`)
    }

    return taskId
  },

  async pollJob(providerJobId: string): Promise<VideoJobPollResult> {
    const apiKey = getKieApiKey()

    const response = await fetch(
      `${KIE_VIDEO_BASE_URL}/v1/sora2/task/${encodeURIComponent(providerJobId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Sora2 poll error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as Sora2PollResponse
    const rawStatus = data.status ?? data.state
    const status = mapKieVideoStatus(rawStatus)

    return {
      status,
      videoUrl: status === 'completed' ? data.video_url : undefined,
      coverImageUrl: status === 'completed' ? data.cover_image_url : undefined,
      errorMessage:
        status === 'failed'
          ? (data.error ?? data.msg ?? 'Sora2 generation failed')
          : undefined,
      progress: data.progress,
    }
  },
}
