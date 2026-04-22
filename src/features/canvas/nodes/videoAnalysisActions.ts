import type { XYPosition } from '@xyflow/react';

import {
  CANVAS_NODE_TYPES,
  type CanvasNodeData,
  type StoryboardFrameItem,
  type VideoScene,
} from '@/features/canvas/domain/canvasNodes';
import type { CanvasNode } from '@/features/canvas/domain/canvasNodes';

export interface ExpandContext {
  sourceNodeId: string;
  sourcePosition: XYPosition;
  sourceWidth: number;
  addNode: (
    type: CanvasNode['type'],
    position: XYPosition,
    data?: Partial<CanvasNodeData>,
  ) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  getNodes: () => CanvasNode[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

const KEYFRAME_NODE_WIDTH = 320;
const KEYFRAME_NODE_SPACING_X = 40;
const KEYFRAME_NODE_SPACING_Y = 220;

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function expandSelectedFramesToUploadNodes(
  selectedScenes: VideoScene[],
  ctx: ExpandContext,
): void {
  const frames = selectedScenes.filter((s) => s.keyframeUrl);
  if (frames.length === 0) return;

  const baseX = ctx.sourcePosition.x + ctx.sourceWidth + KEYFRAME_NODE_SPACING_X;
  const baseY = ctx.sourcePosition.y;

  frames.forEach((scene, index) => {
    const position: XYPosition = {
      x: baseX,
      y: baseY + index * KEYFRAME_NODE_SPACING_Y,
    };

    const reverseText = scene.reversePrompt?.prompt ?? '';
    const label = `${ctx.t('node.videoAnalysis.keyframe')} ${formatTimestamp(scene.startTimeMs)}`;

    ctx.addNode(CANVAS_NODE_TYPES.upload, position, {
      displayName: label,
      imageUrl: scene.keyframeUrl,
      previewImageUrl: scene.previewUrl ?? scene.keyframeUrl,
      aspectRatio: '16:9',
      sourceFileName: `keyframe-${formatTimestamp(scene.startTimeMs)}.jpg`,
      reversePrompt: reverseText || undefined,
    } as Partial<CanvasNodeData>);

    const latest = ctx.getNodes();
    const newNode = latest[latest.length - 1];
    if (newNode) {
      ctx.addEdge(ctx.sourceNodeId, newNode.id);
    }
  });
}

export function createStoryboardFromSelection(
  selectedScenes: VideoScene[],
  ctx: ExpandContext,
): void {
  const frames = selectedScenes.filter((s) => s.keyframeUrl);
  if (frames.length === 0) return;

  const gridCols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(frames.length))));
  const gridRows = Math.max(1, Math.ceil(frames.length / gridCols));

  const storyboardFrames: StoryboardFrameItem[] = frames.map((scene, index) => ({
    id: `frame-${index}-${scene.id}`,
    imageUrl: scene.keyframeUrl,
    previewImageUrl: scene.previewUrl ?? scene.keyframeUrl,
    aspectRatio: '16:9',
    note: scene.reversePrompt?.prompt ?? `${formatTimestamp(scene.startTimeMs)}`,
    order: index,
  }));

  const position: XYPosition = {
    x: ctx.sourcePosition.x + ctx.sourceWidth + KEYFRAME_NODE_SPACING_X,
    y: ctx.sourcePosition.y,
  };

  ctx.addNode(CANVAS_NODE_TYPES.storyboardSplit, position, {
    displayName: ctx.t('node.videoAnalysis.storyboardFromVideo'),
    aspectRatio: '16:9',
    frameAspectRatio: '16:9',
    gridRows,
    gridCols,
    frames: storyboardFrames,
  } as Partial<CanvasNodeData>);

  const latest = ctx.getNodes();
  const newNode = latest[latest.length - 1];
  if (newNode) {
    ctx.addEdge(ctx.sourceNodeId, newNode.id);
  }
}
