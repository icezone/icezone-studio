'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Search, Loader2, CheckSquare, Square, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  type VideoAnalysisNodeData,
  type VideoScene,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import { NODE_CONTROL_PRIMARY_BUTTON_CLASS } from '@/features/canvas/ui/nodeControlStyles';
import { UiButton } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';

type VideoAnalysisNodeProps = NodeProps & {
  id: string;
  data: VideoAnalysisNodeData;
  selected?: boolean;
};

const MIN_WIDTH = 340;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 900;
const MAX_HEIGHT = 1200;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 540;

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

  const [error, setError] = useState<string | null>(null);

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

  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) return;
      const url = URL.createObjectURL(file);
      updateNodeData(id, { videoUrl: url, videoFileName: file.name, scenes: [], errorMessage: null });
    },
    [id, updateNodeData],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('video/')) return;
      const url = URL.createObjectURL(file);
      updateNodeData(id, { videoUrl: url, videoFileName: file.name, scenes: [], errorMessage: null });
    },
    [id, updateNodeData],
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
    setError(null);
    updateNodeData(id, { isAnalyzing: true, analysisProgress: 0, errorMessage: null, scenes: [] });

    try {
      const response = await fetch('/api/video/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: data.videoUrl,
          sensitivityThreshold: data.sensitivityThreshold,
          minSceneDurationMs: data.minSceneDurationMs,
          maxKeyframes: data.maxKeyframes,
          projectId: 'local',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const scenes: VideoScene[] = (result.scenes ?? []).map(
        (s: Record<string, unknown>, i: number) => ({
          id: `scene-${i}-${Date.now()}`,
          startTimeMs: typeof s.startTimeMs === 'number' ? s.startTimeMs : 0,
          endTimeMs: typeof s.endTimeMs === 'number' ? s.endTimeMs : 0,
          keyframeUrl: typeof s.keyframeUrl === 'string' ? s.keyframeUrl : '',
          confidence: typeof s.confidence === 'number' ? s.confidence : 0,
          selected: true,
        }),
      );

      updateNodeData(id, { isAnalyzing: false, analysisProgress: 100, scenes, errorMessage: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('node.videoAnalysis.analysisFailed');
      setError(message);
      updateNodeData(id, { isAnalyzing: false, analysisProgress: 0, errorMessage: message });
    }
  }, [canAnalyze, data.videoUrl, data.sensitivityThreshold, data.minSceneDurationMs, data.maxKeyframes, id, updateNodeData, t]);

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

  const handleExportKeyframes = useCallback(() => {
    if (selectedCount === 0) return;
    const selectedScenes = data.scenes.filter((s) => s.selected);
    const currentNode = nodes.find((n) => n.id === id);
    if (!currentNode) return;

    const baseX = (currentNode.position?.x ?? 0) + resolvedWidth + 80;
    const baseY = currentNode.position?.y ?? 0;

    selectedScenes.forEach((scene, index) => {
      if (!scene.keyframeUrl) return;
      const position = { x: baseX, y: baseY + index * 220 };
      addNode(
        CANVAS_NODE_TYPES.upload,
        position,
        {
          displayName: `${t('node.videoAnalysis.keyframe')} ${formatTime(scene.startTimeMs)}`,
          imageUrl: scene.keyframeUrl,
          previewImageUrl: scene.previewUrl ?? scene.keyframeUrl,
          aspectRatio: '16:9',
          sourceFileName: `keyframe-${formatTime(scene.startTimeMs)}.jpg`,
        },
      );
      const latestNodes = useCanvasStore.getState().nodes;
      const newNode = latestNodes[latestNodes.length - 1];
      if (newNode) {
        addEdge(id, newNode.id);
      }
    });
  }, [selectedCount, data.scenes, nodes, id, resolvedWidth, addNode, addEdge, t]);

  return (
    <div
      className={`
        flex flex-col rounded-xl border-2 bg-surface-dark shadow-xl transition-all p-3 overflow-hidden
        ${selected
          ? 'border-accent shadow-accent/30'
          : 'border-[rgba(15,23,42,0.45)] hover:border-[rgba(15,23,42,0.58)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'}
      `}
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
          <div className="relative flex-shrink-0 rounded-lg overflow-hidden bg-black/20" style={{ height: 160 }}>
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
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[rgba(15,23,42,0.2)] bg-bg-dark/30 cursor-pointer hover:border-accent/40 transition-colors dark:border-[rgba(255,255,255,0.15)]"
            style={{ height: 140 }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Upload className="h-8 w-8 text-text-muted/60" />
            <span className="text-xs text-text-muted">{t('node.videoAnalysis.uploadHint')}</span>
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </label>
        )}

        {data.videoFileName && (
          <div className="text-xs text-text-muted px-1 truncate">{data.videoFileName}</div>
        )}

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-text-muted shrink-0 w-16">{t('node.videoAnalysis.sensitivity')}:</span>
          <input type="range" min={0.1} max={1.0} step={0.05} value={data.sensitivityThreshold}
            onChange={(e) => { e.stopPropagation(); handleSensitivityChange(parseFloat(e.target.value)); }}
            onMouseDown={(e) => e.stopPropagation()} className="nodrag flex-1 h-1.5 accent-accent" />
          <span className="text-xs text-text-dark w-8 text-right">{data.sensitivityThreshold.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-text-muted shrink-0 w-16">{t('node.videoAnalysis.minDuration')}:</span>
          <select value={data.minSceneDurationMs}
            onChange={(e) => { e.stopPropagation(); handleMinDurationChange(parseInt(e.target.value, 10)); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-2 py-0.5 text-xs text-text-dark outline-none dark:border-[rgba(255,255,255,0.1)]">
            <option value={200}>200ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-text-muted shrink-0 w-16">{t('node.videoAnalysis.maxKeyframes')}:</span>
          <input type="number" min={1} max={200} value={data.maxKeyframes}
            onChange={(e) => { e.stopPropagation(); handleMaxKeyframesChange(parseInt(e.target.value, 10) || 50); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag w-16 rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-2 py-0.5 text-xs text-text-dark outline-none dark:border-[rgba(255,255,255,0.1)]" />
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
            <div className="px-1 flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">
                {t('node.videoAnalysis.scenesDetected', { count: data.scenes.length })}
              </span>
              <button onClick={(e) => { e.stopPropagation(); toggleAllScenes(selectedCount < data.scenes.length); }}
                className="text-[10px] text-accent hover:text-accent/80 transition-colors">
                {selectedCount === data.scenes.length
                  ? t('node.videoAnalysis.deselectAll')
                  : t('node.videoAnalysis.selectAll')}
              </button>
            </div>

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
                        <Film className="h-4 w-4 text-text-muted/40" />
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

            <div className="px-1 shrink-0">
              <UiButton onClick={(e) => { e.stopPropagation(); handleExportKeyframes(); }}
                disabled={selectedCount === 0} variant="primary" size="sm"
                className={`w-full ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}>
                {selectedCount > 0
                  ? t('node.videoAnalysis.exportKeyframesCount', { count: selectedCount })
                  : t('node.videoAnalysis.exportKeyframes')}
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
