import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/server/ai/registry'
import { updateJobStatus } from './jobService'

interface PendingJob {
  id: string
  provider_id: string
  external_job_id: string | null
  status: string
}

/**
 * Poll all pending/processing AI jobs and update their status.
 * Intended to be called from a cron endpoint or background worker.
 */
export async function pollPendingJobs(): Promise<void> {
  const supabase = await createClient()

  // Fetch jobs that need polling
  const { data: jobs, error } = await supabase
    .from('ai_jobs')
    .select('id, provider_id, external_job_id, status')
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    throw new Error(`Failed to query pending jobs: ${error.message}`)
  }

  if (!jobs || jobs.length === 0) {
    return
  }

  // Process each job
  await Promise.allSettled(
    (jobs as PendingJob[]).map(async (job) => {
      try {
        await pollSingleJob(job)
      } catch (err) {
        console.error(`Error polling job ${job.id}:`, err)
      }
    })
  )
}

async function pollSingleJob(job: PendingJob): Promise<void> {
  const provider = getProvider(job.provider_id)

  if (!provider) {
    console.warn(`No provider found for job ${job.id} (provider: ${job.provider_id})`)
    return
  }

  if (!provider.pollJob) {
    // Synchronous provider — jobs should not be in pending state
    console.warn(`Provider ${job.provider_id} does not support polling (job: ${job.id})`)
    return
  }

  if (!job.external_job_id) {
    console.warn(`Job ${job.id} has no external_job_id, cannot poll`)
    return
  }

  const pollResult = await provider.pollJob(job.external_job_id)

  switch (pollResult.status) {
    case 'completed':
      await updateJobStatus(job.id, 'completed', {
        outputUrl: pollResult.imageUrl,
      })
      break

    case 'failed':
      await updateJobStatus(job.id, 'failed', {
        errorMessage: pollResult.errorMessage ?? 'Provider reported failure',
      })
      break

    case 'processing':
      // Update to running if still processing
      if (job.status !== 'running') {
        const supabase = await createClient()
        await supabase
          .from('ai_jobs')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', job.id)
      }
      break

    case 'pending':
    default:
      // Still in queue, no update needed
      break
  }
}
