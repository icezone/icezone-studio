'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Download, Plus, Trash2 } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import { PublishTemplateDialog } from './PublishTemplateDialog';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import type { WorkflowTemplate } from './types';

type TabKey = 'official' | 'custom' | 'shared';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: WorkflowTemplate) => void;
  onSaveTemplate: (data: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
    thumbnailUrl?: string;
    existingTemplateId?: string;
  }) => Promise<void>;
  onImportJson: () => void;
  onExportJson: () => void;
  defaultTab?: TabKey;
  canvasImages?: string[];
}

export function TemplateLibrary({
  isOpen,
  onClose,
  onUseTemplate,
  onSaveTemplate,
  onImportJson,
  onExportJson,
  defaultTab,
  canvasImages,
}: TemplateLibraryProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>(defaultTab ?? 'official');

  // Sync tab and sort when defaultTab changes externally (e.g. from dashboard buttons)
  useEffect(() => {
    if (defaultTab && isOpen) {
      setTab(defaultTab);
      if (defaultTab === 'shared') setSort('popular');
    }
  }, [defaultTab, isOpen]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [publishTarget, setPublishTarget] = useState<WorkflowTemplate | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<WorkflowTemplate | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<WorkflowTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTemplates([]); // Clear old templates while loading
    try {
      const params = new URLSearchParams({ category: tab, sort });
      const res = await fetch(`/api/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Failed to load templates (${res.status})`);
        console.error('[TemplateLibrary] Failed to fetch templates:', res.status, errorData);
      }
    } catch (err) {
      setError(t('template.loadError'));
      console.error('[TemplateLibrary] Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, sort, t]);

  useEffect(() => {
    if (isOpen) {
      void fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  const handleDelete = useCallback((template: WorkflowTemplate) => {
    setDeleteConfirmTarget(template);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmTarget) return;
    const res = await fetch(`/api/templates/${deleteConfirmTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirmTarget.id));
    }
    setDeleteConfirmTarget(null);
  }, [deleteConfirmTarget]);

  const handleUse = useCallback(async (template: WorkflowTemplate) => {
    // Increment use count
    void fetch(`/api/templates/${template.id}/use`, { method: 'POST' });
    onUseTemplate(template);
  }, [onUseTemplate]);

  const handlePublish = useCallback(async (template: WorkflowTemplate) => {
    const res = await fetch(`/api/templates/${template.id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    });
    if (res.ok) {
      await fetchTemplates();
    }
  }, [fetchTemplates]);

  const handleUnpublish = useCallback(async (template: WorkflowTemplate) => {
    const res = await fetch(`/api/templates/${template.id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unpublish' }),
    });
    if (res.ok) {
      await fetchTemplates();
    }
  }, [fetchTemplates]);

  const handleSaveTemplateWrapper = useCallback(async (data: {
    name: string; description: string; tags: string[]; isPublic: boolean;
    thumbnailUrl?: string; existingTemplateId?: string;
  }) => {
    await onSaveTemplate(data);
    await fetchTemplates();
  }, [onSaveTemplate, fetchTemplates]);

  if (!isOpen) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'official', label: t('template.official') },
    { key: 'custom', label: t('template.myTemplates') },
    { key: 'shared', label: t('template.community') },
  ];

  const emptyMessage =
    tab === 'official'
      ? t('template.noOfficialTemplates')
      : tab === 'shared'
        ? t('template.noCommunityTemplates')
        : t('template.noTemplates');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t('template.templateLibrary')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setUpdateTarget(null); setShowSaveDialog(true); }}
                title={t('template.saveAsTemplate')}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('template.newTemplate')}
              </button>
              <div className="h-4 w-px bg-foreground/10" />
              <button
                type="button"
                onClick={onImportJson}
                title={t('template.importJson')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onExportJson}
                title={t('template.exportJson')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs + Sort */}
          <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-2">
            <div className="flex gap-1">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    tab === key
                      ? 'bg-foreground/10 font-medium text-foreground'
                      : 'text-foreground/50 hover:text-foreground/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'shared' && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSort('popular')}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    sort === 'popular'
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-foreground/40 hover:text-foreground/60'
                  }`}
                >
                  {t('template.sortPopular')}
                </button>
                <button
                  type="button"
                  onClick={() => setSort('newest')}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    sort === 'newest'
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-foreground/40 hover:text-foreground/60'
                  }`}
                >
                  {t('template.sortNewest')}
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-foreground/40">
                {t('common.loading')}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchTemplates()}
                  className="rounded-lg bg-foreground/10 px-4 py-2 text-sm text-foreground hover:bg-foreground/15 transition-colors"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-sm text-foreground/40">
                {emptyMessage}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {templates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onUse={handleUse}
                    onUpdate={tab === 'custom' ? (tpl) => { setUpdateTarget(tpl); setShowSaveDialog(true); } : undefined}
                    onDelete={tab === 'custom' ? handleDelete : undefined}
                    onPublish={tab === 'custom' ? () => setPublishTarget(tpl) : undefined}
                    onUnpublish={tab === 'custom' ? handleUnpublish : undefined}
                    showAuthor={tab === 'shared'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish dialog */}
      <PublishTemplateDialog
        isOpen={!!publishTarget}
        template={publishTarget}
        onClose={() => setPublishTarget(null)}
        onPublish={handlePublish}
      />

      {/* Save template dialog */}
      <SaveTemplateDialog
        isOpen={showSaveDialog}
        onClose={() => { setShowSaveDialog(false); setUpdateTarget(null); }}
        canvasImages={canvasImages ?? []}
        editingTemplate={updateTarget ? {
          id: updateTarget.id,
          name: updateTarget.name,
          description: updateTarget.description ?? '',
          tags: updateTarget.tags ?? [],
          thumbnailUrl: updateTarget.thumbnail_url ?? undefined,
          isPublic: updateTarget.is_public,
        } : undefined}
        onSave={handleSaveTemplateWrapper}
      />

      {/* Delete confirm dialog */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('template.deleteTemplate')}</h3>
                <p className="mt-1 text-xs text-foreground/60">
                  {t('template.deleteConfirm', { name: deleteConfirmTarget.name })}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
