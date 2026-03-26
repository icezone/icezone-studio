'use client'

import type { VideoJobPollResult } from '@/server/video/types'

export interface VideoGenerateRequest {
  modelId: string
  prompt: string
  imageUrl?: string
  duration: number
  aspectRatio: string
  seed?: number
  audio?: boolean
  extraParams?: Record<string, unknown>
  projectId?: string
}

export class WebVideoGateway {
  /**
   * Submit a video generation job via the server API.
   * Returns the internal job ID (UUID) that can be used for polling.
   */
  async submitVideoJob(request: VideoGenerateRequest): Promise<string> {
    const res = await fetch('/api/ai/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      throw new Error(`Video job submission failed (${res.status}): ${errorText}`)
    }

    const { jobId } = (await res.json()) as { jobId: string }
    return jobId
  }

  /**
   * Poll the status of a video job.
   */
  async pollJobStatus(jobId: string): Promise<VideoJobPollResult> {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`)

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      throw new Error(`Job poll failed (${res.status}): ${errorText}`)
    }

    return res.json() as Promise<VideoJobPollResult>
  }
}
