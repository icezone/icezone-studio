export interface VideoProvider {
  id: string
  name: string
  /** Submit a video generation job; returns the provider's job ID */
  submitJob(request: VideoGenerateRequest): Promise<string>
  /** Poll the status of a previously submitted job */
  pollJob(providerJobId: string): Promise<VideoJobPollResult>
}

export interface VideoGenerateRequest {
  modelId: string
  prompt: string
  imageUrl?: string       // image-to-video
  duration: number        // seconds
  aspectRatio: string     // '16:9' | '9:16' | '1:1'
  seed?: number
  audio?: boolean
  extraParams?: Record<string, unknown>
}

export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoJobPollResult {
  status: VideoJobStatus
  videoUrl?: string
  coverImageUrl?: string
  errorMessage?: string
  progress?: number
}
