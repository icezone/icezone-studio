'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';

// Dynamically import Canvas to keep it strictly client-side (uses @xyflow/react)
const Canvas = dynamic(
  () => import('@/features/canvas/Canvas').then((mod) => mod.Canvas),
  { ssr: false, loading: () => <CanvasLoading /> }
);

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="text-sm text-white/30">Loading canvas...</div>
    </div>
  );
}

function CanvasTopBar() {
  const { t } = useTranslation();
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const currentProject = useProjectStore((state) => state.currentProject);

  const projectName = currentProject?.name || t('canvas.untitledProject');

  const statusMap = {
    saving:   { label: t('canvas.saveStatus.saving'),   className: 'text-white/40' },
    saved:    { label: t('canvas.saveStatus.saved'),    className: 'text-emerald-400/80' },
    unsynced: { label: t('canvas.saveStatus.unsynced'), className: 'text-amber-400' },
    offline:  { label: t('canvas.saveStatus.offline'),  className: 'text-red-400' },
    conflict: { label: t('canvas.saveStatus.conflict'), className: 'text-red-500' },
  } as const;

  const { label, className } = statusMap[saveStatus] ?? { label: saveStatus, className: 'text-white/30' };

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-[50] flex items-center justify-between px-4 py-3">
      {/* Project name — centred visually by sitting left of save status */}
      <div className="flex items-center gap-2 pl-14">
        <span className="max-w-[260px] truncate text-sm font-medium text-white/70">
          {projectName}
        </span>
      </div>

      {/* Save status */}
      <span className={`select-none text-xs ${className}`}>
        {label}
      </span>
    </div>
  );
}

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;

  const loadProject = useProjectStore((state) => state.load);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const setCanvasData = useCanvasStore((state) => state.setCanvasData);

  const patchProjectName = useProjectStore((state) => state.patchProjectName);

  const initProject = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setCurrentProject(projectId);

    // Fetch project meta (name) and draft in parallel
    const [draft] = await Promise.all([
      loadProject(projectId).catch((err) => {
        console.error('[CanvasPage] Failed to load project draft:', err);
        return null;
      }),
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((meta: { name?: string } | null) => {
          if (meta?.name) patchProjectName(meta.name);
        })
        .catch(() => undefined),
    ]);

    if (draft) {
      const nodes = Array.isArray(draft.nodes) ? draft.nodes : [];
      const edges = Array.isArray(draft.edges) ? draft.edges : [];
      setCanvasData(nodes as Parameters<typeof setCanvasData>[0], edges as Parameters<typeof setCanvasData>[1]);
    }
  }, [projectId, loadProject, setCurrentProject, setCanvasData, patchProjectName]);

  useEffect(() => {
    void initProject();
  }, [initProject]);

  if (!projectId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-white/50">Invalid project ID.</p>
        <button
          type="button"
          className="ml-3 text-sm text-white underline"
          onClick={() => router.push('/')}
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <CanvasTopBar />

      {/* Canvas fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <Canvas />
      </div>
    </div>
  );
}
