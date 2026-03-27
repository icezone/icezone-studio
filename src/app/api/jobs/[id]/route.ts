import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { getProvider } from '@/server/ai/registry'
import { getJob, updateJobStatus, JobNotFoundError } from '@/server/jobs/jobService'
import { getVideoProvider } from '@/server/video/registry'

// Ensure all providers are registered
import '@/server/ai/index'
import '@/server/video/index'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: jobId } = await params

  try {
    const job = await getJob(jobId, user.id)

    // If job is still pending/running, try to poll the provider
    if (job.status === 'pending' || job.status === 'running') {
      // Try video provider first, then image provider
      const videoProvider = getVideoProvider(job.provider_id)
      const imageProvider = getProvider(job.provider_id)

      if (videoProvider && job.external_job_id) {
        try {
          const pollResult = await videoProvider.pollJob(job.external_job_id)

          if (pollResult.status === 'completed') {
            await updateJobStatus(jobId, 'completed', { outputUrl: pollResult.videoUrl })

            // Register asset if video URL is available
            if (pollResult.videoUrl && job.project_id && job.project_id !== 'system') {
              await supabase
                .from('project_assets')
                .insert({
                  project_id: job.project_id,
                  type: 'video',
                  url: pollResult.videoUrl,
                  job_id: jobId,
                })
                .then(({ error }) => {
                  if (error) {
                    console.error('Failed to register video asset:', error.message)
                  }
                })
            }

            return NextResponse.json({
              status: 'completed',
              videoUrl: pollResult.videoUrl,
              coverImageUrl: pollResult.coverImageUrl,
            })
          } else if (pollResult.status === 'failed') {
            await updateJobStatus(jobId, 'failed', {
              errorMessage: pollResult.errorMessage,
            })
            return NextResponse.json({
              status: 'failed',
              errorMessage: pollResult.errorMessage,
            })
          } else {
            const mappedStatus = pollResult.status === 'processing' ? 'running' : job.status
            if (mappedStatus !== job.status) {
              await supabase
                .from('ai_jobs')
                .update({ status: mappedStatus, updated_at: new Date().toISOString() })
                .eq('id', jobId)
            }
            return NextResponse.json({
              status: pollResult.status,
              progress: pollResult.progress,
            })
          }
        } catch (pollError) {
          console.error(`Poll error for job ${jobId}:`, pollError)
        }
      } else if (imageProvider?.pollJob && job.external_job_id) {
        try {
          const pollResult = await imageProvider.pollJob(job.external_job_id)

          if (pollResult.status === 'completed') {
            await updateJobStatus(jobId, 'completed', { outputUrl: pollResult.imageUrl })
            return NextResponse.json({
              status: 'completed',
              imageUrl: pollResult.imageUrl,
            })
          } else if (pollResult.status === 'failed') {
            await updateJobStatus(jobId, 'failed', {
              errorMessage: pollResult.errorMessage,
            })
            return NextResponse.json({
              status: 'failed',
              errorMessage: pollResult.errorMessage,
            })
          } else {
            const mappedStatus = pollResult.status === 'processing' ? 'running' : job.status
            if (mappedStatus !== job.status) {
              await supabase
                .from('ai_jobs')
                .update({ status: mappedStatus, updated_at: new Date().toISOString() })
                .eq('id', jobId)
            }
            return NextResponse.json({
              status: pollResult.status,
              progress: pollResult.progress,
            })
          }
        } catch (pollError) {
          console.error(`Poll error for job ${jobId}:`, pollError)
        }
      }
    }

    // Return job status from DB
    const responseBody: Record<string, unknown> = {
      status: job.status,
    }

    if (job.result) {
      const result = job.result as { url?: string }
      if (result.url) {
        // Return output URL; imageUrl is kept for image jobs, videoUrl for video jobs
        responseBody.imageUrl = result.url
        responseBody.outputUrl = result.url
      }
    }

    if (job.error) {
      responseBody.errorMessage = job.error
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    if (
      error instanceof JobNotFoundError ||
      (error instanceof Error && error.name === 'JobNotFoundError')
    ) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    console.error('Job status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
