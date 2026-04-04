import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { getVideoProvider } from '@/server/video/registry'
import { createJob, InsufficientCreditsError } from '@/server/jobs/jobService'
import { withKeyRotation } from '@/server/ai/keyRotationHelper'
import { AllKeysUnavailableError } from '@/server/ai/keyRotation'

// Ensure all video providers are registered
import '@/server/video/index'

/** Credits consumed per video generation (may be overridden via env). */
const VIDEO_CREDIT_COST = Number(process.env.VIDEO_CREDIT_COST ?? 100)

interface VideoGenerateBody {
  modelId?: unknown
  prompt?: unknown
  imageUrl?: unknown
  duration?: unknown
  aspectRatio?: unknown
  seed?: unknown
  audio?: unknown
  extraParams?: unknown
  projectId?: unknown
}

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse + validate request body
  let body: VideoGenerateBody
  try {
    body = (await request.json()) as VideoGenerateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { modelId, prompt, imageUrl, duration, aspectRatio, seed, audio, extraParams, projectId } =
    body

  if (typeof modelId !== 'string' || !modelId) {
    return NextResponse.json({ error: 'modelId is required' }, { status: 400 })
  }
  if (typeof prompt !== 'string' || !prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }
  if (typeof duration !== 'number') {
    return NextResponse.json({ error: 'duration (number) is required' }, { status: 400 })
  }
  if (typeof aspectRatio !== 'string' || !aspectRatio) {
    return NextResponse.json({ error: 'aspectRatio is required' }, { status: 400 })
  }

  // 3. Resolve provider from modelId prefix (e.g. 'kling/kling-3.0' → 'kling')
  const providerIdFromModel = modelId.split('/')[0]
  // Map model prefixes to provider IDs (veo3_fast uses 'veo_fast' as provider id)
  const providerIdMap: Record<string, string> = {
    kling: 'kling',
    sora2: 'sora2',
    veo: modelId === 'veo/veo3_fast' ? 'veo_fast' : 'veo',
  }
  const resolvedProviderId = providerIdMap[providerIdFromModel] ?? providerIdFromModel
  const provider = getVideoProvider(resolvedProviderId)

  if (!provider) {
    return NextResponse.json(
      { error: `No video provider found for model: ${modelId}` },
      { status: 400 }
    )
  }

  // 4. Resolve projectId (optional — jobs can exist without a project)
  const resolvedProjectId =
    typeof projectId === 'string' && projectId ? projectId : 'system'

  // 5. Create job + deduct credits
  let jobId: string
  try {
    jobId = await createJob({
      userId: user.id,
      projectId: resolvedProjectId,
      type: 'video',
      providerId: resolvedProviderId,
      modelId,
      creditCost: VIDEO_CREDIT_COST,
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 402 })
    }
    console.error('Failed to create video job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // 6. Submit to provider with key rotation
  // Resolve the API key provider ID for rotation (video providers may map to a different key provider)
  const keyProviderId = providerIdFromModel === 'kling' || providerIdFromModel === 'sora2' || providerIdFromModel === 'veo'
    ? 'kie'  // All KIE-based video providers share the 'kie' API key
    : resolvedProviderId

  try {
    const { result: providerJobId } = await withKeyRotation(
      supabase,
      user.id,
      keyProviderId,
      () => provider.submitJob({
        modelId,
        prompt: prompt as string,
        imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
        duration: duration as number,
        aspectRatio: aspectRatio as string,
        seed: typeof seed === 'number' ? seed : undefined,
        audio: typeof audio === 'boolean' ? audio : undefined,
        extraParams: extraParams && typeof extraParams === 'object'
          ? (extraParams as Record<string, unknown>)
          : undefined,
      })
    )

    // 7. Update job record with provider job ID
    await supabase
      .from('ai_jobs')
      .update({
        external_job_id: providerJobId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({ jobId }, { status: 202 })
  } catch (error) {
    if (error instanceof AllKeysUnavailableError) {
      // Update job to failed since all keys are unavailable
      const { updateJobStatus } = await import('@/server/jobs/jobService')
      await updateJobStatus(jobId, 'failed', {
        errorMessage: error.message,
      }).catch((e) => console.error('Failed to update failed job status:', e))

      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    // Provider submission failed — update job to failed (refund handled by updateJobStatus)
    console.error('Video provider submit error:', error)
    const { updateJobStatus } = await import('@/server/jobs/jobService')
    await updateJobStatus(jobId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Provider submission failed',
    }).catch((e) => console.error('Failed to update failed job status:', e))

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Provider submission failed' },
      { status: 502 }
    )
  }
}
