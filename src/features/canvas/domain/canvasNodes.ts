import type { Edge, Node, XYPosition } from '@xyflow/react';

export const CANVAS_NODE_TYPES = {
  upload: 'uploadNode',
  imageEdit: 'imageNode',
  exportImage: 'exportImageNode',
  textAnnotation: 'textAnnotationNode',
  group: 'groupNode',
  storyboardSplit: 'storyboardNode',
  storyboardGen: 'storyboardGenNode',
  videoGen: 'videoGenNode',
  videoResult: 'videoResultNode',
  novelInput: 'novelInputNode',
  videoAnalysis: 'videoAnalysisNode',
} as const;

export type CanvasNodeType = (typeof CANVAS_NODE_TYPES)[keyof typeof CANVAS_NODE_TYPES];

export const DEFAULT_ASPECT_RATIO = '1:1';
export const AUTO_REQUEST_ASPECT_RATIO = 'auto';
export const DEFAULT_NODE_WIDTH = 280;
export const EXPORT_RESULT_NODE_DEFAULT_WIDTH = 384;
export const EXPORT_RESULT_NODE_LAYOUT_HEIGHT = 288;
export const EXPORT_RESULT_NODE_MIN_WIDTH = 168;
export const EXPORT_RESULT_NODE_MIN_HEIGHT = 168;

export const IMAGE_SIZES = ['0.5K', '1K', '2K', '4K'] as const;
export const IMAGE_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '21:9',
] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number];

export interface NodeDisplayData {
  displayName?: string;
  [key: string]: unknown;
}

export interface NodeImageData extends NodeDisplayData {
  imageUrl: string | null;
  previewImageUrl?: string | null;
  aspectRatio: string;
  isSizeManuallyAdjusted?: boolean;
  [key: string]: unknown;
}

export interface UploadImageNodeData extends NodeImageData {
  sourceFileName?: string | null;
}

export type ExportImageNodeResultKind =
  | 'generic'
  | 'storyboardGenOutput'
  | 'storyboardSplitExport'
  | 'storyboardFrameEdit';

export interface ExportImageNodeData extends NodeImageData {
  resultKind?: ExportImageNodeResultKind;
}

export interface GroupNodeData extends NodeDisplayData {
  label: string;
  [key: string]: unknown;
}

export interface TextAnnotationNodeData extends NodeDisplayData {
  content: string;
  [key: string]: unknown;
}

export interface ImageEditNodeData extends NodeImageData {
  prompt: string;
  model: string;
  size: ImageSize;
  requestAspectRatio?: string;
  extraParams?: Record<string, unknown>;
  isGenerating?: boolean;
  generationStartedAt?: number | null;
  generationDurationMs?: number;
}

export interface StoryboardFrameItem {
  id: string;
  imageUrl: string | null;
  previewImageUrl?: string | null;
  aspectRatio?: string;
  note: string;
  order: number;
}

export interface StoryboardExportOptions {
  showFrameIndex: boolean;
  showFrameNote: boolean;
  notePlacement: 'overlay' | 'bottom';
  imageFit: 'cover' | 'contain';
  frameIndexPrefix: string;
  cellGap: number;
  outerPadding: number;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
}

export interface StoryboardSplitNodeData {
  displayName?: string;
  aspectRatio: string;
  frameAspectRatio?: string;
  gridRows: number;
  gridCols: number;
  frames: StoryboardFrameItem[];
  exportOptions?: StoryboardExportOptions;
  [key: string]: unknown;
}

export type StoryboardFrameMode = 'none' | 'reference' | 'strict';

export interface StoryboardGenFrameItem {
  id: string;
  description: string;
  referenceIndex: number | null;

  // Frame control
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
  startFrameMode?: StoryboardFrameMode;
  endFrameMode?: StoryboardFrameMode;

  // Multi-reference
  referenceImageUrls?: string[];
  referenceWeights?: number[]; // 0~1 for each reference
}

export function createDefaultStoryboardGenFrame(id?: string): StoryboardGenFrameItem {
  return {
    id: id ?? `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: '',
    referenceIndex: null,
    startFrameMode: 'none',
    endFrameMode: 'none',
  };
}

export type StoryboardRatioControlMode = 'overall' | 'cell';

export interface StoryboardGenNodeData {
  displayName?: string;
  gridRows: number;
  gridCols: number;
  frames: StoryboardGenFrameItem[];
  ratioControlMode?: StoryboardRatioControlMode;
  model: string;
  size: ImageSize;
  requestAspectRatio: string;
  extraParams?: Record<string, unknown>;
  imageUrl: string | null;
  previewImageUrl?: string | null;
  aspectRatio: string;
  isGenerating?: boolean;
  generationStartedAt?: number | null;
  generationDurationMs?: number;
  [key: string]: unknown;
}

export interface VideoGenNodeData extends NodeDisplayData {
  prompt: string;
  model: string;
  duration: number;
  aspectRatio: string;
  enableAudio: boolean;
  seed?: number | null;
  extraParams?: Record<string, unknown>;
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  referenceImageUrl?: string | null;
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
  isGenerating?: boolean;
  generationStartedAt?: number | null;
  generationDurationMs?: number;
  jobId?: string | null;
  errorMessage?: string | null;
}

export interface NovelCharacter {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
}

export interface NovelScene {
  id: string;
  order: number;
  title: string;
  summary: string;
  visualPrompt: string;
  characters: string[];
  location: string;
  mood: string;
  timeOfDay?: string;
  sourceTextRange?: { start: number; end: number };
  selected: boolean;
}

export interface NovelInputNodeData extends NodeDisplayData {
  text: string;
  textLength: number;
  language: 'auto' | 'zh' | 'en';
  maxScenes: number;
  sceneGranularity: 'coarse' | 'medium' | 'fine';
  isAnalyzing: boolean;
  errorMessage: string | null;
  characters: NovelCharacter[];
  scenes: NovelScene[];
}

export interface VideoScene {
  id: string;
  startTimeMs: number;
  endTimeMs: number;
  keyframeUrl: string;
  previewUrl?: string;
  confidence: number;
  selected: boolean;
}

export interface VideoAnalysisNodeData extends NodeDisplayData {
  // Input
  videoUrl: string | null;
  videoFileName?: string | null;

  // Analysis parameters
  sensitivityThreshold: number; // 0.1 ~ 1.0, default 0.3
  minSceneDurationMs: number; // min scene duration (ms), default 500
  maxKeyframes: number; // max keyframes, default 50

  // Analysis state
  isAnalyzing: boolean;
  analysisProgress: number; // 0 ~ 100
  errorMessage: string | null;

  // Analysis results
  scenes: VideoScene[];
}

export interface VideoResultNodeData extends NodeDisplayData {
  videoUrl: string;
  thumbnailUrl?: string | null;
  prompt?: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  enableAudio?: boolean;
  seed?: number | null;
  extraParams?: Record<string, unknown>;
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
}

export type CanvasNodeData =
  | UploadImageNodeData
  | ExportImageNodeData
  | TextAnnotationNodeData
  | GroupNodeData
  | ImageEditNodeData
  | StoryboardSplitNodeData
  | StoryboardGenNodeData
  | VideoGenNodeData
  | VideoResultNodeData
  | NovelInputNodeData
  | VideoAnalysisNodeData;

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;
export type CanvasEdge = Edge;

export interface NodeCreationDto {
  type: CanvasNodeType;
  position: XYPosition;
  data?: Partial<CanvasNodeData>;
}

export interface StoryboardNodeCreationDto {
  position: XYPosition;
  rows: number;
  cols: number;
  frames: StoryboardFrameItem[];
}

export const NODE_TOOL_TYPES = {
  crop: 'crop',
  annotate: 'annotate',
  splitStoryboard: 'split-storyboard',
} as const;

export type NodeToolType = (typeof NODE_TOOL_TYPES)[keyof typeof NODE_TOOL_TYPES];

export interface ActiveToolDialog {
  nodeId: string;
  toolType: NodeToolType;
}

export function isUploadNode(
  node: CanvasNode | null | undefined
): node is Node<UploadImageNodeData, typeof CANVAS_NODE_TYPES.upload> {
  return node?.type === CANVAS_NODE_TYPES.upload;
}

export function isImageEditNode(
  node: CanvasNode | null | undefined
): node is Node<ImageEditNodeData, typeof CANVAS_NODE_TYPES.imageEdit> {
  return node?.type === CANVAS_NODE_TYPES.imageEdit;
}

export function isExportImageNode(
  node: CanvasNode | null | undefined
): node is Node<ExportImageNodeData, typeof CANVAS_NODE_TYPES.exportImage> {
  return node?.type === CANVAS_NODE_TYPES.exportImage;
}

export function isGroupNode(
  node: CanvasNode | null | undefined
): node is Node<GroupNodeData, typeof CANVAS_NODE_TYPES.group> {
  return node?.type === CANVAS_NODE_TYPES.group;
}

export function isTextAnnotationNode(
  node: CanvasNode | null | undefined
): node is Node<TextAnnotationNodeData, typeof CANVAS_NODE_TYPES.textAnnotation> {
  return node?.type === CANVAS_NODE_TYPES.textAnnotation;
}

export function isStoryboardSplitNode(
  node: CanvasNode | null | undefined
): node is Node<StoryboardSplitNodeData, typeof CANVAS_NODE_TYPES.storyboardSplit> {
  return node?.type === CANVAS_NODE_TYPES.storyboardSplit;
}

export function isStoryboardGenNode(
  node: CanvasNode | null | undefined
): node is Node<StoryboardGenNodeData, typeof CANVAS_NODE_TYPES.storyboardGen> {
  return node?.type === CANVAS_NODE_TYPES.storyboardGen;
}

export function isNovelInputNode(
  node: CanvasNode | null | undefined
): node is Node<NovelInputNodeData, typeof CANVAS_NODE_TYPES.novelInput> {
  return node?.type === CANVAS_NODE_TYPES.novelInput;
}

export function isVideoAnalysisNode(
  node: CanvasNode | null | undefined
): node is Node<VideoAnalysisNodeData, typeof CANVAS_NODE_TYPES.videoAnalysis> {
  return node?.type === CANVAS_NODE_TYPES.videoAnalysis;
}

export function isVideoGenNode(
  node: CanvasNode | null | undefined
): node is Node<VideoGenNodeData, typeof CANVAS_NODE_TYPES.videoGen> {
  return node?.type === CANVAS_NODE_TYPES.videoGen;
}

export function nodeHasImage(node: CanvasNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (isUploadNode(node) || isImageEditNode(node) || isExportImageNode(node)) {
    return Boolean(node.data.imageUrl);
  }

  if (isStoryboardSplitNode(node)) {
    return node.data.frames.some((frame) => Boolean(frame.imageUrl));
  }

  if (isStoryboardGenNode(node)) {
    return Boolean(node.data.imageUrl);
  }

  return false;
}
