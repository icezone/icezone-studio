'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';

// Dynamically import Canvas to keep it strictly client-side (uses @xyflow/react)
const Canvas = dynamic(
  () => import('@/features/canvas/Canvas').then((mod) => mod.Canvas),
  { ssr: false, loading: () => <CanvasLoading /> }
);

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-dark">
      <div className="text-sm text-text-muted">Loading canvas...</div>
    </div>
  );
}

function SaveStatusBadge() {
  const saveStatus = useProjectStore((state) => state.saveStatus);

  const statusMap = {
    saving: { label: 'Saving...', className: 'text-text-muted' },
    saved: { label: 'Saved', className: 'text-emerald-400' },
    unsynced: { label: 'Unsynced', className: 'text-amber-400' },
    offline: { label: 'Offline', className: 'text-red-400' },
    conflict: { label: 'Conflict', className: 'text-red-500' },
  } as const;

  const { label, className } = statusMap[saveStatus] ?? { label: saveStatus, className: 'text-text-muted' };

  return (
    <span className={`pointer-events-none select-none text-xs ${className}`}>
      {label}
    </span>
  );
}

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;

  const loadProject = useProjectStore((state) => state.load);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const setCanvasData = useCanvasStore((state) => state.setCanvasData);

  const initProject = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setCurrentProject(projectId);

    try {
      const draft = await loadProject(projectId);
      if (draft) {
        const nodes = Array.isArray(draft.nodes) ? draft.nodes : [];
        const edges = Array.isArray(draft.edges) ? draft.edges : [];
        setCanvasData(nodes as Parameters<typeof setCanvasData>[0], edges as Parameters<typeof setCanvasData>[1]);
      }
    } catch (error) {
      console.error('[CanvasPage] Failed to load project:', error);
    }
  }, [projectId, loadProject, setCurrentProject, setCanvasData]);

  useEffect(() => {
    void initProject();
  }, [initProject]);

  if (!projectId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-text-muted">Invalid project ID.</p>
        <button
          type="button"
          className="ml-3 text-sm text-accent underline"
          onClick={() => router.push('/')}
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Save status indicator */}
      <div className="pointer-events-none absolute right-4 top-4 z-[50]">
        <SaveStatusBadge />
      </div>

      {/* Canvas fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <Canvas />
      </div>
    </div>
  );
}
