/**
 * Scene detection engine.
 *
 * Analyses a video file to find scene-change boundaries.
 * Uses ffmpeg scene-change filter via fluent-ffmpeg when available,
 * falling back to a timestamp-based stub for environments without ffmpeg.
 */

import {
  type DetectedScene,
  type SceneDetectorOptions,
  normalizeOptions,
} from './types';

/**
 * Detect scene changes in a video.
 *
 * @param videoPath - Local file path or HTTP URL of the video.
 * @param partialOptions - Detection tuning parameters.
 * @returns Sorted array of detected scenes.
 */
export async function detectScenes(
  videoPath: string,
  partialOptions?: Partial<SceneDetectorOptions>
): Promise<DetectedScene[]> {
  const options = normalizeOptions(partialOptions);

  try {
    return await detectScenesWithFfmpeg(videoPath, options);
  } catch {
    // ffmpeg unavailable — return a single-scene fallback so the pipeline
    // can still progress (e.g. in dev/testing without ffmpeg installed).
    return fallbackSingleScene(options);
  }
}

// ---------------------------------------------------------------------------
// ffmpeg-based detection
// ---------------------------------------------------------------------------

async function detectScenesWithFfmpeg(
  videoPath: string,
  options: SceneDetectorOptions
): Promise<DetectedScene[]> {
  // Dynamic import so the module is optional at runtime.
  const ffmpeg = await import('fluent-ffmpeg').then((m) => m.default ?? m);

  const rawSceneTimestamps = await extractSceneTimestamps(
    ffmpeg,
    videoPath,
    options.sensitivityThreshold
  );

  const durationMs = await getVideoDurationMs(ffmpeg, videoPath);

  return buildScenes(rawSceneTimestamps, durationMs, options);
}

/**
 * Run ffmpeg scene-change filter and collect timestamps where score exceeds
 * the sensitivity threshold.
 */
function extractSceneTimestamps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffmpeg: any,
  videoPath: string,
  threshold: number
): Promise<Array<{ timestampMs: number; score: number }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{ timestampMs: number; score: number }> = [];

    const command = ffmpeg(videoPath)
      .videoFilters([
        `select='gt(scene\,${threshold})'`,
        'showinfo',
      ])
      .outputOptions('-f', 'null')
      .output(process.platform === 'win32' ? 'NUL' : '/dev/null');

    command.on('stderr', (line: string) => {
      const ptsTimeMatch = line.match(/pts_time:([\d.]+)/);
      if (ptsTimeMatch) {
        const seconds = parseFloat(ptsTimeMatch[1]);
        const timestampMs = Math.round(seconds * 1000);
        const scoreMatch = line.match(/scene:([\d.]+)/);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : threshold;
        results.push({ timestampMs, score });
      }
    });

    command.on('error', (err: Error) => {
      reject(err);
    });

    command.on('end', () => {
      resolve(results);
    });

    command.run();
  });
}

function getVideoDurationMs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffmpeg: any,
  videoPath: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: Record<string, unknown>) => {
      if (err) return reject(err);
      const format = metadata.format as Record<string, unknown> | undefined;
      const duration = typeof format?.duration === 'number' ? format.duration : 0;
      resolve(Math.round(duration * 1000));
    });
  });
}

// ---------------------------------------------------------------------------
// Scene building from raw timestamps
// ---------------------------------------------------------------------------

export function buildScenes(
  rawTimestamps: Array<{ timestampMs: number; score: number }>,
  totalDurationMs: number,
  options: SceneDetectorOptions
): DetectedScene[] {
  if (totalDurationMs <= 0) return [];

  // Always include time 0 as the first scene boundary.
  const boundaries = [
    { timestampMs: 0, score: 1 },
    ...rawTimestamps.filter((t) => t.timestampMs > 0),
  ];

  // Sort by timestamp.
  boundaries.sort((a, b) => a.timestampMs - b.timestampMs);

  // Merge boundaries that are too close together.
  const merged: typeof boundaries = [];
  for (const b of boundaries) {
    const last = merged[merged.length - 1];
    if (last && b.timestampMs - last.timestampMs < options.minSceneDurationMs) {
      // Keep the one with higher confidence.
      if (b.score > last.score) {
        merged[merged.length - 1] = b;
      }
      continue;
    }
    merged.push(b);
  }

  // Build scene intervals.
  const scenes: DetectedScene[] = [];
  for (let i = 0; i < merged.length; i++) {
    const start = merged[i].timestampMs;
    const end = i + 1 < merged.length ? merged[i + 1].timestampMs : totalDurationMs;

    if (end - start < options.minSceneDurationMs && i > 0) continue;

    scenes.push({
      startTimeMs: start,
      endTimeMs: end,
      keyframeTimestampMs: start + Math.min(200, Math.round((end - start) / 2)),
      confidence: merged[i].score,
    });
  }

  // Cap at maxKeyframes.
  if (scenes.length > options.maxKeyframes) {
    // Keep scenes with highest confidence.
    scenes.sort((a, b) => b.confidence - a.confidence);
    scenes.length = options.maxKeyframes;
    scenes.sort((a, b) => a.startTimeMs - b.startTimeMs);
  }

  return scenes;
}

// ---------------------------------------------------------------------------
// Fallback for environments without ffmpeg
// ---------------------------------------------------------------------------

function fallbackSingleScene(options: SceneDetectorOptions): DetectedScene[] {
  return [
    {
      startTimeMs: 0,
      endTimeMs: options.minSceneDurationMs,
      keyframeTimestampMs: 0,
      confidence: 1,
    },
  ];
}
