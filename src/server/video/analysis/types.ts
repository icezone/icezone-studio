/**
 * Server-side types for video analysis (scene detection + keyframe extraction).
 */

export interface VideoAnalyzeRequest {
  videoUrl: string;
  sensitivityThreshold?: number; // default 0.3
  minSceneDurationMs?: number; // default 500
  maxKeyframes?: number; // default 50
  projectId: string;
}

export interface VideoAnalyzeResponse {
  jobId: string;
}

export interface DetectedScene {
  startTimeMs: number;
  endTimeMs: number;
  keyframeTimestampMs: number;
  confidence: number;
}

export interface ExtractedKeyframe {
  timestampMs: number;
  /** Base64-encoded JPEG data (data URI or raw base64). */
  imageData: string;
}

export interface VideoAnalyzeResult {
  scenes: Array<{
    startTimeMs: number;
    endTimeMs: number;
    keyframeUrl: string;
    confidence: number;
  }>;
  totalDurationMs: number;
  fps: number;
}

export interface SceneDetectorOptions {
  sensitivityThreshold: number;
  minSceneDurationMs: number;
  maxKeyframes: number;
}

export const DEFAULT_SCENE_DETECTOR_OPTIONS: SceneDetectorOptions = {
  sensitivityThreshold: 0.3,
  minSceneDurationMs: 500,
  maxKeyframes: 50,
};

export function normalizeOptions(
  partial?: Partial<SceneDetectorOptions>
): SceneDetectorOptions {
  const defaults = DEFAULT_SCENE_DETECTOR_OPTIONS;
  return {
    sensitivityThreshold: clamp(
      partial?.sensitivityThreshold ?? defaults.sensitivityThreshold,
      0.1,
      1.0
    ),
    minSceneDurationMs: Math.max(
      partial?.minSceneDurationMs ?? defaults.minSceneDurationMs,
      100
    ),
    maxKeyframes: clamp(
      partial?.maxKeyframes ?? defaults.maxKeyframes,
      1,
      200
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
