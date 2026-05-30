import { useState, useCallback, useEffect } from 'react';

export interface UseStoryboardSortArgs {
  /**
   * Called when the user finishes a sort gesture with a valid reorder.
   * Receives the dragged frame id and the drop-target frame id.
   * The orchestrator maps these to the appropriate store mutation.
   */
  onReorder: (draggedId: string, dropTargetId: string) => void;
  /**
   * Optional callback invoked at drag-start (e.g. to close picker panels).
   */
  onDragStart?: () => void;
}

export interface UseStoryboardSortResult {
  draggedFrameId: string | null;
  dropTargetFrameId: string | null;
  handleSortStart: (frameId: string) => void;
  handleSortHover: (frameId: string) => void;
  /** Commit the reorder. The global pointerup/pointercancel effect inside the hook also calls this on release. */
  finalizeSort: () => void;
}

export function useStoryboardSort({
  onReorder,
  onDragStart,
}: UseStoryboardSortArgs): UseStoryboardSortResult {
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const [dropTargetFrameId, setDropTargetFrameId] = useState<string | null>(null);

  const handleSortStart = useCallback(
    (frameId: string) => {
      setDraggedFrameId(frameId);
      setDropTargetFrameId(frameId);
      onDragStart?.();
    },
    [onDragStart]
  );

  const handleSortHover = useCallback(
    (frameId: string) => {
      if (!draggedFrameId) {
        return;
      }
      setDropTargetFrameId(frameId);
    },
    [draggedFrameId]
  );

  const finalizeSort = useCallback(() => {
    if (!draggedFrameId) {
      return;
    }

    if (dropTargetFrameId && dropTargetFrameId !== draggedFrameId) {
      onReorder(draggedFrameId, dropTargetFrameId);
    }

    setDraggedFrameId(null);
    setDropTargetFrameId(null);
  }, [draggedFrameId, dropTargetFrameId, onReorder]);

  useEffect(() => {
    if (!draggedFrameId) {
      return;
    }

    const handlePointerUp = () => {
      finalizeSort();
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggedFrameId, finalizeSort]);

  return {
    draggedFrameId,
    dropTargetFrameId,
    handleSortStart,
    handleSortHover,
    finalizeSort,
  };
}
