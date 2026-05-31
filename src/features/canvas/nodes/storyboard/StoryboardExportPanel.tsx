import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Download, SlidersHorizontal } from 'lucide-react';

import {
  embedStoryboardImageMetadata,
  mergeStoryboardImages,
  type MergeStoryboardImagesResult,
} from '@/commands/image';
import type {
  StoryboardExportOptions,
  StoryboardFrameItem,
} from '@/features/canvas/domain/canvasNodes';
import {
  canvasToDataUrl,
  loadImageElement,
  persistImageLocally,
  reduceAspectRatio,
} from '@/features/canvas/application/imageData';
import { UiButton, UiCheckbox, UiChipButton, UiInput, UiPanel, UiSelect } from '@/components/ui';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_ICON_CLASS,
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';
import { useCanvasStore } from '@/stores/canvasStore';

// ─── file-local helpers (moved verbatim from StoryboardNode) ──────────────────

const EXPORT_MAX_DIMENSION = 4096;
const EXPORT_TRACE_PREFIX = '[StoryboardExport]';

interface PanelAnchor {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function trimTextToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const safeText = text.trim();
  if (!safeText) {
    return '';
  }

  if (context.measureText(safeText).width <= maxWidth) {
    return safeText;
  }

  let content = safeText;
  while (content.length > 1) {
    content = content.slice(0, -1);
    const withEllipsis = `${content}...`;
    if (context.measureText(withEllipsis).width <= maxWidth) {
      return withEllipsis;
    }
  }

  return '...';
}

async function applyStoryboardTextOverlay(
  imageSource: string,
  frames: StoryboardFrameItem[],
  options: StoryboardExportOptions,
  rows: number,
  cols: number,
  layout: MergeStoryboardImagesResult
): Promise<string> {
  if (!options.showFrameIndex && !options.showFrameNote) {
    return imageSource;
  }

  const image = await loadImageElement(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('导出画布初始化失败');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.font = `${Math.max(500, Math.round(layout.fontSize * 1.2))} ${layout.fontSize}px sans-serif`;

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const row = Math.floor(index / Math.max(1, cols));
    const col = index % Math.max(1, cols);
    if (row >= rows) {
      break;
    }

    const x = layout.padding + col * (layout.cellWidth + layout.gap);
    const y = layout.padding + row * (layout.cellHeight + layout.noteHeight + layout.gap);

    if (options.showFrameIndex) {
      const label = `${options.frameIndexPrefix || 'S'}${index + 1}`;
      const badgePaddingX = Math.max(6, Math.round(layout.fontSize * 0.35));
      const badgeHeight = Math.max(18, Math.round(layout.fontSize * 1.15));
      const textWidth = context.measureText(label).width;
      const badgeWidth = Math.round(textWidth + badgePaddingX * 2);

      context.fillStyle = 'rgba(0,0,0,0.65)';
      context.fillRect(x + 6, y + 6, badgeWidth, badgeHeight);
      context.fillStyle = options.textColor;
      context.fillText(label, x + 6 + badgePaddingX, y + 6 + badgeHeight / 2);
    }

    if (options.showFrameNote) {
      const note = trimTextToWidth(
        context,
        frame.note || '',
        Math.max(20, layout.cellWidth - 14)
      );

      if (!note) {
        continue;
      }

      if (options.notePlacement === 'overlay') {
        const overlayHeight = Math.max(18, Math.round(layout.fontSize * 1.35));
        const overlayY = y + layout.cellHeight - overlayHeight;
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(x, overlayY, layout.cellWidth, overlayHeight);
        context.fillStyle = options.textColor;
        context.fillText(note, x + 7, overlayY + overlayHeight / 2);
      } else if (layout.noteHeight > 0) {
        const noteY = y + layout.cellHeight + layout.noteHeight / 2;
        context.fillStyle = options.textColor;
        context.fillText(note, x + 4, noteY);
      }
    }
  }

  return canvasToDataUrl(canvas);
}

// ─── component ────────────────────────────────────────────────────────────────

export interface StoryboardExportPanelProps {
  nodeId: string;
  frames: StoryboardFrameItem[];
  exportOptions: StoryboardExportOptions;
  gridRows: number;
  gridCols: number;
  /** Apply a partial update to the storyboardSplit node's exportOptions. */
  onExportOptionsChange: (patch: Partial<StoryboardExportOptions>) => void;
  /** Called when the export-in-progress state changes, so the orchestrator can gate other buttons. */
  onExportingChange?: (isExporting: boolean) => void;
  /** When true, disables both buttons (e.g. pack is running). */
  siblingExporting?: boolean;
}

export function StoryboardExportPanel({
  nodeId,
  frames,
  exportOptions,
  gridRows,
  gridCols,
  onExportOptionsChange,
  onExportingChange,
  siblingExporting = false,
}: StoryboardExportPanelProps) {
  const addDerivedExportNode = useCanvasStore((state) => state.addDerivedExportNode);
  const addEdge = useCanvasStore((state) => state.addEdge);

  const [isExporting, setIsExportingState] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isExportPanelVisible, setIsExportPanelVisible] = useState(false);
  const [exportPanelAnchor, setExportPanelAnchor] = useState<PanelAnchor | null>(null);

  const exportSettingsTriggerRef = useRef<HTMLDivElement>(null);
  const exportSettingsPanelRef = useRef<HTMLDivElement>(null);

  const setIsExporting = useCallback((value: boolean) => {
    setIsExportingState(value);
    onExportingChange?.(value);
  }, [onExportingChange]);

  // ── visibility animation effect ──────────────────────────────────────────
  useEffect(() => {
    if (!isExportPanelOpen) {
      setIsExportPanelVisible(false);
      return;
    }

    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsExportPanelVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) {
        cancelAnimationFrame(raf2);
      }
    };
  }, [isExportPanelOpen]);

  // ── outside-click effect (export panel only) ─────────────────────────────
  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const insideExportPanel = exportSettingsPanelRef.current?.contains(target) ?? false;
      const insideExportTrigger = exportSettingsTriggerRef.current?.contains(target) ?? false;

      if (!insideExportPanel && !insideExportTrigger) {
        setIsExportPanelOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    };
  }, []);

  // ── getPanelAnchor ───────────────────────────────────────────────────────
  const getPanelAnchor = useCallback((triggerElement: HTMLDivElement | null): PanelAnchor | null => {
    if (!triggerElement) {
      return null;
    }
    const rect = triggerElement.getBoundingClientRect();
    return {
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    };
  }, []);

  // ── patchExportOptions ───────────────────────────────────────────────────
  const patchExportOptions = useCallback(
    (patch: Partial<StoryboardExportOptions>) => {
      onExportOptionsChange(patch);
    },
    [onExportOptionsChange]
  );

  // ── handleExport (moved verbatim) ────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }

    const traceId = `${nodeId}-${Date.now()}`;
    const traceStart = performance.now();
    console.info(`${EXPORT_TRACE_PREFIX} start`, {
      traceId,
      nodeId,
      rows: gridRows,
      cols: gridCols,
      frameCount: frames.length,
    });

    setIsExporting(true);
    setExportError(null);

    try {
      const stageFrameStart = performance.now();
      const frameSources = frames.map(
        (frame) => frame.imageUrl ?? frame.previewImageUrl ?? ''
      );
      if (frameSources.every((source) => !source)) {
        throw new Error('没有可导出的图片');
      }
      console.info(`${EXPORT_TRACE_PREFIX} frame-sources-ready`, {
        traceId,
        elapsedMs: Math.round(performance.now() - stageFrameStart),
        nonEmptyFrames: frameSources.filter((source) => source.length > 0).length,
      });

      const options = exportOptions;
      const rawGap = clamp(Math.round(options.cellGap), 0, 120);
      const rawPadding = 0;
      const fontPercent = clamp(Number.isFinite(options.fontSize) ? options.fontSize : 4, 1, 20);
      const firstFrameSource = frameSources.find((source) => source.length > 0) ?? null;
      let referenceFrameHeight = 1024;
      if (firstFrameSource) {
        const fontProbeStart = performance.now();
        try {
          const referenceImage = await loadImageElement(firstFrameSource);
          referenceFrameHeight = Math.max(
            64,
            referenceImage.naturalHeight || referenceImage.height || referenceFrameHeight
          );
        } catch {
          // Keep fallback size when reference frame cannot be read.
        }
        console.info(`${EXPORT_TRACE_PREFIX} font-reference-resolved`, {
          traceId,
          elapsedMs: Math.round(performance.now() - fontProbeStart),
          referenceFrameHeight,
        });
      }
      const rawFontSize = clamp(
        Math.round(referenceFrameHeight * (fontPercent / 100)),
        10,
        240
      );
      const rawNoteHeight =
        options.showFrameNote && options.notePlacement === 'bottom'
          ? Math.max(Math.round(rawFontSize * 1.7), 24)
          : 0;

      const mergeStart = performance.now();
      const mergeResult = await mergeStoryboardImages({
        frameSources,
        rows: gridRows,
        cols: gridCols,
        cellGap: rawGap,
        outerPadding: rawPadding,
        noteHeight: rawNoteHeight,
        fontSize: rawFontSize,
        backgroundColor: options.backgroundColor,
        maxDimension: EXPORT_MAX_DIMENSION,
        showFrameIndex: options.showFrameIndex,
        showFrameNote: options.showFrameNote,
        notePlacement: options.notePlacement,
        imageFit: options.imageFit,
        frameIndexPrefix: options.frameIndexPrefix,
        textColor: options.textColor,
        frameNotes: frames.map((frame) => frame.note ?? ''),
      });
      console.info(`${EXPORT_TRACE_PREFIX} merge-done`, {
        traceId,
        elapsedMs: Math.round(performance.now() - mergeStart),
        canvasWidth: mergeResult.canvasWidth,
        canvasHeight: mergeResult.canvasHeight,
        textOverlayApplied: mergeResult.textOverlayApplied,
      });

      const aspectRatio = reduceAspectRatio(mergeResult.canvasWidth, mergeResult.canvasHeight);
      const needsOverlay = (options.showFrameIndex || options.showFrameNote) && !mergeResult.textOverlayApplied;
      let finalImagePath = mergeResult.imagePath;
      let finalPreviewPath = mergeResult.imagePath;

      if (needsOverlay) {
        const overlayStart = performance.now();
        const mergedBlob = await applyStoryboardTextOverlay(
          mergeResult.imagePath,
          frames,
          options,
          gridRows,
          gridCols,
          mergeResult
        );
        console.info(`${EXPORT_TRACE_PREFIX} overlay-done`, {
          traceId,
          elapsedMs: Math.round(performance.now() - overlayStart),
          dataUrlLength: mergedBlob.length,
        });
        const persistStart = performance.now();
        finalImagePath = await persistImageLocally(mergedBlob);
        finalPreviewPath = finalImagePath;
        console.info(`${EXPORT_TRACE_PREFIX} overlay-persisted`, {
          traceId,
          elapsedMs: Math.round(performance.now() - persistStart),
          persistedPath: finalImagePath,
        });
      }

      const metadataStart = performance.now();
      const metadataFrameNotes = frames.map((frame) => frame.note ?? '');
      const imagePathWithMetadata = await embedStoryboardImageMetadata(finalImagePath, {
        gridRows,
        gridCols,
        frameNotes: metadataFrameNotes,
      }).catch((error) => {
        console.warn('[StoryboardMetadata] embed failed on storyboard export', error);
        return finalImagePath;
      });
      finalImagePath = imagePathWithMetadata;
      finalPreviewPath = imagePathWithMetadata;
      console.info(`${EXPORT_TRACE_PREFIX} metadata-embedded`, {
        traceId,
        elapsedMs: Math.round(performance.now() - metadataStart),
        imagePath: finalImagePath,
      });

      const createNodeStart = performance.now();
      const createdNodeId = addDerivedExportNode(
        nodeId,
        finalImagePath,
        aspectRatio,
        finalPreviewPath,
        {
          defaultTitle: '切割导出',
        }
      );
      console.info(`${EXPORT_TRACE_PREFIX} derived-node-created`, {
        traceId,
        elapsedMs: Math.round(performance.now() - createNodeStart),
        createdNodeId,
      });

      if (createdNodeId) {
        addEdge(nodeId, createdNodeId);
      }
      console.info(`${EXPORT_TRACE_PREFIX} done`, {
        traceId,
        totalElapsedMs: Math.round(performance.now() - traceStart),
      });
    } catch (error) {
      console.error(`${EXPORT_TRACE_PREFIX} failed`, {
        traceId,
        elapsedMs: Math.round(performance.now() - traceStart),
        error,
      });
      setExportError(error instanceof Error ? error.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [
    addDerivedExportNode,
    addEdge,
    exportOptions,
    gridCols,
    gridRows,
    nodeId,
    isExporting,
    frames,
    setIsExporting,
  ]);

  const isAnyExporting = isExporting || siblingExporting;

  return (
    <>
      {/* Trigger button (settings chip) */}
      <div ref={exportSettingsTriggerRef} className="nodrag relative flex">
        <UiChipButton
          active={isExportPanelOpen}
          className={NODE_CONTROL_CHIP_CLASS}
          onClick={(event) => {
            event.stopPropagation();
            if (isExportPanelOpen) {
              setIsExportPanelOpen(false);
              return;
            }
            setExportPanelAnchor(getPanelAnchor(exportSettingsTriggerRef.current));
            setIsExportPanelOpen(true);
          }}
        >
          <SlidersHorizontal className={`${NODE_CONTROL_ICON_CLASS} shrink-0`} />
          <span>导出设置</span>
        </UiChipButton>
      </div>

      {/* Export button */}
      <UiButton
        size="sm"
        variant="primary"
        className={`nodrag ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
        onClick={(event) => {
          event.stopPropagation();
          void handleExport();
        }}
        disabled={isAnyExporting}
      >
        <Download className={NODE_CONTROL_ICON_CLASS} />
        {isExporting ? '导出中...' : '合并分镜'}
      </UiButton>

      {/* Export error */}
      {exportError && <div className="mt-2 shrink-0 text-xs text-red-400">{exportError}</div>}

      {/* Export options popover */}
      {typeof document !== 'undefined' && isExportPanelOpen && createPortal(
        <div
          ref={exportSettingsPanelRef}
          className={`fixed z-[120] w-[340px] transition-opacity duration-200 ease-out ${isExportPanelVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          style={exportPanelAnchor
            ? {
              left: exportPanelAnchor.left,
              top: exportPanelAnchor.top,
              transform: 'translateX(-50%) translateY(-100%)',
            }
            : undefined}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <UiPanel className="p-2.5">
            <div className="space-y-2 text-xs text-[var(--canvas-node-fg-muted)]">
              <label className="flex items-center gap-2">
                <UiCheckbox
                  checked={exportOptions.showFrameIndex}
                  onCheckedChange={(checked) => patchExportOptions({ showFrameIndex: checked })}
                />
                显示分镜序号
              </label>

              <label className="flex items-center gap-2">
                <UiCheckbox
                  checked={exportOptions.showFrameNote}
                  onCheckedChange={(checked) => patchExportOptions({ showFrameNote: checked })}
                />
                显示分镜描述
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1">图片填充</div>
                  <UiSelect
                    value={exportOptions.imageFit}
                    onChange={(event) =>
                      patchExportOptions({
                        imageFit: event.target.value === 'contain' ? 'contain' : 'cover',
                      })
                    }
                  >
                    <option value="cover">填充满格子</option>
                    <option value="contain">完整显示</option>
                  </UiSelect>
                </div>
                <div>
                  <div className="mb-1">序号前缀</div>
                  <UiInput
                    value={exportOptions.frameIndexPrefix}
                    maxLength={4}
                    className="h-8"
                    onChange={(event) => patchExportOptions({ frameIndexPrefix: event.target.value })}
                  />
                </div>
                <div>
                  <div className="mb-1">描述位置</div>
                  <UiSelect
                    value={exportOptions.notePlacement}
                    onChange={(event) =>
                      patchExportOptions({
                        notePlacement: event.target.value === 'bottom' ? 'bottom' : 'overlay',
                      })
                    }
                  >
                    <option value="overlay">图上遮罩</option>
                    <option value="bottom">图下文字</option>
                  </UiSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1">间距</div>
                  <UiInput
                    type="number"
                    min={0}
                    max={120}
                    value={exportOptions.cellGap}
                    className="h-8"
                    onChange={(event) =>
                      patchExportOptions({ cellGap: Number(event.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <div className="mb-1">字号(%)</div>
                  <UiInput
                    type="number"
                    min={1}
                    max={20}
                    value={exportOptions.fontSize}
                    className="h-8"
                    onChange={(event) =>
                      patchExportOptions({ fontSize: Number(event.target.value) || 4 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <span>背景</span>
                  <input
                    type="color"
                    value={exportOptions.backgroundColor}
                    onChange={(event) => patchExportOptions({ backgroundColor: event.target.value })}
                    className="h-7 w-full rounded border border-[rgba(255,255,255,0.14)] bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span>文字</span>
                  <input
                    type="color"
                    value={exportOptions.textColor}
                    onChange={(event) => patchExportOptions({ textColor: event.target.value })}
                    className="h-7 w-full rounded border border-[rgba(255,255,255,0.14)] bg-transparent"
                  />
                </label>
              </div>
            </div>
          </UiPanel>
        </div>,
        document.body
      )}
    </>
  );
}
