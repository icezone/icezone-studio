import { NextRequest, NextResponse } from 'next/server';
import { detectScenes } from '@/server/video/analysis/sceneDetector';
import { extractKeyframes } from '@/server/video/analysis/frameExtractor';
import { normalizeOptions } from '@/server/video/analysis/types';

/**
 * POST /api/video/analyze
 *
 * Accepts a video URL and analysis parameters, runs scene detection
 * and keyframe extraction, and returns the results synchronously.
 *
 * For production use with large videos, this should be converted to an
 * async job pattern. The current implementation is synchronous for
 * simplicity in the initial version.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const videoUrl = body.videoUrl;
    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json(
        { error: 'videoUrl is required and must be a string' },
        { status: 400 }
      );
    }

    const projectId = body.projectId;
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required and must be a string' },
        { status: 400 }
      );
    }

    const options = normalizeOptions({
      sensitivityThreshold: typeof body.sensitivityThreshold === 'number'
        ? body.sensitivityThreshold
        : undefined,
      minSceneDurationMs: typeof body.minSceneDurationMs === 'number'
        ? body.minSceneDurationMs
        : undefined,
      maxKeyframes: typeof body.maxKeyframes === 'number'
        ? body.maxKeyframes
        : undefined,
    });

    // Detect scenes
    const detectedScenes = await detectScenes(videoUrl, options);

    // Extract keyframes at detected timestamps
    const timestamps = detectedScenes.map((s) => s.keyframeTimestampMs);
    const keyframes = await extractKeyframes(videoUrl, timestamps);

    // Build keyframe URL map for quick lookup
    const keyframeMap = new Map(
      keyframes.map((kf) => [kf.timestampMs, kf.imageData])
    );

    // Build response
    const scenes = detectedScenes.map((scene) => ({
      startTimeMs: scene.startTimeMs,
      endTimeMs: scene.endTimeMs,
      keyframeUrl: keyframeMap.get(scene.keyframeTimestampMs) ?? '',
      confidence: scene.confidence,
    }));

    return NextResponse.json({
      scenes,
      totalDurationMs: detectedScenes.length > 0
        ? detectedScenes[detectedScenes.length - 1].endTimeMs
        : 0,
      fps: 0, // Would need ffprobe for accurate FPS
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video analysis failed';
    console.error('[POST /api/video/analyze] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
