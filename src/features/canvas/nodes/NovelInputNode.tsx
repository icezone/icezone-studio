'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BookOpen, Search, Loader2, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  type NovelInputNodeData,
  type NovelScene,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import { NODE_CONTROL_PRIMARY_BUTTON_CLASS } from '@/features/canvas/ui/nodeControlStyles';
import { batchGenerateStoryboards } from '@/features/canvas/application/novelToStoryboard';
import { UiButton } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';

type NovelInputNodeProps = NodeProps & {
  id: string;
  data: NovelInputNodeData;
  selected?: boolean;
};

const MAX_CHARS = 10_000;
const MIN_WIDTH = 340;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 900;
const MAX_HEIGHT = 1200;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 520;

const GRANULARITY_OPTIONS = ['coarse', 'medium', 'fine'] as const;
const LANGUAGE_OPTIONS = ['auto', 'zh', 'en'] as const;

function NovelInputNodeComponent({
  id,
  data,
  selected,
  width,
  height,
}: NovelInputNodeProps) {
  const { t } = useTranslation();
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);

  const [error, setError] = useState<string | null>(null);

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.novelInput, data, t),
    [data, t],
  );

  const resolvedWidth = Math.max(MIN_WIDTH, Math.round(width ?? DEFAULT_WIDTH));
  const resolvedHeight = Math.max(MIN_HEIGHT, Math.round(height ?? DEFAULT_HEIGHT));

  const textLength = data.text?.length ?? 0;
  const isOverLimit = textLength > MAX_CHARS;
  const isEmpty = textLength === 0;
  const canAnalyze = !isEmpty && !isOverLimit && !data.isAnalyzing;

  const selectedCount = useMemo(
    () => data.scenes?.filter((s) => s.selected).length ?? 0,
    [data.scenes],
  );

  const handleTextChange = useCallback(
    (value: string) => {
      updateNodeData(id, {
        text: value,
        textLength: value.length,
      });
    },
    [id, updateNodeData],
  );

  const handleGranularityChange = useCallback(
    (g: 'coarse' | 'medium' | 'fine') => {
      updateNodeData(id, { sceneGranularity: g });
    },
    [id, updateNodeData],
  );

  const handleLanguageChange = useCallback(
    (lang: 'auto' | 'zh' | 'en') => {
      updateNodeData(id, { language: lang });
    },
    [id, updateNodeData],
  );

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;

    setError(null);
    updateNodeData(id, { isAnalyzing: true, errorMessage: null });

    try {
      const response = await fetch('/api/ai/novel-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.text,
          language: data.language,
          maxScenes: data.maxScenes,
          sceneGranularity: data.sceneGranularity,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      const characters = (result.characters ?? []).map((c: Record<string, unknown>, i: number) => ({
        id: c.id ?? `char-${i}`,
        name: c.name ?? '',
        description: c.description ?? '',
        aliases: c.aliases ?? [],
      }));

      const scenes: NovelScene[] = (result.scenes ?? []).map(
        (s: Record<string, unknown>, i: number) => ({
          id: s.id ?? `scene-${i}`,
          order: typeof s.order === 'number' ? s.order : i + 1,
          title: s.title ?? `Scene ${i + 1}`,
          summary: s.summary ?? '',
          visualPrompt: s.visualPrompt ?? s.visual_prompt ?? '',
          characters: Array.isArray(s.characters) ? s.characters : [],
          location: s.location ?? '',
          mood: s.mood ?? '',
          timeOfDay: s.timeOfDay ?? s.time_of_day,
          sourceTextRange: s.sourceTextRange ?? s.source_text_range,
          selected: true,
        }),
      );

      updateNodeData(id, {
        isAnalyzing: false,
        characters,
        scenes,
        errorMessage: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('node.novelInput.analysisFailed');
      setError(message);
      updateNodeData(id, {
        isAnalyzing: false,
        errorMessage: message,
      });
    }
  }, [canAnalyze, data.text, data.language, data.maxScenes, data.sceneGranularity, id, updateNodeData, t]);

  const toggleSceneSelection = useCallback(
    (sceneId: string) => {
      const nextScenes = data.scenes.map((s) =>
        s.id === sceneId ? { ...s, selected: !s.selected } : s,
      );
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

  const handleBatchGenerate = useCallback(() => {
    if (selectedCount === 0) return;

    // Cast to match MinimalCanvasStore interface which uses looser types
    const store = { nodes, addNode, addEdge } as {
      nodes: Array<{ id: string; position: { x: number; y: number }; [key: string]: unknown }>;
      addNode: (type: string, position: { x: number; y: number }, data?: Record<string, unknown>) => string;
      addEdge: (source: string, target: string) => string | null;
    };
    batchGenerateStoryboards(id, data.scenes, store);
  }, [id, data.scenes, selectedCount, nodes, addNode, addEdge]);

  const granularityLabel = (g: string) => {
    switch (g) {
      case 'coarse': return t('node.novelInput.granularityCoarse');
      case 'medium': return t('node.novelInput.granularityMedium');
      case 'fine': return t('node.novelInput.granularityFine');
      default: return g;
    }
  };

  const languageLabel = (l: string) => {
    switch (l) {
      case 'auto': return t('node.novelInput.languageAuto');
      case 'zh': return t('node.novelInput.languageZh');
      case 'en': return t('node.novelInput.languageEn');
      default: return l;
    }
  };

  return (
    <div
      className={`
        flex flex-col rounded-xl border-2 bg-surface-dark shadow-xl transition-all p-3 overflow-hidden
        ${selected
          ? 'border-accent shadow-accent/30'
          : 'border-[rgba(15,23,42,0.45)] hover:border-[rgba(15,23,42,0.58)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'}
      `}
      data-testid="node-novelInput"
      style={{ width: resolvedWidth, height: resolvedHeight }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<BookOpen className="h-4 w-4" />}
        titleText={resolvedTitle}
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
        {/* Textarea */}
        <div className="relative flex-shrink-0" style={{ minHeight: 120, maxHeight: 200 }}>
          <textarea
            value={data.text ?? ''}
            onChange={(e) => handleTextChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={t('node.novelInput.placeholder')}
            className="nodrag nowheel ui-scrollbar h-full w-full resize-none rounded-lg border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-3 py-2 text-sm leading-6 text-text-dark outline-none placeholder:text-text-muted/70 focus:border-accent/50 dark:border-[rgba(255,255,255,0.1)]"
            style={{ height: 140 }}
          />
        </div>

        {/* Character counter */}
        <div className={`text-xs px-1 ${isOverLimit ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
          {t('node.novelInput.charCount', { count: textLength.toLocaleString(), max: MAX_CHARS.toLocaleString() })}
        </div>

        {/* Granularity */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-text-muted shrink-0">{t('node.novelInput.granularity')}:</span>
          <div className="flex gap-1">
            {GRANULARITY_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={(e) => { e.stopPropagation(); handleGranularityChange(g); }}
                className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                  data.sceneGranularity === g
                    ? 'bg-accent text-white'
                    : 'bg-bg-dark/60 text-text-muted hover:bg-bg-dark/80 dark:bg-white/10 dark:hover:bg-white/20'
                }`}
              >
                {granularityLabel(g)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-text-muted shrink-0">{t('node.novelInput.language')}:</span>
          <select
            value={data.language ?? 'auto'}
            onChange={(e) => { e.stopPropagation(); handleLanguageChange(e.target.value as 'auto' | 'zh' | 'en'); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag rounded-md border border-[rgba(15,23,42,0.15)] bg-bg-dark/45 px-2 py-0.5 text-xs text-text-dark outline-none dark:border-[rgba(255,255,255,0.1)]"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{languageLabel(l)}</option>
            ))}
          </select>
        </div>

        {/* Analyze button */}
        <div className="px-1">
          <UiButton
            onClick={(e) => { e.stopPropagation(); void handleAnalyze(); }}
            disabled={!canAnalyze}
            variant="primary"
            size="sm"
            className={`w-full ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
          >
            {data.isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('node.novelInput.analyzing')}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t('node.novelInput.analyzeButton')}
              </>
            )}
          </UiButton>
        </div>

        {/* Error message */}
        {(error || data.errorMessage) && (
          <div className="px-1 text-xs text-red-400">{error || data.errorMessage}</div>
        )}

        {/* Results section (scrollable) */}
        {(data.characters?.length > 0 || data.scenes?.length > 0) && (
          <div className="flex-1 min-h-0 overflow-y-auto ui-scrollbar rounded-lg border border-[rgba(15,23,42,0.15)] bg-bg-dark/30 p-2 dark:border-[rgba(255,255,255,0.1)]">
            {/* Characters */}
            {data.characters?.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 text-xs font-medium text-text-muted">
                  {t('node.novelInput.characters')} ({data.characters.length})
                </div>
                <div className="space-y-1">
                  {data.characters.map((char) => (
                    <div key={char.id} className="flex items-start gap-1.5 text-xs text-text-dark">
                      <span className="font-medium shrink-0">{char.name}</span>
                      {char.description && (
                        <span className="text-text-muted truncate">— {char.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scenes */}
            {data.scenes?.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">
                    {t('node.novelInput.scenes')} ({data.scenes.length})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllScenes(selectedCount < data.scenes.length);
                    }}
                    className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                  >
                    {selectedCount === data.scenes.length
                      ? t('node.novelInput.deselectAll')
                      : t('node.novelInput.selectAll')}
                  </button>
                </div>
                <div className="space-y-1">
                  {data.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={(e) => { e.stopPropagation(); toggleSceneSelection(scene.id); }}
                      className={`flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors ${
                        scene.selected
                          ? 'bg-accent/10 text-text-dark'
                          : 'text-text-muted hover:bg-bg-dark/40'
                      }`}
                    >
                      {scene.selected ? (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-accent mt-0.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      )}
                      <span className="truncate">
                        S{scene.order}: {scene.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch Generate */}
        {data.scenes?.length > 0 && (
          <div className="px-1 shrink-0">
            <UiButton
              onClick={(e) => { e.stopPropagation(); handleBatchGenerate(); }}
              disabled={selectedCount === 0}
              variant="primary"
              size="sm"
              className={`w-full ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
            >
              {selectedCount > 0
                ? t('node.novelInput.batchGenerateCount', { count: selectedCount })
                : t('node.novelInput.batchGenerate')}
            </UiButton>
          </div>
        )}
      </div>

      {/* Source handle only */}
      <Handle
        type="source"
        id="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-surface-dark !bg-accent"
      />

      <NodeResizeHandle
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        maxWidth={MAX_WIDTH}
        maxHeight={MAX_HEIGHT}
      />
    </div>
  );
}

export const NovelInputNode = memo(NovelInputNodeComponent);
