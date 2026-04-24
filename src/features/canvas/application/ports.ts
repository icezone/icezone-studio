import type { XYPosition } from '@xyflow/react';

import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
  CanvasNodeType,
  NodeToolType,
  StoryboardFrameItem,
} from '../domain/canvasNodes';
import type { CanvasNodeDefinition } from '../domain/nodeRegistry';

export interface IdGenerator {
  next: () => string;
}

export interface NodeCatalog {
  getDefinition: (type: CanvasNodeType) => CanvasNodeDefinition;
  getMenuDefinitions: () => CanvasNodeDefinition[];
}

export interface NodeFactory {
  createNode: (
    type: CanvasNodeType,
    position: XYPosition,
    data?: Partial<CanvasNodeData>
  ) => CanvasNode;
}

export interface GraphImageResolver {
  collectInputImages: (nodeId: string, nodes: CanvasNode[], edges: CanvasEdge[]) => string[];
}

export interface GenerateImagePayload {
  prompt: string;
  model: string;
  size: string;
  aspectRatio: string;
  referenceImages?: string[];
  extraParams?: Record<string, unknown>;
}

export interface AiGateway {
  setApiKey: (provider: string, apiKey: string) => Promise<void>;
  generateImage: (payload: GenerateImagePayload) => Promise<string>;
  submitGenerateImageJob: (payload: GenerateImagePayload) => Promise<string>;
  getGenerateImageJob: (jobId: string) => Promise<{
    job_id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';
    result?: string | null;
    error?: string | null;
  }>;
}

export interface GenerateVideoPayload {
  prompt: string;
  model: string;
  duration?: number;
  aspectRatio?: string;
  enableAudio?: boolean;
  seed?: number;
  startFrameUrl?: string;
  endFrameUrl?: string;
  extraParams?: Record<string, unknown>;
}

export interface VideoJobStatus {
  jobId: string;
  state: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  progress?: number;
  videoUrl?: string;
  errorMessage?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface VideoAiGateway {
  setApiKey: (provider: string, apiKey: string) => Promise<void>;
  generateVideo: (payload: GenerateVideoPayload) => Promise<{ jobId: string }>;
  pollJobStatus: (jobId: string, model: string) => Promise<VideoJobStatus>;
  cacheVideo: (videoUrl: string, videoId: string) => Promise<string>;
  downloadVideo: (videoUrl: string, targetPath: string, revealInExplorer: boolean) => Promise<void>;
}

export interface ImageSplitGateway {
  split: (
    imageSource: string,
    rows: number,
    cols: number,
    lineThickness: number
  ) => Promise<string[]>;
}

export interface ToolProcessorResult {
  outputImageUrl?: string;
  storyboardFrames?: StoryboardFrameItem[];
  rows?: number;
  cols?: number;
  frameAspectRatio?: string;
}

export interface ToolProcessor {
  process: (
    toolType: NodeToolType,
    sourceImageUrl: string,
    options: Record<string, unknown>
  ) => Promise<ToolProcessorResult>;
}

export interface ShotAnalysisPayload {
  imageUrl: string;
  additionalFrameUrls?: string[];
  language: 'zh' | 'en';
}

export interface ShotAnalysisResult {
  shotType: string;
  shotTypeConfidence: number;
  cameraMovement: string;
  movementDescription: string;
  subject: string;
  subjectAction: string;
  lightingType: string;
  lightingMood: string;
  colorPalette: string[];
  mood: string;
  composition: string;
  directorNote: string;
}

export interface LlmAnalysisGateway {
  analyzeShot: (payload: ShotAnalysisPayload) => Promise<ShotAnalysisResult>;
}

export interface CanvasEventMap {
  'tool-dialog/open': {
    nodeId: string;
    toolType: NodeToolType;
  };
  'tool-dialog/close': undefined;
  'upload-node/reupload': {
    nodeId: string;
  };
  'upload-node/paste-image': {
    nodeId: string;
    file: File;
  };
  'reverse-prompt/open': {
    nodeId: string;
    imageUrl: string;
  };
}

export interface CanvasEventBus {
  publish: <TType extends keyof CanvasEventMap>(
    type: TType,
    payload: CanvasEventMap[TType]
  ) => void;
  subscribe: <TType extends keyof CanvasEventMap>(
    type: TType,
    handler: (payload: CanvasEventMap[TType]) => void
  ) => () => void;
}

/* ── N2: Reverse Prompt Generation ── */

export type ReversePromptStyle = 'generic' | 'chinese';

export interface ReversePromptPayload {
  imageUrl: string;
  style: ReversePromptStyle;
  additionalContext?: string;
}

export interface ReversePromptResult {
  prompt: string;
  negativePrompt?: string;
  tags?: string[];
  confidence: number;
}

export interface ShotAnalysisPayload {
  imageUrl: string;
  additionalContext?: string;
}

export interface ShotAnalysisResult {
  shotType: string;
  cameraMovement: string;
  lighting: string;
  mood: string;
  composition: string;
}

export interface LlmAnalysisGateway {
  reversePrompt: (payload: ReversePromptPayload) => Promise<ReversePromptResult>;
  analyzeShot: (payload: ShotAnalysisPayload) => Promise<ShotAnalysisResult>;
}

/* ── Video Intelligence: asset upload + analyze ── */

export interface UploadVideoParams {
  file: File;
  projectId: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

export interface AssetGateway {
  uploadVideo(params: UploadVideoParams): Promise<{ videoUrl: string; videoFileName: string }>;
}

export interface VideoAnalyzeParams {
  videoUrl: string;
  projectId: string;
  sensitivityThreshold?: number;
  minSceneDurationMs?: number;
  maxKeyframes?: number;
  signal?: AbortSignal;
}

export interface VideoAnalyzeScene {
  startTimeMs: number;
  endTimeMs: number;
  keyframeUrl: string;
  confidence: number;
}

export interface VideoAnalyzeResponse {
  analysisId: string;
  scenes: VideoAnalyzeScene[];
  totalDurationMs: number;
  fps: number;
}

export interface VideoAnalysisGateway {
  analyze(params: VideoAnalyzeParams): Promise<VideoAnalyzeResponse>;
}
