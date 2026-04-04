import type { StoryboardGenFrameItem } from '../domain/canvasNodes';
import type { GenerateImagePayload } from './ports';

/**
 * Context for batch generation, shared across all frames.
 */
export interface BatchGenerateContext {
  model: string;
  requestModel: string;
  size: string;
  aspectRatio: string;
  extraParams?: Record<string, unknown>;
}

/**
 * State for a single batch job after submission.
 */
export interface BatchJobState {
  frameId: string;
  jobId: string | null;
  error: string | null;
}

/**
 * Result of polling a single batch job.
 */
export interface BatchPollResult {
  frameId: string;
  jobId: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';
  result?: string | null;
  error: string | null;
}

/**
 * Progress tracking for batch generation.
 */
export interface BatchProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  inProgress: Set<string>;
}

export function createInitialBatchProgress(total: number): BatchProgress {
  return {
    total,
    completed: 0,
    succeeded: 0,
    failed: 0,
    inProgress: new Set(),
  };
}

/**
 * Submit all frames' generation jobs in parallel.
 * Uses Promise.allSettled to ensure partial failures don't block other frames.
 */
export async function submitBatchJobs(
  frames: StoryboardGenFrameItem[],
  context: BatchGenerateContext,
  submitFn: (payload: GenerateImagePayload) => Promise<string>
): Promise<BatchJobState[]> {
  const promises = frames.map(async (frame): Promise<BatchJobState> => {
    try {
      const payload: GenerateImagePayload = {
        prompt: frame.description,
        model: context.requestModel,
        size: context.size,
        aspectRatio: context.aspectRatio,
        referenceImages: frame.referenceImageUrls,
        extraParams: {
          ...(context.extraParams ?? {}),
          ...(frame.startFrameUrl ? { startFrame: frame.startFrameUrl } : {}),
          ...(frame.endFrameUrl ? { endFrame: frame.endFrameUrl } : {}),
          ...(frame.startFrameMode && frame.startFrameMode !== 'none'
            ? { startFrameMode: frame.startFrameMode }
            : {}),
          ...(frame.endFrameMode && frame.endFrameMode !== 'none'
            ? { endFrameMode: frame.endFrameMode }
            : {}),
          ...(frame.referenceWeights && frame.referenceWeights.length > 0
            ? { referenceWeights: frame.referenceWeights }
            : {}),
        },
      };
      const jobId = await submitFn(payload);
      return { frameId: frame.id, jobId, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { frameId: frame.id, jobId: null, error: message };
    }
  });

  return Promise.all(promises);
}

type PollJobResult = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';
  result?: string | null;
  error?: string | null;
};

/**
 * Poll all batch job statuses in parallel.
 * Skips jobs that failed during submission (no jobId).
 */
export async function pollBatchJobs(
  jobs: BatchJobState[],
  pollFn: (jobId: string) => Promise<PollJobResult>
): Promise<BatchPollResult[]> {
  const promises = jobs.map(async (job): Promise<BatchPollResult> => {
    // If job failed during submission, return failure immediately
    if (!job.jobId) {
      return {
        frameId: job.frameId,
        jobId: null,
        status: 'failed',
        result: null,
        error: job.error ?? 'No job ID',
      };
    }

    try {
      const pollResult = await pollFn(job.jobId);
      return {
        frameId: job.frameId,
        jobId: job.jobId,
        status: pollResult.status,
        result: pollResult.result ?? null,
        error: pollResult.error ?? null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        frameId: job.frameId,
        jobId: job.jobId,
        status: 'failed',
        result: null,
        error: message,
      };
    }
  });

  return Promise.all(promises);
}
