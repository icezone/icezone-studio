import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { getProvider } from '@/server/ai/registry'
import { createJob } from '@/server/jobs/jobService'
import { InsufficientCreditsError } from '@/server/jobs/jobService'

// Ensure providers are registered
import '@/server/ai/index'

const DEFAULT_CREDIT_COST = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    modelId,
    prompt,
    negativePrompt,
    width,
    height,
    aspectRatio,
    imageUrl,
    steps,
    cfgScale,
    seed,
    extraParams,
    projectId,
    creditCost = DEFAULT_CREDIT_COST,
  } = body as Record<string, unknown>

  if (typeof modelId !== 'string' || !modelId) {
    return NextResponse.json({ error: 'modelId is required' }, { status: 400 })
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }
  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  // Determine provider from modelId prefix (e.g. "ppio/gemini-3.1-flash" -> "ppio")
  const providerId = modelId.includes('/') ? modelId.split('/')[0] : modelId
  const provider = getProvider(providerId)

  if (!provider) {
    return NextResponse.json(
      { error: `Unknown provider: ${providerId}` },
      { status: 400 }
    )
  }

  const generateRequest = {
    modelId: modelId as string,
    prompt: prompt as string,
    negativePrompt: negativePrompt as string | undefined,
    width: width as number | undefined,
    height: height as number | undefined,
    aspectRatio: aspectRatio as string | undefined,
    imageUrl: imageUrl as string | undefined,
    steps: steps as number | undefined,
    cfgScale: cfgScale as number | undefined,
    seed: seed as number | undefined,
    extraParams: extraParams as Record<string, unknown> | undefined,
  }

  try {
    // Synchronous provider path
    if (provider.generate) {
      // Check credits first
      const cost = typeof creditCost === 'number' ? creditCost : DEFAULT_CREDIT_COST
      const jobId = await createJob({
        userId: user.id,
        projectId: projectId as string,
        type: 'image',
        providerId,
        modelId: modelId as string,
        creditCost: cost,
      })

      try {
        const result = await provider.generate(generateRequest)
        await import('@/server/jobs/jobService').then(({ updateJobStatus }) =>
          updateJobStatus(jobId, 'completed', { outputUrl: result.imageUrl })
        )
        return NextResponse.json({ imageUrl: result.imageUrl, jobId })
      } catch (genError) {
        await import('@/server/jobs/jobService').then(({ updateJobStatus }) =>
          updateJobStatus(jobId, 'failed', {
            errorMessage: genError instanceof Error ? genError.message : 'Generation failed',
          })
        )
        throw genError
      }
    }

    // Asynchronous provider path
    if (provider.submitJob) {
      const cost = typeof creditCost === 'number' ? creditCost : DEFAULT_CREDIT_COST

      // Submit job to provider first to get external job ID
      const externalJobId = await provider.submitJob(generateRequest)

      const jobId = await createJob({
        userId: user.id,
        projectId: projectId as string,
        type: 'image',
        providerId,
        modelId: modelId as string,
        creditCost: cost,
        providerJobId: externalJobId,
      })

      return NextResponse.json({ jobId, status: 'pending' }, { status: 202 })
    }

    return NextResponse.json(
      { error: `Provider ${providerId} does not support image generation` },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof InsufficientCreditsError || (error instanceof Error && error.name === 'InsufficientCreditsError')) {
      return NextResponse.json({ error: (error as Error).message }, { status: 402 })
    }
    console.error('AI generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
