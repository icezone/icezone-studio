// src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts
import { useMemo, useState, useRef, useEffect, type RefObject } from 'react';
import type { CanvasNodeData, StoryboardGenNodeData } from '@/features/canvas/domain/canvasNodes';

export interface UseStoryboardGenFormArgs {
  id: string;
  data: StoryboardGenNodeData;
  selected: boolean;
}

export interface UseStoryboardGenFormResult {
  // To be filled in B.2: the exact shape of returned state/refs/memos.
  // Intentionally narrow so callers can't depend on undocumented internals.
}

export function useStoryboardGenForm(
  _args: UseStoryboardGenFormArgs,
): UseStoryboardGenFormResult {
  return {};
}
