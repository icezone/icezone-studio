'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

function ProjectCard({ project, onOpen, onDelete, onRename }: ProjectCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(trimmed);
    }
    setRenaming(false);
  }

  return (
    <div data-testid="project-card" className="group relative flex flex-col rounded-xl border border-foreground/15 bg-foreground/[0.06] p-4 transition-colors hover:border-foreground/25 hover:bg-foreground/[0.09]">
      {/* Thumbnail placeholder */}
      <div
        className="mb-3 flex h-32 cursor-pointer items-center justify-center rounded-lg bg-foreground/8"
        onClick={onOpen}
      >
        <svg className="h-8 w-8 text-foreground/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>

      {/* Name */}
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <input
            ref={inputRef}
            className="flex-1 rounded border border-foreground/20 bg-background px-2 py-0.5 text-sm text-foreground outline-none"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') { setNameValue(project.name); setRenaming(false); }
            }}
          />
        ) : (
          <span
            className="flex-1 cursor-pointer truncate text-sm font-medium text-foreground"
            onClick={onOpen}
          >
            {project.name}
          </span>
        )}

        {/* Context menu trigger */}
        <div ref={menuRef} className="relative">
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10 hover:text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <circle cx="8" cy="3" r="1.2" />
              <circle cx="8" cy="8" r="1.2" />
              <circle cx="8" cy="13" r="1.2" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 min-w-[140px] rounded-lg border border-foreground/10 bg-background py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/5"
                onClick={() => { setMenuOpen(false); onOpen(); }}
                type="button"
              >
                {t('dashboard.openCanvas')}
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/5"
                onClick={() => { setMenuOpen(false); setRenaming(true); }}
                type="button"
              >
                {t('dashboard.renameProject')}
              </button>
              <div className="my-1 border-t border-foreground/10" />
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                onClick={() => { setMenuOpen(false); onDelete(); }}
                type="button"
              >
                {t('dashboard.deleteProject')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Last edited */}
      <span className="mt-1 text-xs text-foreground/40">
        {t('dashboard.lastEdited')} {formatRelativeTime(project.updated_at)}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json() as Project[];
      setProjects(data);
    } catch {
      setError(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t('dashboard.projectNamePlaceholder') }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const project = await res.json() as Project;
      router.push(`/canvas/${project.id}`);
    } catch {
      setError(t('dashboard.createError'));
      setCreating(false);
    }
  }

  async function handleDelete(project: Project) {
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setDeleteTarget(null);
  }

  async function handleRename(project: Project, newName: string) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, name: newName } : p))
      );
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t('dashboard.title')}</h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {creating ? (
            t('dashboard.creating')
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
              </svg>
              {t('dashboard.newProject')}
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-foreground/40">
          {t('common.loading')}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/20 py-24 text-center">
          <svg className="mb-4 h-12 w-12 text-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <rect x="2" y="2" width="9" height="9" rx="2" />
            <rect x="13" y="2" width="9" height="9" rx="2" />
            <rect x="2" y="13" width="9" height="9" rx="2" />
            <rect x="13" y="13" width="9" height="9" rx="2" />
          </svg>
          <p className="text-sm text-foreground/40">{t('dashboard.empty')}</p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="mt-4 rounded-lg border border-foreground/20 px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
          >
            {creating ? t('dashboard.creating') : t('dashboard.newProject')}
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => router.push(`/canvas/${project.id}`)}
              onDelete={() => setDeleteTarget(project)}
              onRename={(name) => void handleRename(project, name)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-semibold text-foreground">
              {t('dashboard.deleteProject')}
            </h2>
            <p className="mb-6 text-sm text-foreground/60">
              {t('dashboard.deleteConfirm', { name: deleteTarget.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/70 hover:bg-foreground/5"
                onClick={() => setDeleteTarget(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                onClick={() => void handleDelete(deleteTarget)}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
