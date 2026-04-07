'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
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
  const patchProjectName = useProjectStore((state) => state.patchProjectName);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);

  const projectName = currentProject?.name || t('canvas.untitledProject');

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync nameValue when project name changes externally
  useEffect(() => {
    if (!editing) setNameValue(projectName);
  }, [projectName, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== projectName && currentProjectId) {
      patchProjectName(trimmed);
      await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
    }
    setEditing(false);
  }

  const statusMap = {
    saving:   { label: t('canvas.saveStatus.saving'),   className: 'text-white/40' },
    saved:    { label: t('canvas.saveStatus.saved'),    className: 'text-emerald-400/80' },
    unsynced: { label: t('canvas.saveStatus.unsynced'), className: 'text-amber-400' },
    offline:  { label: t('canvas.saveStatus.offline'),  className: 'text-red-400' },
    conflict: { label: t('canvas.saveStatus.conflict'), className: 'text-red-500' },
  } as const;

  const { label, className } = statusMap[saveStatus] ?? { label: saveStatus, className: 'text-white/30' };

  return (
    <div className="pointer-events-none absolute left-12 right-0 top-0 z-[50] flex items-center justify-between px-4 py-3">
      {/* Project name — click to rename */}
      <div className="pointer-events-auto flex items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            className="max-w-[260px] rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white/90 outline-none backdrop-blur-sm"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => void handleRenameSubmit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRenameSubmit();
              if (e.key === 'Escape') { setNameValue(projectName); setEditing(false); }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t('dashboard.renameProject')}
            className="group flex max-w-[260px] items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-white/10"
          >
            <span className="truncate text-sm font-medium text-white/70 group-hover:text-white/90">
              {projectName}
            </span>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 flex-shrink-0 text-white/30 group-hover:text-white/60">
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L3.464 11.1l-.626 2.188 2.188-.626 8.61-8.61a.25.25 0 0 0 0-.354l-1.086-1.086-.123-.085Z" />
            </svg>
          </button>
        )}
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

    // Fetch project meta (name) and draft in parallel, then apply name after draft is loaded
    const [draft, meta] = await Promise.all([
      loadProject(projectId).catch((err) => {
        console.error('[CanvasPage] Failed to load project draft:', err);
        return null;
      }),
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.ok ? res.json() as Promise<{ name?: string }> : null)
        .catch(() => null),
    ]);

    // Apply name AFTER loadProject has set currentProject
    if (meta?.name) patchProjectName(meta.name);

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
