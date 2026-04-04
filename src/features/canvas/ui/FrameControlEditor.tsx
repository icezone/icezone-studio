'use client';

import { memo, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { StoryboardFrameMode } from '@/features/canvas/domain/canvasNodes';
import { CanvasNodeImage } from './CanvasNodeImage';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';

export interface FrameControlEditorProps {
  startFrameUrl: string | null | undefined;
  endFrameUrl: string | null | undefined;
  startFrameMode: StoryboardFrameMode;
  endFrameMode: StoryboardFrameMode;
  incomingImages: string[];
  onStartFrameChange: (url: string | null, mode: StoryboardFrameMode) => void;
  onEndFrameChange: (url: string | null, mode: StoryboardFrameMode) => void;
  onClose: () => void;
}

const FRAME_MODE_OPTIONS: StoryboardFrameMode[] = ['none', 'reference', 'strict'];

export const FrameControlEditor = memo(({
  startFrameUrl,
  endFrameUrl,
  startFrameMode,
  endFrameMode,
  incomingImages,
  onStartFrameChange,
  onEndFrameChange,
  onClose,
}: FrameControlEditorProps) => {
  const { t } = useTranslation();

  const modeLabel = useCallback((mode: StoryboardFrameMode): string => {
    switch (mode) {
      case 'none': return t('node.storyboardGen.frameModeNone');
      case 'reference': return t('node.storyboardGen.frameModeReference');
      case 'strict': return t('node.storyboardGen.frameModeStrict');
    }
  }, [t]);

  return (
    <div
      className="nowheel absolute z-30 w-[220px] overflow-hidden rounded-xl border border-[rgba(15,23,42,0.15)] bg-surface-dark shadow-xl dark:border-[rgba(255,255,255,0.1)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.15)] px-2 py-1.5 dark:border-[rgba(255,255,255,0.1)]">
        <span className="text-[10px] font-medium text-text-dark">
          {t('node.storyboardGen.frameControl')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-4 w-4 items-center justify-center rounded text-text-muted hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2 p-2">
        {/* Start Frame */}
        <FrameSlot
          label={t('node.storyboardGen.startFrame')}
          frameUrl={startFrameUrl ?? null}
          mode={startFrameMode}
          incomingImages={incomingImages}
          modeLabel={modeLabel}
          onFrameChange={onStartFrameChange}
        />

        {/* End Frame */}
        <FrameSlot
          label={t('node.storyboardGen.endFrame')}
          frameUrl={endFrameUrl ?? null}
          mode={endFrameMode}
          incomingImages={incomingImages}
          modeLabel={modeLabel}
          onFrameChange={onEndFrameChange}
        />
      </div>
    </div>
  );
});

FrameControlEditor.displayName = 'FrameControlEditor';

interface FrameSlotProps {
  label: string;
  frameUrl: string | null;
  mode: StoryboardFrameMode;
  incomingImages: string[];
  modeLabel: (mode: StoryboardFrameMode) => string;
  onFrameChange: (url: string | null, mode: StoryboardFrameMode) => void;
}

const FrameSlot = memo(({
  label,
  frameUrl,
  mode,
  incomingImages,
  modeLabel,
  onFrameChange,
}: FrameSlotProps) => {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-medium text-text-dark">{label}</span>
        <div className="flex gap-0.5">
          {FRAME_MODE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onFrameChange(frameUrl, m)}
              className={`rounded px-1.5 py-0.5 text-[8px] transition-colors ${
                mode === m
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:bg-white/5'
              }`}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'none' && (
        <div className="flex gap-1">
          {frameUrl ? (
            <div className="relative h-10 w-10 overflow-hidden rounded border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)]">
              <CanvasNodeImage
                src={resolveImageDisplayUrl(frameUrl)}
                alt={label}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onFrameChange(null, mode)}
                className="absolute right-0 top-0 flex h-3 w-3 items-center justify-center rounded-bl bg-black/50 text-white hover:bg-red-500/70"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-[rgba(15,23,42,0.15)] text-text-muted dark:border-[rgba(255,255,255,0.1)]">
              <Upload className="h-3 w-3" />
            </div>
          )}

          {/* Quick select from incoming images */}
          {incomingImages.slice(0, 4).map((url, index) => (
            <button
              key={`incoming-${url}-${index}`}
              type="button"
              onClick={() => onFrameChange(url, mode)}
              className={`h-10 w-10 overflow-hidden rounded border transition-colors ${
                frameUrl === url
                  ? 'border-accent'
                  : 'border-[rgba(15,23,42,0.15)] hover:border-accent/50 dark:border-[rgba(255,255,255,0.1)]'
              }`}
            >
              <CanvasNodeImage
                src={resolveImageDisplayUrl(url)}
                alt={`ref-${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

FrameSlot.displayName = 'FrameSlot';
