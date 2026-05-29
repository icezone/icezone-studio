import { useState, useRef, useMemo, useEffect, type RefObject, type MutableRefObject } from 'react';
import type { VideoGenNodeData } from '@/features/canvas/domain/canvasNodes';

export interface UseVideoGenFormArgs {
  id: string;
  data: VideoGenNodeData;
}

export interface UseVideoGenFormResult {
  // To be filled in C.2: the exact shape of returned state/refs/memos.
  // Intentionally narrow so callers can't depend on undocumented internals.
}

export function useVideoGenForm(_args: UseVideoGenFormArgs): UseVideoGenFormResult {
  return {};
}
