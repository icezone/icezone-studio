import { Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { UiButton } from '@/components/ui';
import {
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
  NODE_CONTROL_ICON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';

export interface StoryboardGenBatchControlsProps {
  totalFrames: number;
  isBatchGenerating: boolean;
  enablePreviewShortcut: boolean;
  onGenerate: (previewGridOnly: boolean) => void;
  onBatchGenerate: () => void;
}

export function StoryboardGenBatchControls(props: StoryboardGenBatchControlsProps) {
  const { totalFrames, isBatchGenerating, enablePreviewShortcut, onGenerate, onBatchGenerate } = props;
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-1">
      <UiButton
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          const previewGridOnly =
            enablePreviewShortcut && event.ctrlKey && event.altKey && event.shiftKey;
          onGenerate(previewGridOnly);
        }}
        variant="primary"
        size="sm"
        className={`!min-w-0 shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
      >
        <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
        {t('canvas.generate')}
      </UiButton>

      <UiButton
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onBatchGenerate();
        }}
        variant="primary"
        size="sm"
        disabled={isBatchGenerating}
        className={`!min-w-0 shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
      >
        <Zap className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
        {t('node.storyboardGen.batchGenerate', { count: totalFrames })}
      </UiButton>
    </div>
  );
}
