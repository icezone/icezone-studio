import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';

export interface VideoGenFramePickerIncomingImage {
  imageUrl: string;
  displayUrl: string;
  label: string;
}

export interface VideoGenFramePickerProps {
  position: 'start' | 'end';
  frameUrl: string | null;
  /** Upstream images available to pick from. */
  incomingImages: VideoGenFramePickerIncomingImage[];
  /** Whether the upstream-picker popover is open for this position. */
  pickerOpen: boolean;
  /** Open/close this picker. */
  onPickerOpenChange: (open: boolean) => void;
  /** Called when this picker opens so the orchestrator can close the other one. */
  onClosedOther: () => void;
  /** Pick an upstream image as the frame. */
  onPickFromUpstream: (imageUrl: string) => void;
  /** Trigger the orchestrator-owned hidden file input for this position. */
  onPickFromUpload: () => void;
  /** Clear the current frame. */
  onClear: () => void;
}

export function VideoGenFramePicker({
  position,
  frameUrl,
  incomingImages,
  pickerOpen,
  onPickerOpenChange,
  onClosedOther,
  onPickFromUpstream,
  onPickFromUpload,
  onClear,
}: VideoGenFramePickerProps) {
  const { t } = useTranslation();

  const labelKey = position === 'start' ? 'node.videoGen.startFrame' : 'node.videoGen.endFrame';
  const label = t(labelKey);

  return (
    <div className="relative flex-1">
      <div className="mb-1.5 text-xs text-[var(--canvas-node-fg-muted)]">
        {label}
        {position === 'end' && (
          <span className="ml-1 text-[10px] text-[var(--canvas-node-fg-muted)]/60">({t('node.videoGen.optional')})</span>
        )}
      </div>
      {frameUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-accent ring-2 ring-accent/30">
          <img
            src={resolveImageDisplayUrl(frameUrl)}
            alt={label}
            className="h-full w-full object-cover"
          />
          <button
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white transition-colors hover:bg-black/80"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          className="nodrag flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-[var(--canvas-drop-zone-border)] transition-colors hover:border-[var(--canvas-node-hover-border)] hover:bg-[var(--canvas-drop-zone-hover-bg)]"
          onClick={(e) => {
            e.stopPropagation();
            if (incomingImages.length > 0) {
              onPickerOpenChange(!pickerOpen);
              onClosedOther();
            } else {
              onPickFromUpload();
            }
          }}
        >
          <ImagePlus className="h-5 w-5 text-[var(--canvas-node-fg-muted)]/60" />
        </button>
      )}
      {pickerOpen && incomingImages.length > 0 && !frameUrl && (
        <div
          className="nowheel absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-[var(--canvas-node-border)] bg-[var(--canvas-menu-bg)] shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="ui-scrollbar nowheel max-h-[200px] overflow-y-auto p-1.5">
            {incomingImages.map((item, index) => (
              <button
                key={`${position}-pick-${index}`}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[var(--canvas-node-fg)] transition-colors hover:bg-[var(--canvas-menu-item-hover)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onPickFromUpstream(item.imageUrl);
                  onPickerOpenChange(false);
                }}
              >
                <img src={item.displayUrl} alt={item.label} className="h-8 w-8 rounded object-cover" draggable={false} />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[var(--canvas-node-fg-muted)] transition-colors hover:bg-[var(--canvas-menu-item-hover)]"
              onClick={(e) => {
                e.stopPropagation();
                onPickerOpenChange(false);
                onPickFromUpload();
              }}
            >
              <ImagePlus className="h-4 w-4" />
              <span>{t('node.videoGen.uploadImage')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
