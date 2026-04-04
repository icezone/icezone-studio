'use client';

import { memo, useCallback } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { UiButton } from '@/components/ui';
import { CanvasNodeImage } from './CanvasNodeImage';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';

export interface FrameReferenceEditorProps {
  referenceImageUrls: string[];
  referenceWeights: number[];
  incomingImages: string[];
  onReferenceImagesChange: (urls: string[], weights: number[]) => void;
  onClose: () => void;
}

export const FrameReferenceEditor = memo(({
  referenceImageUrls,
  referenceWeights,
  incomingImages,
  onReferenceImagesChange,
  onClose,
}: FrameReferenceEditorProps) => {
  const { t } = useTranslation();

  const handleAddReference = useCallback((imageUrl: string) => {
    const newUrls = [...referenceImageUrls, imageUrl];
    const newWeights = [...referenceWeights, 0.5];
    onReferenceImagesChange(newUrls, newWeights);
  }, [referenceImageUrls, referenceWeights, onReferenceImagesChange]);

  const handleRemoveReference = useCallback((index: number) => {
    const newUrls = referenceImageUrls.filter((_, i) => i !== index);
    const newWeights = referenceWeights.filter((_, i) => i !== index);
    onReferenceImagesChange(newUrls, newWeights);
  }, [referenceImageUrls, referenceWeights, onReferenceImagesChange]);

  const handleWeightChange = useCallback((index: number, weight: number) => {
    const newWeights = [...referenceWeights];
    newWeights[index] = Math.max(0, Math.min(1, weight));
    onReferenceImagesChange(referenceImageUrls, newWeights);
  }, [referenceImageUrls, referenceWeights, onReferenceImagesChange]);

  const availableImages = incomingImages.filter(
    (url) => !referenceImageUrls.includes(url)
  );

  return (
    <div
      className="nowheel absolute z-30 w-[200px] overflow-hidden rounded-xl border border-[rgba(15,23,42,0.15)] bg-surface-dark shadow-xl dark:border-[rgba(255,255,255,0.1)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.15)] px-2 py-1.5 dark:border-[rgba(255,255,255,0.1)]">
        <span className="text-[10px] font-medium text-text-dark">
          {t('node.storyboardGen.multiReference')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-4 w-4 items-center justify-center rounded text-text-muted hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Current references */}
      <div className="max-h-[160px] overflow-y-auto p-1.5">
        {referenceImageUrls.map((url, index) => (
          <div key={`${url}-${index}`} className="mb-1 flex items-center gap-1.5 rounded bg-bg-dark/40 p-1">
            <CanvasNodeImage
              src={resolveImageDisplayUrl(url)}
              alt={`ref-${index + 1}`}
              className="h-8 w-8 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={referenceWeights[index] ?? 0.5}
                onChange={(e) => handleWeightChange(index, parseFloat(e.target.value))}
                className="nodrag nowheel h-1 w-full cursor-pointer accent-accent"
              />
              <span className="text-[8px] text-text-muted">
                {((referenceWeights[index] ?? 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveReference(index)}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-muted hover:bg-white/10 hover:text-red-400"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Available images to add */}
      {availableImages.length > 0 && (
        <div className="border-t border-[rgba(15,23,42,0.15)] p-1.5 dark:border-[rgba(255,255,255,0.1)]">
          <span className="mb-1 block text-[8px] text-text-muted">
            {t('node.storyboardGen.addReference')}
          </span>
          <div className="flex flex-wrap gap-1">
            {availableImages.map((url, index) => (
              <button
                key={`avail-${url}-${index}`}
                type="button"
                onClick={() => handleAddReference(url)}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded border border-[rgba(15,23,42,0.15)] transition-colors hover:border-accent dark:border-[rgba(255,255,255,0.1)]"
              >
                <CanvasNodeImage
                  src={resolveImageDisplayUrl(url)}
                  alt={`add-ref-${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {availableImages.length === 0 && referenceImageUrls.length === 0 && (
        <div className="flex items-center justify-center p-3 text-[9px] text-text-muted">
          <ImagePlus className="mr-1 h-3 w-3" />
          {t('node.storyboardGen.addReference')}
        </div>
      )}
    </div>
  );
});

FrameReferenceEditor.displayName = 'FrameReferenceEditor';
