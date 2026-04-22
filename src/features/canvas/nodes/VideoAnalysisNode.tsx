'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Search, Loader2, CheckSquare, Square, Upload, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  type VideoAnalysisNodeData,
  type VideoScene,
} from '@/features/canvas/domain/canvasNodes';
import type { ReversePromptStyle } from '@/features/canvas/domain/videoAnalysisTypes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import { NODE_CONTROL_PRIMARY_BUTTON_CLASS } from '@/features/canvas/ui/nodeControlStyles';
import { UiButton } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';
import { useProjectStore } from '@/stores/projectStore';
import { webAssetGateway } from '@/features/canvas/infrastructure/webAssetGateway';
import { webVideoAnalysisGateway } from '@/features/canvas/infrastructure/webVideoAnalysisGateway';
import {
  expandSelectedFramesToUploadNodes,
  createStoryboardFromSelection,
} from './videoAnalysisActions';

type VideoAnalysisNodeProps = NodeProps & {
  id: string;
  data: VideoAnalysisNodeData;
  selected?: boolean;
};

const MIN_WIDTH = 340;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 900;
const MAX_HEIGHT = 1200;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 420;
const SHOT_ANALYSIS_FRAME_LIMIT = 10;
const REVERSE_PROMPT_CONCURRENCY = 3;

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function VideoAnalysisNodeComponent({
  id,
  data,
  selected,
  width,
  height,
}: VideoAnalysisNodeProps) {
  const { t } = useTranslation();
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const nodes = useCanvasStore((s) => s.nodes);
  const projectId = useProjectStore((s) => s.currentProjectId);

  const [error, setError] = useState<string | null>(null);
  const [shotAnalysisLoading, setShotAnalysisLoading] = useState(false);
  const autoRanForAnalysisId = useRef<string | null>(null);

  const reversePromptStyle: ReversePromptStyle = data.reversePromptStyle ?? 'generic';

  const handleReversePromptStyleChange = useCallback(
    (next: ReversePromptStyle) => {
      updateNodeData(id, { reversePromptStyle: next });
      autoRanForAnalysisId.current = null;
    },
    [id, updateNodeData],
  );

  const runShotAnalysisAndReverse = useCallback(
    async (scenes: VideoScene[], language: 'zh' | 'en', style: ReversePromptStyle) => {
      if (scenes.length === 0) return;
      const framesForShot = scenes.slice(0, SHOT_ANALYSIS_FRAME_LIMIT).map((s) => s.keyframeUrl).filter(Boolean);
      if (framesForShot.length === 0) return;

      setShotAnalysisLoading(true);
      try {
        const shotRes = await fetch('/api/ai/shot-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: framesForShot[0],
            additionalFrameUrls: framesForShot.slice(1),
            language,
          }),
        });
        if (shotRes.ok) {
          const shotAnalysis = await shotRes.json();
          updateNodeData(id, { shotAnalysis });
        } else if (shotRes.status !== 503) {
          const body = await shotRes.json().catch(() => ({}));
          setError(body.error || `shot-analysis ${shotRes.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'shot-analysis failed';
        setError(msg);
      } finally {
        setShotAnalysisLoading(false);
      }

      const tasks = scenes.map((scene) => async (): Promise<VideoScene> => {
        if (!scene.keyframeUrl) return { ...scene, reversePromptError: 'no keyframe' };
        try {
          const res = await fetch('/api/ai/reverse-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: scene.keyframeUrl, style }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { ...scene, reversePrompt: null, reversePromptError: body.error || `HTTP ${res.status}` };
          }
          const reversePrompt = await res.json();
          return { ...scene, reversePrompt, reversePromptError: null };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'reverse-prompt failed';
          return { ...scene, reversePrompt: null, reversePromptError: msg };
        }
      });

      const enrichedScenes = await runWithConcurrency(tasks, REVERSE_PROMPT_CONCURRENCY);

      const latestScenes = useCanvasStore.getState().nodes.find((n) => n.id === id)?.data?.scenes as VideoScene[] | undefined;
      if (latestScenes) {
        const byId = new Map(enrichedScenes.map((s) => [s.id, s]));
        const merged = latestScenes.map((s) => byId.get(s.id) ?? s);
        updateNodeData(id, { scenes: merged });
      } else {
        updateNodeData(id, { scenes: enrichedScenes });
      }
    },
    [id, updateNodeData],
  );

  useEffect(() => {
    if (!data.analysisId || !data.scenes || data.scenes.length === 0) return;
    if (autoRanForAnalysisId.current === data.analysisId) return;
    const needsEnrichment = !data.shotAnalysis || data.scenes.some((s) => !s.reversePrompt && !s.reversePromptError);
    if (!needsEnrichment) return;
    autoRanForAnalysisId.current = data.analysisId;
    const language: 'zh' | 'en' = reversePromptStyle === 'chinese' ? 'zh' : 'en';
    void runShotAnalysisAndReverse(data.scenes, language, reversePromptStyle);
  }, [data.analysisId, data.scenes, data.shotAnalysis, reversePromptStyle, runShotAnalysisAndReverse]);

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.videoAnalysis, data, t),
    [data, t],
  );

  const resolvedWidth = Math.max(MIN_WIDTH, Math.round(width ?? DEFAULT_WIDTH));
  const resolvedHeight = Math.max(MIN_HEIGHT, Math.round(height ?? DEFAULT_HEIGHT));

  const hasVideo = Boolean(data.videoUrl);
  const canAnalyze = hasVideo && !data.isAnalyzing;

  const selectedCount = useMemo(
    () => data.scenes?.filter((s) => s.selected).length ?? 0,
    [data.scenes],
  );

  const uploadVideoFile = useCallback(
    async (file: File) => {
      if (!projectId) {
        setError(t('node.videoAnalysis.noProjectSelected'));
        return;
      }
      setError(null);
      updateNodeData(id, { videoFileName: file.name, scenes: [], errorMessage: null, isAnalyzing: true, analysisProgress: 0 });
      try {
        const { videoUrl, videoFileName } = await webAssetGateway.uploadVideo({
          file,
          projectId,
          onProgress: (pct) => {
            updateNodeData(id, { analysisProgress: Math.round(pct * 0.5) });
          },
        });
        updateNodeData(id, { videoUrl, videoFileName, isAnalyzing: false, analysisProgress: 0, errorMessage: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : t('node.videoAnalysis.uploadFailed');
        setError(message);
        updateNodeData(id, { isAnalyzing: false, analysisProgress: 0, errorMessage: message });
      }
    },
    [id, projectId, t, updateNodeData],
  );

  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) return;
      void uploadVideoFile(file);
    },
    [uploadVideoFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('video/')) return;
      void uploadVideoFile(file);
    },
    [uploadVideoFile],
  );

  const handleSensitivityChange = useCallback(
    (value: number) => { updateNodeData(id, { sensitivityThreshold: value }); },
    [id, updateNodeData],
  );

  const handleMinDurationChange = useCallback(
    (value: number) => { updateNodeData(id, { minSceneDurationMs: value }); },
    [id, updateNodeData],
  );

  const handleMaxKeyframesChange = useCallback(
    (value: number) => { updateNodeData(id, { maxKeyframes: value }); },
    [id, updateNodeData],
  );

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze || !data.videoUrl) return;
    if (!projectId) {
      setError(t('node.videoAnalysis.noProjectSelected'));
      return;
    }
    setError(null);
    updateNodeData(id, { isAnalyzing: true, analysisProgress: 0, errorMessage: null, scenes: [] });

    try {
      const result = await webVideoAnalysisGateway.analyze({
        videoUrl: data.videoUrl,
        projectId,
        sensitivityThreshold: data.sensitivityThreshold,
        minSceneDurationMs: data.minSceneDurationMs,
        maxKeyframes: data.maxKeyframes,
      });

      const scenes: VideoScene[] = (result.scenes ?? []).map((s, i) => ({
        id: `scene-${i}-${Date.now()}`,
        startTimeMs: s.startTimeMs,
        endTimeMs: s.endTimeMs,
        keyframeUrl: s.keyframeUrl,
        confidence: s.confidence,
        selected: true,
      }));

      updateNodeData(id, {
        isAnalyzing: false,
        analysisProgress: 100,
        scenes,
        analysisId: result.analysisId,
        errorMessage: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('node.videoAnalysis.analysisFailed');
      setError(message);
      updateNodeData(id, { isAnalyzing: false, analysisProgress: 0, errorMessage: message });
    }
  }, [canAnalyze, data.videoUrl, data.sensitivityThreshold, data.minSceneDurationMs, data.maxKeyframes, id, projectId, updateNodeData, t]);

  const toggleSceneSelection = useCallback(
    (sceneId: string) => {
      const nextScenes = data.scenes.map((s) => s.id === sceneId ? { ...s, selected: !s.selected } : s);
      updateNodeData(id, { scenes: nextScenes });
    },
    [id, data.scenes, updateNodeData],
  );

  const toggleAllScenes = useCallback(
    (selectAll: boolean) => {
      const nextScenes = data.scenes.map((s) => ({ ...s, selected: selectAll }));
      updateNodeData(id, { scenes: nextScenes });
    },
    [id, data.scenes, updateNodeData],
  );

  const buildExpandContext = useCallback(() => {
    const currentNode = nodes.find((n) => n.id === id);
    if (!currentNode) return null;
    return {
      sourceNodeId: id,
      sourcePosition: currentNode.position ?? { x: 0, y: 0 },
      sourceWidth: resolvedWidth,
      addNode,
      addEdge,
      getNodes: () => useCanvasStore.getState().nodes,
      t,
    };
  }, [addEdge, addNode, id, nodes, resolvedWidth, t]);

  const handleExportKeyframes = useCallback(() => {
    if (selectedCount === 0) return;
    const ctx = buildExpandContext();
    if (!ctx) return;
    expandSelectedFramesToUploadNodes(data.scenes.filter((s) => s.selected), ctx);
  }, [selectedCount, data.scenes, buildExpandContext]);

  const handleCreateStoryboard = useCallback(() => {
    if (selectedCount === 0) return;
    const ctx = buildExpandContext();
    if (!ctx) return;
    createStoryboardFromSelection(data.scenes.filter((s) => s.selected), ctx);
  }, [selectedCount, data.scenes, buildExpandContext]);

  return (
    <div
      className={`
        flex flex-col rounded-xl border-2 bg-[var(--canvas-node-bg)] shadow-xl transition-all p-3 overflow-hidden
        ${selected
          ? 'border-accent shadow-accent/30'
          : 'border-[var(--canvas-node-border)] hover:border-[var(--canvas-node-hover-border)]'}
      `}
      data-testid="node-videoAnalysis"
      style={{ width: resolvedWidth, height: resolvedHeight }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Film className="h-4 w-4" />}
        titleText={resolvedTitle}
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
        {hasVideo ? (
          <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden bg-black/20">
            <video
              src={data.videoUrl ?? undefined}
              className="h-full w-full object-contain"
              controls
              muted
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          <label
            className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--canvas-drop-zone-border)] bg-[var(--canvas-drop-zone-hover-bg)] cursor-pointer hover:border-[var(--canvas-node-hover-border)] transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Upload className="h-8 w-8 text-[var(--canvas-node-fg-muted)]/60" />
            <span className="text-xs text-[var(--canvas-node-fg-muted)]">{t('node.videoAnalysis.uploadHint')}</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </label>
        )}

        {data.videoFileName && (
          <div className="text-xs text-[var(--canvas-node-fg-muted)] px-1 truncate">{data.videoFileName}</div>
        )}

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-[var(--canvas-node-fg-muted)] shrink-0 w-16">{t('node.videoAnalysis.sensitivity')}:</span>
          <input type="range" min={0.1} max={1.0} step={0.05} value={data.sensitivityThreshold}
            onChange={(e) => { e.stopPropagation(); handleSensitivityChange(parseFloat(e.target.value)); }}
            onMouseDown={(e) => e.stopPropagation()} className="nodrag flex-1 h-1.5 accent-accent" />
          <span className="text-xs text-[var(--canvas-node-fg)] w-8 text-right">{data.sensitivityThreshold.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-[var(--canvas-node-fg-muted)] shrink-0 w-16">{t('node.videoAnalysis.minDuration')}:</span>
          <select value={data.minSceneDurationMs}
            onChange={(e) => { e.stopPropagation(); handleMinDurationChange(parseInt(e.target.value, 10)); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-2 py-0.5 text-xs text-[var(--canvas-node-fg)] outline-none dark:border-[rgba(255,255,255,0.1)]">
            <option value={200}>200ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-[var(--canvas-node-fg-muted)] shrink-0 w-16">{t('node.videoAnalysis.maxKeyframes')}:</span>
          <input type="number" min={1} max={200} value={data.maxKeyframes}
            onChange={(e) => { e.stopPropagation(); handleMaxKeyframesChange(parseInt(e.target.value, 10) || 50); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag w-16 rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-2 py-0.5 text-xs text-[var(--canvas-node-fg)] outline-none dark:border-[rgba(255,255,255,0.1)]" />
        </div>

        <div className="px-1">
          <UiButton onClick={(e) => { e.stopPropagation(); void handleAnalyze(); }} disabled={!canAnalyze}
            variant="primary" size="sm" className={`w-full ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}>
            {data.isAnalyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('node.videoAnalysis.analyzing')}</>
            ) : (
              <><Search className="h-4 w-4" />{t('node.videoAnalysis.analyzeButton')}</>
            )}
          </UiButton>
        </div>

        {data.isAnalyzing && data.analysisProgress > 0 && (
          <div className="px-1">
            <div className="h-1.5 rounded-full bg-bg-dark/40 overflow-hidden">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${data.analysisProgress}%` }} />
            </div>
          </div>
        )}

        {(error || data.errorMessage) && (
          <div className="px-1 text-xs text-red-400">{error || data.errorMessage}</div>
        )}

        {data.scenes?.length > 0 && (
          <>
            <div className="px-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--canvas-node-fg-muted)]">
                {t('node.videoAnalysis.scenesDetected', { count: data.scenes.length })}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1 rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/40 px-1 py-0.5 dark:border-[rgba(255,255,255,0.1)]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Languages className="h-3 w-3 text-[var(--canvas-node-fg-muted)]" />
                  <button
                    onClick={() => handleReversePromptStyleChange('generic')}
                    className={`nodrag text-[10px] px-1 rounded ${reversePromptStyle === 'generic' ? 'bg-accent text-white' : 'text-[var(--canvas-node-fg-muted)] hover:text-[var(--canvas-node-fg)]'}`}
                  >EN</button>
                  <button
                    onClick={() => handleReversePromptStyleChange('chinese')}
                    className={`nodrag text-[10px] px-1 rounded ${reversePromptStyle === 'chinese' ? 'bg-accent text-white' : 'text-[var(--canvas-node-fg-muted)] hover:text-[var(--canvas-node-fg)]'}`}
                  >中文</button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleAllScenes(selectedCount < data.scenes.length); }}
                  className="text-[10px] text-accent hover:text-accent/80 transition-colors">
                  {selectedCount === data.scenes.length
                    ? t('node.videoAnalysis.deselectAll')
                    : t('node.videoAnalysis.selectAll')}
                </button>
              </div>
            </div>

            {(shotAnalysisLoading || data.shotAnalysis) && (
              <div className="px-1">
                <div className="rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/30 px-2 py-1 text-[10px] text-[var(--canvas-node-fg-muted)] dark:border-[rgba(255,255,255,0.1)]">
                  {shotAnalysisLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('node.videoAnalysis.shotAnalysisRunning')}
                    </span>
                  ) : data.shotAnalysis ? (
                    <span className="block truncate">
                      <span className="text-accent font-medium">{data.shotAnalysis.shotType}</span>
                      <span className="mx-1">·</span>
                      <span>{data.shotAnalysis.cameraMovement}</span>
                      <span className="mx-1">·</span>
                      <span>{data.shotAnalysis.mood}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto ui-scrollbar rounded-lg border border-[rgba(15,23,42,0.15)] bg-bg-dark/30 p-2 dark:border-[rgba(255,255,255,0.1)]">
              <div className="grid grid-cols-3 gap-1.5">
                {data.scenes.map((scene) => (
                  <button key={scene.id}
                    onClick={(e) => { e.stopPropagation(); toggleSceneSelection(scene.id); }}
                    className={`relative rounded overflow-hidden border transition-all ${
                      scene.selected ? 'border-accent ring-1 ring-accent/30' : 'border-transparent opacity-60 hover:opacity-80'
                    }`}>
                    {scene.keyframeUrl ? (
                      <img src={scene.keyframeUrl} alt={`Scene ${formatTime(scene.startTimeMs)}`}
                        className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="w-full aspect-video bg-bg-dark/60 flex items-center justify-center">
                        <Film className="h-4 w-4 text-[var(--canvas-node-fg-muted)]/40" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] text-white text-center">
                      {formatTime(scene.startTimeMs)}
                    </div>
                    <div className="absolute top-0.5 left-0.5">
                      {scene.selected
                        ? <CheckSquare className="h-3 w-3 text-accent" />
                        : <Square className="h-3 w-3 text-white/60" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-1 shrink-0 flex gap-1.5">
              <UiButton onClick={(e) => { e.stopPropagation(); handleExportKeyframes(); }}
                disabled={selectedCount === 0} variant="primary" size="sm"
                className={`flex-1 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}>
                {selectedCount > 0
                  ? t('node.videoAnalysis.exportKeyframesCount', { count: selectedCount })
                  : t('node.videoAnalysis.exportKeyframes')}
              </UiButton>
              <UiButton onClick={(e) => { e.stopPropagation(); handleCreateStoryboard(); }}
                disabled={selectedCount === 0} variant="muted" size="sm"
                className="flex-1">
                {t('node.videoAnalysis.createStoryboard')}
              </UiButton>
            </div>
          </>
        )}
      </div>

      <Handle type="target" id="target" position={Position.Left}
        className="!h-3 !w-3 !border-surface-dark !bg-accent" />
      <Handle type="source" id="source" position={Position.Right}
        className="!h-3 !w-3 !border-surface-dark !bg-accent" />

      <NodeResizeHandle minWidth={MIN_WIDTH} minHeight={MIN_HEIGHT} maxWidth={MAX_WIDTH} maxHeight={MAX_HEIGHT} />
    </div>
  );
}

export const VideoAnalysisNode = memo(VideoAnalysisNodeComponent);
