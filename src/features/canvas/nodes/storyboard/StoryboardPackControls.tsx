import {
  useCallback,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen } from 'lucide-react';

import { saveImageSourceToDirectory } from '@/commands/image';
import type {
  StoryboardExportOptions,
  StoryboardFrameItem,
} from '@/features/canvas/domain/canvasNodes';
import { UiButton, UiPanel } from '@/components/ui';
import {
  NODE_CONTROL_ICON_CLASS,
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';

// ─── file-local helpers (moved verbatim from StoryboardNode) ──────────────────

function sanitizePathSegment(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  const sanitized = Array.from(trimmed)
    .filter((ch) => !/[<>:"/\\|?*]/.test(ch) && ch >= ' ')
    .join('')
    .trim()
    .replace(/\.+$/g, '');

  return sanitized || fallback;
}

function sanitizeExportLabel(raw: string, maxLength = 50): string {
  const compact = sanitizePathSegment(raw, '').replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }
  return compact.slice(0, maxLength);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface StoryboardPackControlsProps {
  nodeId: string;
  frames: StoryboardFrameItem[];
  exportOptions: StoryboardExportOptions;
  /** Whether the sibling export panel is currently busy exporting. */
  isExportBusy: boolean;
  /** Called when the pack-in-progress state changes, so the orchestrator can
   *  pass `siblingExporting` to the export panel. */
  onPackingChange: (isPacking: boolean) => void;
}

export function StoryboardPackControls({
  frames,
  isExportBusy,
  onPackingChange,
}: StoryboardPackControlsProps) {
  const currentProjectName = useProjectStore((state) => state.currentProject?.name);
  const downloadPresetPaths = useSettingsStore((state) => state.downloadPresetPaths);

  const [isPackingSingleImages, setIsPackingSingleImages] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [isPackDoneDialogOpen, setIsPackDoneDialogOpen] = useState(false);
  const [packOutputDir, setPackOutputDir] = useState<string>('');

  const setPackingState = useCallback(
    (next: boolean) => {
      setIsPackingSingleImages(next);
      onPackingChange(next);
    },
    [onPackingChange]
  );

  const resolvePackRootDir = useCallback(async (): Promise<string | null> => {
    const presetPath = downloadPresetPaths.find((path) => path.trim().length > 0)?.trim() ?? '';
    if (presetPath) {
      return presetPath;
    }

    // Web version: no folder picker; return a placeholder to trigger browser download.
    return 'downloads';
  }, [downloadPresetPaths]);

  const handlePackSingleImages = useCallback(async () => {
    if (isExportBusy || isPackingSingleImages) {
      return;
    }

    setPackError(null);
    setPackingState(true);

    try {
      const frameEntries = frames
        .map((frame, index) => ({
          source: frame.imageUrl ?? frame.previewImageUrl ?? '',
          index,
          note: frame.note ?? '',
        }))
        .filter((item) => item.source.length > 0);

      if (frameEntries.length === 0) {
        throw new Error('该分镜没有可导出的图片');
      }

      const rootDir = await resolvePackRootDir();
      if (!rootDir) {
        return;
      }

      const normalizedProjectName = sanitizePathSegment(currentProjectName ?? '', '未命名项目');
      const outputDir = `${rootDir}/${normalizedProjectName}`;
      const fileProjectName = sanitizeExportLabel(normalizedProjectName, 40) || '项目';
      let firstSavedFilePath = '';

      for (const item of frameEntries) {
        const frameNo = String(item.index + 1).padStart(2, '0');
        const noteLabel = sanitizeExportLabel(item.note, 60);
        const fileStem = noteLabel
          ? `${fileProjectName}_${frameNo}_${noteLabel}`
          : `${fileProjectName}_${frameNo}`;
        const savedPath = await saveImageSourceToDirectory(item.source, outputDir, fileStem);
        if (!firstSavedFilePath) {
          firstSavedFilePath = savedPath;
        }
      }

      setPackOutputDir(outputDir);

      setIsPackDoneDialogOpen(true);
    } catch (error) {
      setPackError(error instanceof Error ? error.message : '打包下载失败');
    } finally {
      setPackingState(false);
    }
  }, [
    currentProjectName,
    isExportBusy,
    isPackingSingleImages,
    frames,
    resolvePackRootDir,
    setPackingState,
  ]);

  const handleOpenPackFolder = useCallback(async () => {
    // Web version: no folder opener; this button is a no-op.
    console.info('[StoryboardNode] handleOpenPackFolder: not available in web version.');
  }, []);

  const isAnyExporting = isExportBusy || isPackingSingleImages;

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <UiButton
          size="sm"
          variant="muted"
          className={`nodrag ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
          onClick={(event) => {
            event.stopPropagation();
            void handlePackSingleImages();
          }}
          disabled={isAnyExporting}
        >
          <FolderOpen className={NODE_CONTROL_ICON_CLASS} />
          {isPackingSingleImages ? '打包中...' : '打包下载'}
        </UiButton>
      </div>

      {packError && <div className="mt-2 shrink-0 text-xs text-red-400">{packError}</div>}

      {typeof document !== 'undefined' && isPackDoneDialogOpen
        ? createPortal(
          <div className="fixed inset-0 z-[220] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/55" />
            <UiPanel className="relative w-[440px] p-4">
              <div className="text-sm font-medium text-[var(--canvas-node-fg)]">导出完成</div>
              <div className="mt-2 text-xs text-[var(--canvas-node-fg-muted)]">图片已导出到以下路径：</div>
              <div className="mt-1 break-all rounded border border-[rgba(255,255,255,0.12)] bg-bg-dark/70 px-2 py-1.5 text-xs text-[var(--canvas-node-fg)]">
                {packOutputDir}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <UiButton
                  size="sm"
                  variant="muted"
                  onClick={() => {
                    void handleOpenPackFolder();
                  }}
                >
                  打开文件夹
                </UiButton>
                <UiButton
                  size="sm"
                  variant="primary"
                  onClick={() => setIsPackDoneDialogOpen(false)}
                >
                  确定
                </UiButton>
              </div>
            </UiPanel>
          </div>,
          document.body
        )
        : null}
    </>
  );
}
