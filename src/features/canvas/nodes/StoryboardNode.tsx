import {
  memo,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useNodeExpanded } from './shared/useNodeExpanded';
import { useStoryboardSort } from './storyboard/useStoryboardSort';
import { NodeTypeBadge } from '@/features/canvas/ui/NodeTypeBadge';
import { createPortal } from 'react-dom';
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  useViewport,
  type NodeProps,
} from '@xyflow/react';
import { ImagePlus, SquareArrowOutUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Web version: Tauri dialog/opener/path replaced with browser APIs
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';

import { CanvasNodeImage } from '@/features/canvas/ui/CanvasNodeImage';
import type {
  CanvasNode,
  StoryboardExportOptions,
  StoryboardFrameItem,
  StoryboardSplitNodeData,
} from '@/features/canvas/domain/canvasNodes';
import {
  CANVAS_NODE_TYPES,
  isImageEditNode,
  isUploadNode,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import {
  prepareNodeImage,
  resolveImageDisplayUrl,
  shouldUseOriginalImageByZoom,
} from '@/features/canvas/application/imageData';
import { useCanvasStore } from '@/stores/canvasStore';
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker';
import { StoryboardExportPanel } from './storyboard/StoryboardExportPanel';
import { StoryboardPackControls } from './storyboard/StoryboardPackControls';

type StoryboardNodeProps = NodeProps & {
  id: string;
  data: StoryboardSplitNodeData;
  selected?: boolean;
};

const STORYBOARD_NODE_WIDTH_PX = 318;
const STORYBOARD_NODE_MIN_HEIGHT_PX = 320;
const STORYBOARD_GRID_GAP_PX = 1;
const STORYBOARD_SPLIT_HEADER_ADJUST = { x: 0, y: 0, scale: 1 };
const STORYBOARD_SPLIT_ICON_ADJUST = { x: 0, y: 0, scale: 1 };
const STORYBOARD_SPLIT_TITLE_ADJUST = { x: 0, y: 0, scale: 1 };

function SplitResultIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 0c1.66 0 3 1.34 3 3v3l2.4-1.5a3.003 3.003 0 0 1 3 5.2a3.003 3.003 0 0 1-4.452-2.051l-.952.55v6.8h-2v-5.65l-4.01 2.32l-.988-1.73l5-2.94v-1.17a2.996 2.996 0 0 1-4-2.829c0-1.66 1.34-3 3-3zM9 3a1 1 0 0 0 2 0a1 1 0 0 0-2 0m7 4a1 1 0 0 0 2 0a1 1 0 0 0-2 0M2.97 19h2v-2h-2V9h3V7h-3c-1.1 0-2 .895-2 2v8c0 1.1.895 2 2 2m6 0h-2v-2h2zm4-2c0 1.1-.895 2-2 2v-2z" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}


function toCssAspectRatio(aspectRatio: string): string {
  const [rawWidth = '1', rawHeight = '1'] = aspectRatio.split(':');
  const width = Number(rawWidth);
  const height = Number(rawHeight);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1 / 1';
  }

  return `${width} / ${height}`;
}

function createDefaultExportOptions(): StoryboardExportOptions {
  return {
    showFrameIndex: false,
    showFrameNote: false,
    notePlacement: 'overlay',
    imageFit: 'cover',
    frameIndexPrefix: 'S',
    cellGap: 8,
    outerPadding: 0,
    fontSize: 4,
    backgroundColor: '#0f1115',
    textColor: '#f8fafc',
  };
}

function resolveExportOptions(options: StoryboardSplitNodeData['exportOptions']): StoryboardExportOptions {
  const merged = {
    ...createDefaultExportOptions(),
    ...(options ?? {}),
  };

  const rawFontSize = Number.isFinite(merged.fontSize) ? merged.fontSize : 4;
  const normalizedFontPercent = rawFontSize > 20
    ? Math.round(rawFontSize / 6)
    : rawFontSize;

  return {
    ...merged,
    fontSize: clamp(Math.round(normalizedFontPercent), 1, 20),
  };
}

interface FrameCardProps {
  nodeId: string;
  frame: StoryboardFrameItem;
  index: number;
  frameAspectRatioCss: string;
  imageFit: StoryboardExportOptions['imageFit'];
  viewerImageList: string[];
  draggedFrameId: string | null;
  dropTargetFrameId: string | null;
  onSortStart: (frameId: string) => void;
  onSortHover: (frameId: string) => void;
  onTogglePicker: (frameId: string, x: number, y: number) => void;
  onEditFrame: (frame: StoryboardFrameItem) => void;
}

interface IncomingImageItem {
  imageUrl: string;
  previewImageUrl: string | null;
  displayUrl: string;
  label: string;
}

const FrameCard = memo(
  ({
    nodeId,
    frame,
    index,
    frameAspectRatioCss,
    imageFit,
    viewerImageList,
    draggedFrameId,
    dropTargetFrameId,
    onSortStart,
    onSortHover,
    onTogglePicker,
    onEditFrame,
  }: FrameCardProps) => {
    const updateStoryboardFrame = useCanvasStore((state) => state.updateStoryboardFrame);
    const { zoom } = useViewport();
    const noteRef = useRef<HTMLTextAreaElement>(null);

    const handlePresetInsert = (content: string) => {
      const el = noteRef.current;
      if (!el) return;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = (frame.note ?? '').slice(0, start) + content + (frame.note ?? '').slice(end);
      updateStoryboardFrame(nodeId, frame.id, { note: next });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + content.length, start + content.length);
      });
    };

    const imageSource = useMemo(() => {
      const preferOriginal = shouldUseOriginalImageByZoom(zoom);
      const picked = preferOriginal
        ? frame.imageUrl || frame.previewImageUrl
        : frame.previewImageUrl || frame.imageUrl;
      return picked ? resolveImageDisplayUrl(picked) : null;
    }, [frame.imageUrl, frame.previewImageUrl, zoom]);
    const viewerSource = useMemo(() => {
      const picked = frame.imageUrl || frame.previewImageUrl;
      return picked ? resolveImageDisplayUrl(picked) : null;
    }, [frame.imageUrl, frame.previewImageUrl]);

    const dragging = draggedFrameId === frame.id;
    const asDropTarget = dropTargetFrameId === frame.id && !dragging;

    return (
      <div
        onPointerEnter={(event) => {
          event.stopPropagation();
          onSortHover(frame.id);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onSortHover(frame.id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`nodrag relative bg-[var(--canvas-node-section-bg)] transition-colors ${dragging
          ? 'z-10 opacity-55 ring-1 ring-accent/65'
          : asDropTarget
            ? 'z-10 ring-1 ring-emerald-400/70'
            : ''
          }`}
      >
        <div
          className={`group/frame relative overflow-hidden bg-[var(--canvas-node-section-bg)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ aspectRatio: frameAspectRatioCss }}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onSortStart(frame.id);
          }}
        >
          {frame.imageUrl ? (
            <CanvasNodeImage
              src={imageSource ?? ''}
              alt={`Frame ${index + 1}`}
              viewerSourceUrl={viewerSource}
              viewerImageList={viewerImageList}
              className={`h-full w-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--canvas-node-fg-muted)]">
              空分镜
            </div>
          )}

          <button
            type="button"
            className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-all duration-150 hover:bg-black/75 group-hover/frame:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEditFrame(frame);
            }}
            title="单独编辑此格"
          >
            <SquareArrowOutUpRight className="h-3 w-3" />
          </button>

          <button
            type="button"
            className="absolute bottom-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition-all duration-150 hover:bg-black/75 group-hover/frame:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePicker(frame.id, event.clientX, event.clientY);
            }}
            title="从输入图片替换"
          >
            <ImagePlus className="h-3 w-3" />
          </button>
        </div>

        <div className="flex justify-end px-1 pt-1">
          <PresetPickerButton onInsert={handlePresetInsert} />
        </div>
        <textarea
          ref={noteRef}
          value={frame.note}
          onChange={(event) => {
            const nextValue = event.target.value;
            updateStoryboardFrame(nodeId, frame.id, {
              note: nextValue,
            });
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onWheelCapture={(event) => event.stopPropagation()}
          placeholder={`分镜 ${String(index + 1).padStart(2, '0')} 描述`}
          className="ui-scrollbar nodrag nowheel h-10 w-full resize-none overflow-y-auto border-0 border-t border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] px-2 py-1 text-[10px] text-[var(--canvas-node-fg)] outline-none focus:border-accent"
        />
      </div>
    );
  }
);

FrameCard.displayName = 'FrameCard';

export const StoryboardNode = memo(({ id, data, selected, width, height }: StoryboardNodeProps) => {
  const { t } = useTranslation();
  const updateNodeInternals = useUpdateNodeInternals();
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerMenuRef = useRef<HTMLDivElement>(null);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const reorderStoryboardFrame = useCanvasStore((state) => state.reorderStoryboardFrame);
  const addDerivedExportNode = useCanvasStore((state) => state.addDerivedExportNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const updateStoryboardFrame = useCanvasStore((state) => state.updateStoryboardFrame);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [pickerState, setPickerState] = useState<{ frameId: string; x: number; y: number } | null>(null);
  const [isExportBusy, setIsExportBusy] = useState(false);
  const [isPackingSingleImages, setIsPackingSingleImages] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);


  const orderedFrames = useMemo(
    () => [...data.frames].sort((a, b) => a.order - b.order),
    [data.frames]
  );

  const frameAspectRatio = useMemo(() => {
    return (
      data.frameAspectRatio ??
      orderedFrames.find((frame) => typeof frame.aspectRatio === 'string')?.aspectRatio ??
      '1:1'
    );
  }, [data.frameAspectRatio, orderedFrames]);

  const frameAspectRatioCss = useMemo(
    () => toCssAspectRatio(frameAspectRatio),
    [frameAspectRatio]
  );

  const gridCols = Math.max(1, data.gridCols);
  const gridRows = Math.max(1, data.gridRows);
  const totalFrames = orderedFrames.length;
  const resolvedNodeWidth = Math.max(STORYBOARD_NODE_WIDTH_PX, Math.round(width ?? STORYBOARD_NODE_WIDTH_PX));
  const resolvedNodeHeight = Math.max(
    STORYBOARD_NODE_MIN_HEIGHT_PX,
    Math.round(height ?? STORYBOARD_NODE_MIN_HEIGHT_PX)
  );

  const { expanded, expand, collapse } = useNodeExpanded();
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  useEffect(() => {
    if (selectedNodeId !== id) collapse();
  }, [selectedNodeId, id, collapse]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, resolvedNodeHeight, resolvedNodeWidth, expanded, updateNodeInternals]);

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.storyboardSplit, data, t),
    [data, t]
  );

  const exportOptions = useMemo(
    () => resolveExportOptions(data.exportOptions),
    [data.exportOptions]
  );

  const incomingImageRefs = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const sourceNodeIds = edges
      .filter((edge) => edge.target === id)
      .map((edge) => edge.source);

    const dedupedByImageUrl = new Map<string, { imageUrl: string; previewImageUrl: string | null }>();
    for (const sourceNodeId of sourceNodeIds) {
      const sourceNode = nodeById.get(sourceNodeId) as CanvasNode | undefined;
      if (!sourceNode) {
        continue;
      }
      if (!isUploadNode(sourceNode) && !isImageEditNode(sourceNode)) {
        continue;
      }
      const imageUrl = sourceNode.data.imageUrl;
      if (!imageUrl) {
        continue;
      }
      if (!dedupedByImageUrl.has(imageUrl)) {
        dedupedByImageUrl.set(imageUrl, {
          imageUrl,
          previewImageUrl: sourceNode.data.previewImageUrl ?? null,
        });
      }
    }

    return Array.from(dedupedByImageUrl.values());
  }, [edges, id, nodes]);

  const incomingImageItems = useMemo<IncomingImageItem[]>(
    () =>
      incomingImageRefs.map((item, index) => ({
        imageUrl: item.imageUrl,
        previewImageUrl: item.previewImageUrl,
        displayUrl: resolveImageDisplayUrl(item.previewImageUrl || item.imageUrl),
        label: `图${index + 1}`,
      })),
    [incomingImageRefs]
  );
  const frameViewerImageList = useMemo(
    () =>
      orderedFrames
        .map((frame) => {
          const source = frame.imageUrl || frame.previewImageUrl;
          return source ? resolveImageDisplayUrl(source) : null;
        })
        .filter((item): item is string => Boolean(item)),
    [orderedFrames]
  );
  const incomingImageViewerList = useMemo(
    () => incomingImageItems.map((item) => resolveImageDisplayUrl(item.imageUrl)),
    [incomingImageItems]
  );

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) {
        return;
      }

      const target = event.target as Node;
      const insideRoot = rootRef.current.contains(target);
      const insidePickerMenu = pickerMenuRef.current?.contains(target) ?? false;

      if (!insideRoot && !insidePickerMenu) {
        setPickerState(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    };
  }, []);

  const onSortDragStart = useCallback(() => {
    setPickerState(null);
  }, []);

  const onReorder = useCallback(
    (draggedId: string, dropTargetId: string) => {
      reorderStoryboardFrame(id, draggedId, dropTargetId);
    },
    [id, reorderStoryboardFrame]
  );

  const { draggedFrameId, dropTargetFrameId, handleSortStart, handleSortHover } =
    useStoryboardSort({ onReorder, onDragStart: onSortDragStart });

  const handleEditFrame = useCallback(
    async (frame: StoryboardFrameItem) => {
      try {
        const sourceImage = frame.imageUrl ?? frame.previewImageUrl;
        if (!sourceImage) {
          setNodeError('该分镜没有可编辑图片');
          return;
        }
        const frameIndex = orderedFrames.findIndex((item) => item.id === frame.id);
        const frameTitle = frameIndex >= 0
          ? `分镜 ${frameIndex + 1}`
          : '分镜帧';

        const prepared = await prepareNodeImage(sourceImage);
        const createdNodeId = addDerivedExportNode(
          id,
          prepared.imageUrl,
          prepared.aspectRatio,
          prepared.previewImageUrl,
          {
            defaultTitle: frameTitle,
          }
        );

        if (createdNodeId) {
          addEdge(id, createdNodeId);
        }
      } catch (error) {
        setNodeError(error instanceof Error ? error.message : '创建编辑节点失败');
      }
    },
    [addDerivedExportNode, addEdge, id, orderedFrames]
  );

  const handleTogglePicker = useCallback((frameId: string, x: number, y: number) => {
    setPickerState((previous) => {
      if (previous?.frameId === frameId) {
        return null;
      }
      return { frameId, x, y };
    });
  }, []);

  const handleReplaceFromInput = useCallback(
    (frameId: string, imageUrl: string) => {
      setNodeError(null);
      const matched = incomingImageItems.find((item) => item.imageUrl === imageUrl);
      updateStoryboardFrame(id, frameId, {
        imageUrl: matched?.imageUrl ?? imageUrl,
        previewImageUrl: matched?.previewImageUrl ?? matched?.imageUrl ?? imageUrl,
      });
      setPickerState(null);
    },
    [id, incomingImageItems, updateStoryboardFrame]
  );

  return (
    <div className="node-wrap node-preview-wrap" style={{ width: `${resolvedNodeWidth}px` }} data-testid="node-storyboard">
        <div className="node-preview-area">
          <Handle
            type="target"
            id="target"
            position={Position.Left}
          />
          <Handle
            type="source"
            id="source"
            position={Position.Right}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => { setSelectedNode(id); expand(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(); } }}
            className={`node-preview-card${selected ? ' node-preview-card--selected' : ''}`}
          >
            <div className="node-preview-header">
              <SplitResultIcon className="h-3.5 w-3.5" />
              <NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardSplit} />
              <span>{resolvedTitle}</span>
            </div>
            <div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
              {orderedFrames.length > 0 ? (
                <div className="flex h-full w-full">
                  {orderedFrames.slice(0, 4).map((frame, i) => (
                    <div key={i} className="flex-1 overflow-hidden bg-[var(--canvas-node-section-bg)]">
                      {frame.imageUrl && (
                        <img src={frame.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <SplitResultIcon className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
              )}
            </div>
          </div>
        </div>

      {expanded && (
        <div className="node-gap-dots">
          <span className="node-dot" /><span className="node-dot" /><span className="node-dot" />
        </div>
      )}

      {expanded && (
        <div
          ref={rootRef}
          onClick={(e) => e.stopPropagation()}
          className="node-settings-panel"
        >
          <NodeHeader
            icon={<SplitResultIcon className="h-3.5 w-3.5" />}
            titleText={resolvedTitle}
            headerAdjust={STORYBOARD_SPLIT_HEADER_ADJUST}
            iconAdjust={STORYBOARD_SPLIT_ICON_ADJUST}
            titleAdjust={STORYBOARD_SPLIT_TITLE_ADJUST}
            editable
            onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
          />

          <div
            className="ui-scrollbar nowheel min-h-0 flex-1 overflow-auto"
            onWheelCapture={(event) => event.stopPropagation()}
          >
            <div
              className="grid overflow-hidden rounded-lg border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)]"
              style={{
                gap: `${STORYBOARD_GRID_GAP_PX}px`,
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }}
            >
              {orderedFrames.map((frame, index) => (
                <FrameCard
                  key={frame.id}
                  nodeId={id}
                  frame={frame}
                  index={index}
                  frameAspectRatioCss={frameAspectRatioCss}
                  imageFit={exportOptions.imageFit}
                  viewerImageList={frameViewerImageList}
                  draggedFrameId={draggedFrameId}
                  dropTargetFrameId={dropTargetFrameId}
                  onSortStart={handleSortStart}
                  onSortHover={handleSortHover}
                  onTogglePicker={handleTogglePicker}
                  onEditFrame={(targetFrame) => {
                    void handleEditFrame(targetFrame);
                  }}
                />
              ))}
            </div>
          </div>

          {pickerState && typeof document !== 'undefined'
            ? createPortal(
              <div
                ref={pickerMenuRef}
                className="nowheel fixed z-[140] w-[120px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl"
                style={{ left: `${pickerState.x}px`, top: `${pickerState.y}px` }}
                onMouseDown={(event) => event.stopPropagation()}
                onWheelCapture={(event) => event.stopPropagation()}
              >
                {incomingImageItems.length > 0 ? (
                  <div
                    className="ui-scrollbar nowheel max-h-[180px] overflow-y-auto"
                    onWheelCapture={(event) => event.stopPropagation()}
                  >
                    {incomingImageItems.map((item) => (
                      <button
                        key={`${pickerState.frameId}-${item.imageUrl}`}
                        type="button"
                        className="flex w-full items-center gap-2 border border-transparent bg-bg-dark/70 px-2 py-2 text-left text-sm text-[var(--canvas-node-fg)] transition-colors hover:border-[rgba(255,255,255,0.18)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReplaceFromInput(pickerState.frameId, item.imageUrl);
                        }}
                        title={item.label}
                      >
                        <CanvasNodeImage
                          src={item.displayUrl}
                          alt={item.label}
                          viewerSourceUrl={resolveImageDisplayUrl(item.imageUrl)}
                          viewerImageList={incomingImageViewerList}
                          className="h-8 w-8 rounded object-cover"
                          draggable={false}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-2 text-sm text-[var(--canvas-node-fg-muted)]">
                    暂无输入图片
                  </div>
                )}
              </div>,
              document.body
            )
            : null}

          <div className="mt-2 flex shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[11px] text-[var(--canvas-node-fg-muted)]/80">
                {gridRows} x {gridCols} | {totalFrames} 格
              </div>
              <StoryboardPackControls
                nodeId={id}
                frames={orderedFrames}
                exportOptions={exportOptions}
                isExportBusy={isExportBusy}
                onPackingChange={setIsPackingSingleImages}
              />
            </div>
            <div className="flex items-center gap-2">
              <StoryboardExportPanel
                nodeId={id}
                frames={orderedFrames}
                exportOptions={exportOptions}
                gridRows={gridRows}
                gridCols={gridCols}
                onExportOptionsChange={(patch) => updateNodeData(id, { exportOptions: { ...exportOptions, ...patch } })}
                onExportingChange={setIsExportBusy}
                siblingExporting={isPackingSingleImages}
              />
            </div>
          </div>

          {nodeError && <div className="mt-2 shrink-0 text-xs text-red-400">{nodeError}</div>}
        </div>
      )}

    </div>
  );
});

StoryboardNode.displayName = 'StoryboardNode';
