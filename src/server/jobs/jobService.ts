import { createClient } from '@/lib/supabase/server'

export class InsufficientCreditsError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient credits: required ${required}, available ${available}`)
    this.name = 'InsufficientCreditsError'
  }
}

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`)
    this.name = 'JobNotFoundError'
  }
}

interface CreateJobParams {
  userId: string
  projectId: string
  type: 'image' | 'video'
  providerId: string
  modelId: string
  creditCost: number
  providerJobId?: string
}

interface JobRecord {
  id: string
  user_id: string
  project_id: string
  provider_id: string
  model_id: string
  external_job_id: string | null
  status: string
  credits_held: number
  credits_consumed: number | null
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a new AI job and hold the required credits.
 * Throws InsufficientCreditsError if the user doesn't have enough credits.
 * Returns the new job's UUID.
 */
export async function createJob(params: CreateJobParams): Promise<string> {
  const {
    userId,
    projectId,
    type,
    providerId,
    modelId,
    creditCost,
    providerJobId,
  } = params

  const supabase = await createClient()

  // Check credit balance
  const { data: creditRow, error: creditError } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (creditError) {
    throw new Error(`Failed to query credits: ${creditError.message}`)
  }

  const balance = (creditRow as { balance: number } | null)?.balance ?? 0
  if (balance < creditCost) {
    throw new InsufficientCreditsError(creditCost, balance)
  }

  // Create job record
  const jobInsert: Record<string, unknown> = {
    user_id: userId,
    project_id: projectId,
    provider_id: providerId,
    model_id: modelId,
    status: 'pending',
    credits_held: creditCost,
  }
  if (providerJobId) {
    jobInsert.external_job_id = providerJobId
  }
  // type is stored in model_id context; schema uses provider_id/model_id
  void type // suppress unused warning — job type is inferred from model_id prefix

  const { data: job, error: jobError } = await supabase
    .from('ai_jobs')
    .insert(jobInsert)
    .select('id')
    .single()

  if (jobError || !job) {
    throw new Error(`Failed to create job: ${jobError?.message ?? 'unknown error'}`)
  }

  const jobId = (job as { id: string }).id

  // Debit credits (hold)
  const { error: ledgerError } = await supabase
    .from('credit_ledger')
    .insert({
      user_id: userId,
      amount: -creditCost,
      type: 'debit',
      job_id: jobId,
      idempotency_key: `debit:${jobId}`,
    })

  if (ledgerError) {
    // Rollback job creation
    await supabase.from('ai_jobs').delete().eq('id', jobId)
    throw new Error(`Failed to debit credits: ${ledgerError.message}`)
  }

  return jobId
}

interface UpdateJobParams {
  outputUrl?: string
  errorMessage?: string
}

/**
 * Update job status. On failure, refund the held credits.
 */
export async function updateJobStatus(
  jobId: string,
  status: string,
  result?: UpdateJobParams
): Promise<void> {
  const supabase = await createClient()

  // Fetch the job to get credits_held and user_id
  const { data: job, error: fetchError } = await supabase
    .from('ai_jobs')
    .select('id, user_id, credits_held, status')
    .eq('id', jobId)
    .single()

  if (fetchError || !job) {
    throw new JobNotFoundError(jobId)
  }

  const jobRow = job as { id: string; user_id: string; credits_held: number; status: string }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (result?.outputUrl) {
    updateData.result = { url: result.outputUrl }
  }
  if (result?.errorMessage) {
    updateData.error = result.errorMessage
  }

  const { error: updateError } = await supabase
    .from('ai_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (updateError) {
    throw new Error(`Failed to update job ${jobId}: ${updateError.message}`)
  }

  // If failed, issue a refund
  if (status === 'failed' && jobRow.credits_held > 0) {
    const { error: refundError } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: jobRow.user_id,
        amount: jobRow.credits_held,
        type: 'refund',
        job_id: jobId,
        idempotency_key: `refund:${jobId}`,
      })

    if (refundError) {
      // Log but don't throw — job status is already updated
      console.error(`Failed to refund credits for job ${jobId}: ${refundError.message}`)
    }
  }
}

/**
 * Get a job record, verifying it belongs to the given user.
 */
export async function getJob(jobId: string, userId: string): Promise<JobRecord> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new JobNotFoundError(jobId)
  }

  return data as JobRecord
}
