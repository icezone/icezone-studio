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
  } catch (err) {
    // Re-throw ffmpeg errors instead of silently falling back
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ffmpeg scene detection failed: ${message}`);
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
        // The showinfo filter outputs "score:" not "scene:" in the debug line
        const scoreMatch = line.match(/score:([\d.]+)/);
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
    { timestampMs: 0, score: 1.0 },
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

  // Build scene intervals, merging short scenes into the previous one.
  const scenes: DetectedScene[] = [];
  for (let i = 0; i < merged.length; i++) {
    const start = merged[i].timestampMs;
    const end = i + 1 < merged.length ? merged[i + 1].timestampMs : totalDurationMs;
    const duration = end - start;

    // Use the score from the NEXT boundary (the change that ends this scene)
    // as the confidence for this scene, clamped to [0, 1]
    const nextBoundaryIndex = i + 1;
    const sceneScore = nextBoundaryIndex < merged.length
      ? merged[nextBoundaryIndex].score
      : merged[i].score;

    // If this scene is too short and we have a previous scene, extend the previous scene
    if (duration < options.minSceneDurationMs && i > 0 && scenes.length > 0) {
      // Extend the previous scene's end time to include this short segment
      const prev = scenes[scenes.length - 1];
      prev.endTimeMs = end;
      // Update keyframe to be in the middle of the extended scene
      const extendedDuration = prev.endTimeMs - prev.startTimeMs;
      prev.keyframeTimestampMs = prev.startTimeMs + Math.min(200, Math.round(extendedDuration / 3));
      // Keep the higher confidence
      prev.confidence = Math.max(prev.confidence, sceneScore);
      continue;
    }

    scenes.push({
      startTimeMs: start,
      endTimeMs: end,
      keyframeTimestampMs: start + Math.min(200, Math.round(duration / 3)),
      confidence: Math.min(1.0, Math.max(0.0, sceneScore)),
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

