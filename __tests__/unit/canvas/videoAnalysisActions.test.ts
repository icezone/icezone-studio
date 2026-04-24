import { describe, it, expect, vi } from 'vitest';
import type { CanvasNode, CanvasNodeData, VideoScene } from '@/features/canvas/domain/canvasNodes';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';
import {
  expandSelectedFramesToUploadNodes,
  createStoryboardFromSelection,
  type ExpandContext,
} from '@/features/canvas/nodes/videoAnalysisActions';

function makeScene(overrides: Partial<VideoScene> = {}): VideoScene {
  return {
    id: 'scene-1',
    startTimeMs: 0,
    endTimeMs: 1000,
    keyframeUrl: 'https://cdn.example/k1.jpg',
    previewUrl: undefined,
    confidence: 0.9,
    selected: true,
    ...overrides,
  };
}

function makeCtx(initialNodes: CanvasNode[] = []): {
  ctx: ExpandContext;
  added: Array<{ type: string; position: { x: number; y: number }; data?: Partial<CanvasNodeData> }>;
  edges: Array<{ sourceId: string; targetId: string }>;
} {
  const nodes: CanvasNode[] = [...initialNodes];
  const added: Array<{ type: string; position: { x: number; y: number }; data?: Partial<CanvasNodeData> }> = [];
  const edges: Array<{ sourceId: string; targetId: string }> = [];
  let seq = 0;

  const ctx: ExpandContext = {
    sourceNodeId: 'va-1',
    sourcePosition: { x: 100, y: 50 },
    sourceWidth: 560,
    addNode: (type, position, data) => {
      added.push({ type, position, data });
      seq += 1;
      nodes.push({
        id: `node-${seq}`,
        type,
        position,
        data: data as CanvasNodeData,
      } as CanvasNode);
    },
    addEdge: (sourceId, targetId) => {
      edges.push({ sourceId, targetId });
    },
    getNodes: () => nodes,
    t: (key: string) => key,
  };

  return { ctx, added, edges };
}

describe('expandSelectedFramesToUploadNodes', () => {
  it('creates one upload node per scene and an edge from the source to each', () => {
    const scenes = [
      makeScene({ id: 's1', startTimeMs: 0, keyframeUrl: 'k1' }),
      makeScene({ id: 's2', startTimeMs: 5000, keyframeUrl: 'k2' }),
    ];
    const { ctx, added, edges } = makeCtx();

    expandSelectedFramesToUploadNodes(scenes, ctx);

    expect(added).toHaveLength(2);
    expect(added.every((n) => n.type === CANVAS_NODE_TYPES.upload)).toBe(true);
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.sourceId === 'va-1')).toBe(true);
    expect(edges.map((e) => e.targetId)).toEqual(['node-1', 'node-2']);
  });

  it('populates upload node data from each scene (imageUrl + reversePrompt)', () => {
    const scenes = [
      makeScene({
        id: 's1',
        startTimeMs: 2000,
        keyframeUrl: 'https://cdn/k1.jpg',
        reversePrompt: { prompt: 'a cinematic shot', tags: [], confidence: 0.8 },
      }),
    ];
    const { ctx, added } = makeCtx();

    expandSelectedFramesToUploadNodes(scenes, ctx);

    expect(added).toHaveLength(1);
    const data = added[0].data as Record<string, unknown>;
    expect(data.imageUrl).toBe('https://cdn/k1.jpg');
    expect(data.reversePrompt).toBe('a cinematic shot');
    expect(data.sourceFileName).toBe('keyframe-0:02.jpg');
    expect(data.displayName).toBe('node.videoAnalysis.keyframe 0:02');
  });

  it('stacks new nodes vertically to the right of the source', () => {
    const scenes = [makeScene({ id: 's1' }), makeScene({ id: 's2' }), makeScene({ id: 's3' })];
    const { ctx, added } = makeCtx();

    expandSelectedFramesToUploadNodes(scenes, ctx);

    // sourcePosition.x (100) + sourceWidth (560) + SPACING_X (40) = 700
    expect(added.every((n) => n.position.x === 700)).toBe(true);
    expect(added[0].position.y).toBe(50);
    expect(added[1].position.y).toBe(270);
    expect(added[2].position.y).toBe(490);
  });

  it('skips scenes missing a keyframeUrl', () => {
    const scenes: VideoScene[] = [
      makeScene({ id: 's1', keyframeUrl: 'k1' }),
      makeScene({ id: 's2', keyframeUrl: '' }),
    ];
    const { ctx, added } = makeCtx();

    expandSelectedFramesToUploadNodes(scenes, ctx);

    expect(added).toHaveLength(1);
  });

  it('is a no-op when nothing is selected', () => {
    const { ctx, added, edges } = makeCtx();
    const addNodeSpy = vi.spyOn(ctx, 'addNode');

    expandSelectedFramesToUploadNodes([], ctx);

    expect(added).toHaveLength(0);
    expect(edges).toHaveLength(0);
    expect(addNodeSpy).not.toHaveBeenCalled();
  });
});

describe('createStoryboardFromSelection', () => {
  it('creates a single storyboardSplit node with one frame per selected scene', () => {
    const scenes = [
      makeScene({ id: 's1', startTimeMs: 0, keyframeUrl: 'k1' }),
      makeScene({ id: 's2', startTimeMs: 1000, keyframeUrl: 'k2' }),
      makeScene({ id: 's3', startTimeMs: 2000, keyframeUrl: 'k3' }),
    ];
    const { ctx, added, edges } = makeCtx();

    createStoryboardFromSelection(scenes, ctx);

    expect(added).toHaveLength(1);
    expect(added[0].type).toBe(CANVAS_NODE_TYPES.storyboardSplit);
    const data = added[0].data as Record<string, unknown>;
    const frames = data.frames as Array<{ id: string; imageUrl: string; order: number }>;
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.imageUrl)).toEqual(['k1', 'k2', 'k3']);
    expect(frames.map((f) => f.order)).toEqual([0, 1, 2]);
    expect(edges).toEqual([{ sourceId: 'va-1', targetId: 'node-1' }]);
  });

  it('derives grid dimensions from frame count', () => {
    const scenes = [
      makeScene({ id: 's1' }),
      makeScene({ id: 's2' }),
      makeScene({ id: 's3' }),
      makeScene({ id: 's4' }),
    ];
    const { ctx, added } = makeCtx();

    createStoryboardFromSelection(scenes, ctx);

    const data = added[0].data as Record<string, unknown>;
    expect(data.gridCols).toBe(2);
    expect(data.gridRows).toBe(2);
  });

  it('falls back to reverse-prompt text in each frame note, with timestamp fallback', () => {
    const scenes = [
      makeScene({
        id: 's1',
        startTimeMs: 3000,
        keyframeUrl: 'k1',
        reversePrompt: { prompt: 'vivid dream', tags: [], confidence: 0.7 },
      }),
      makeScene({ id: 's2', startTimeMs: 7000, keyframeUrl: 'k2' }),
    ];
    const { ctx, added } = makeCtx();

    createStoryboardFromSelection(scenes, ctx);

    const data = added[0].data as Record<string, unknown>;
    const frames = data.frames as Array<{ note: string }>;
    expect(frames[0].note).toBe('vivid dream');
    expect(frames[1].note).toBe('0:07');
  });

  it('is a no-op when nothing is selected', () => {
    const { ctx, added, edges } = makeCtx();

    createStoryboardFromSelection([], ctx);

    expect(added).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});
