import { memo } from 'react';
import {
  getBezierPath,
  Position,
  type ConnectionLineComponentProps,
} from '@xyflow/react';

const HANDLE_HALF_WIDTH = 0;

export const AlignedConnectionLine = memo(function AlignedConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const adjustedFromX =
    fromPosition === Position.Right
      ? fromX + HANDLE_HALF_WIDTH
      : fromPosition === Position.Left
        ? fromX - HANDLE_HALF_WIDTH
        : fromX;
  const adjustedFromY =
    fromPosition === Position.Bottom
      ? fromY + HANDLE_HALF_WIDTH
      : fromPosition === Position.Top
        ? fromY - HANDLE_HALF_WIDTH
        : fromY;

  const [path] = getBezierPath({
    sourceX: adjustedFromX,
    sourceY: adjustedFromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition ?? Position.Left,
  });

  return (
    <path
      d={path}
      fill="none"
      className="react-flow__connection-path"
      style={{ stroke: 'rgba(255, 255, 255, 0.65)', strokeWidth: 2.6 }}
    />
  );
});
