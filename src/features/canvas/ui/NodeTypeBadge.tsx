import { CANVAS_NODE_TYPES, type CanvasNodeType } from '@/features/canvas/domain/canvasNodes';

const LABELS: Partial<Record<CanvasNodeType, string>> = {
  [CANVAS_NODE_TYPES.imageEdit]: 'IMG',
  [CANVAS_NODE_TYPES.videoGen]: 'VID',
  [CANVAS_NODE_TYPES.storyboardGen]: 'SBG',
  [CANVAS_NODE_TYPES.videoAnalysis]: 'VAN',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'SBS',
};

interface NodeTypeBadgeProps {
  type: CanvasNodeType;
}

export function NodeTypeBadge({ type }: NodeTypeBadgeProps) {
  const label = LABELS[type];
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1 py-px text-[9px] font-bold tracking-wider text-[var(--ui-primary-fg)] bg-[var(--ui-primary)]"
      aria-label={`Node type: ${label}`}
    >
      {label}
    </span>
  );
}
