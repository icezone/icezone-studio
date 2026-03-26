export interface AIProvider {
  id: string
  name: string
  // Synchronous generation (returns image URL directly)
  generate?(request: AiGenerateRequest): Promise<AiGenerateResult>
  // Asynchronous generation (submits job, returns job ID)
  submitJob?(request: AiGenerateRequest): Promise<string>
  // Poll job status
  pollJob?(jobId: string): Promise<JobPollResult>
}

export interface AiGenerateRequest {
  modelId: string
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  aspectRatio?: string
  imageUrl?: string   // image-to-image
  steps?: number
  cfgScale?: number
  seed?: number
  extraParams?: Record<string, unknown>
}

export interface AiGenerateResult {
  imageUrl: string
  seed?: number
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface JobPollResult {
  status: JobStatus
  imageUrl?: string
  errorMessage?: string
  progress?: number
}
