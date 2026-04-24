import { describe, it, expect } from 'vitest';
import {
  normalizeOptions,
  DEFAULT_SCENE_DETECTOR_OPTIONS,
} from '@/server/video/analysis/types';
import { buildScenes } from '@/server/video/analysis/sceneDetector';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';
import { canvasNodeDefinitions } from '@/features/canvas/domain/nodeRegistry';

// ---------------------------------------------------------------------------
// normalizeOptions
// ---------------------------------------------------------------------------

describe('normalizeOptions', () => {
  it('should return defaults when no partial is provided', () => {
    const result = normalizeOptions();
    expect(result).toEqual(DEFAULT_SCENE_DETECTOR_OPTIONS);
  });

  it('should return defaults when empty partial is provided', () => {
    const result = normalizeOptions({});
    expect(result).toEqual(DEFAULT_SCENE_DETECTOR_OPTIONS);
  });

  it('should clamp sensitivityThreshold to [0.1, 1.0]', () => {
    expect(normalizeOptions({ sensitivityThreshold: 0 }).sensitivityThreshold).toBe(0.1);
    expect(normalizeOptions({ sensitivityThreshold: 2 }).sensitivityThreshold).toBe(1.0);
    expect(normalizeOptions({ sensitivityThreshold: 0.5 }).sensitivityThreshold).toBe(0.5);
  });

  it('should enforce minSceneDurationMs >= 100', () => {
    expect(normalizeOptions({ minSceneDurationMs: 10 }).minSceneDurationMs).toBe(100);
    expect(normalizeOptions({ minSceneDurationMs: 1000 }).minSceneDurationMs).toBe(1000);
  });

  it('should clamp maxKeyframes to [1, 200]', () => {
    expect(normalizeOptions({ maxKeyframes: 0 }).maxKeyframes).toBe(1);
    expect(normalizeOptions({ maxKeyframes: 500 }).maxKeyframes).toBe(200);
    expect(normalizeOptions({ maxKeyframes: 30 }).maxKeyframes).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// buildScenes
// ---------------------------------------------------------------------------

describe('buildScenes', () => {
  const defaultOpts = DEFAULT_SCENE_DETECTOR_OPTIONS;

  it('should return empty array when totalDurationMs is 0', () => {
    const result = buildScenes([], 0, defaultOpts);
    expect(result).toEqual([]);
  });

  it('should return a single scene when no raw timestamps provided', () => {
    const result = buildScenes([], 10000, defaultOpts);
    expect(result).toHaveLength(1);
    expect(result[0].startTimeMs).toBe(0);
    expect(result[0].endTimeMs).toBe(10000);
  });

  it('should split video into scenes at detected timestamps', () => {
    const rawTimestamps = [
      { timestampMs: 3000, score: 0.8 },
      { timestampMs: 7000, score: 0.6 },
    ];
    const result = buildScenes(rawTimestamps, 10000, defaultOpts);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ startTimeMs: 0, endTimeMs: 3000 });
    expect(result[1]).toMatchObject({ startTimeMs: 3000, endTimeMs: 7000 });
    expect(result[2]).toMatchObject({ startTimeMs: 7000, endTimeMs: 10000 });
  });

  it('should merge timestamps that are too close together', () => {
    const rawTimestamps = [
      { timestampMs: 1000, score: 0.5 },
      { timestampMs: 1200, score: 0.9 }, // within 500ms of previous
    ];
    const result = buildScenes(rawTimestamps, 5000, defaultOpts);

    // The two close timestamps should be merged (keeping higher confidence)
    expect(result).toHaveLength(2);
    // First scene starts at 0, second at the merged point
    expect(result[0].startTimeMs).toBe(0);
    expect(result[1].confidence).toBe(0.9);
  });

  it('should cap scenes at maxKeyframes', () => {
    // Create more timestamps than maxKeyframes
    const rawTimestamps = Array.from({ length: 10 }, (_, i) => ({
      timestampMs: (i + 1) * 1000,
      score: 0.5 + Math.random() * 0.5,
    }));
    const opts = { ...defaultOpts, maxKeyframes: 3 };
    const result = buildScenes(rawTimestamps, 15000, opts);

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('should assign keyframeTimestampMs within the scene interval', () => {
    const rawTimestamps = [{ timestampMs: 5000, score: 0.7 }];
    const result = buildScenes(rawTimestamps, 10000, defaultOpts);

    for (const scene of result) {
      expect(scene.keyframeTimestampMs).toBeGreaterThanOrEqual(scene.startTimeMs);
      expect(scene.keyframeTimestampMs).toBeLessThanOrEqual(scene.endTimeMs);
    }
  });

  it('should sort scenes by startTimeMs', () => {
    const rawTimestamps = [
      { timestampMs: 8000, score: 0.9 },
      { timestampMs: 2000, score: 0.7 },
      { timestampMs: 5000, score: 0.8 },
    ];
    const result = buildScenes(rawTimestamps, 10000, defaultOpts);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].startTimeMs).toBeGreaterThanOrEqual(result[i - 1].startTimeMs);
    }
  });

  it('should merge adjacent scenes shorter than minSceneDurationMs threshold', () => {
    // First cut at 300ms creates a 300ms scene (< 500ms threshold)
    // Second cut at 3500ms creates a 3200ms scene
    const rawTimestamps = [
      { timestampMs: 300, score: 0.4 },
      { timestampMs: 3500, score: 0.8 },
    ];
    const result = buildScenes(rawTimestamps, 10000, {
      ...defaultOpts,
      minSceneDurationMs: 500,
    });

    // The 300ms boundary should be merged into the previous scene
    // Expect 2 scenes: [0-3500) and [3500-10000)
    expect(result).toHaveLength(2);
    expect(result[0].startTimeMs).toBe(0);
    expect(result[0].endTimeMs).toBe(3500);
    expect(result[1].startTimeMs).toBe(3500);
    expect(result[1].endTimeMs).toBe(10000);
  });

  it('should use ffmpeg score as confidence (not hard-coded 1.0)', () => {
    const rawTimestamps = [
      { timestampMs: 2000, score: 0.42 },
      { timestampMs: 5000, score: 0.91 },
    ];
    const result = buildScenes(rawTimestamps, 8000, defaultOpts);

    // First scene confidence should come from the first boundary's score
    expect(result[0].confidence).toBeCloseTo(0.42, 2);
    // Second scene confidence from second boundary
    expect(result[1].confidence).toBeCloseTo(0.91, 2);
  });
});

// ---------------------------------------------------------------------------
// Node type registration
// ---------------------------------------------------------------------------

describe('VideoAnalysis node type registration', () => {
  it('should have videoAnalysis in CANVAS_NODE_TYPES', () => {
    expect(CANVAS_NODE_TYPES.videoAnalysis).toBe('videoAnalysisNode');
  });

  it('should have videoAnalysis definition in canvasNodeDefinitions', () => {
    const def = canvasNodeDefinitions['videoAnalysisNode'];
    expect(def).toBeDefined();
    expect(def.type).toBe('videoAnalysisNode');
    expect(def.visibleInMenu).toBe(true);
    expect(def.connectivity.sourceHandle).toBe(true);
    expect(def.connectivity.targetHandle).toBe(true);
  });

  it('should create valid default data', () => {
    const def = canvasNodeDefinitions['videoAnalysisNode'];
    const data = def.createDefaultData();

    expect(data.videoUrl).toBeNull();
    expect(data.sensitivityThreshold).toBe(0.3);
    expect(data.minSceneDurationMs).toBe(500);
    expect(data.maxKeyframes).toBe(50);
    expect(data.isAnalyzing).toBe(false);
    expect(data.scenes).toEqual([]);
  });
});
