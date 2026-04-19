'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, Trash2, Globe, GlobeLock, Pencil } from 'lucide-react';
import type { WorkflowTemplate } from './types';

interface TemplateCardProps {
  template: WorkflowTemplate;
  onUse: (template: WorkflowTemplate) => void;
  onUpdate?: (template: WorkflowTemplate) => void;
  onDelete?: (template: WorkflowTemplate) => void;
  onPublish?: (template: WorkflowTemplate) => void;
  onUnpublish?: (template: WorkflowTemplate) => void;
  showAuthor?: boolean;
}

export const TemplateCard = memo(({
  template,
  onUse,
  onUpdate,
  onDelete,
  onPublish,
  onUnpublish,
  showAuthor,
}: TemplateCardProps) => {
  const { t } = useTranslation();

  return (
    <div
      data-testid="template-card"
      className="group relative flex flex-col rounded-xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-foreground/[0.03] p-3 transition-colors hover:border-[rgba(15,23,42,0.25)] dark:hover:border-[rgba(255,255,255,0.18)] hover:bg-foreground/[0.06]"
    >
      {/* Thumbnail */}
      <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-foreground/[0.06]">
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <Layout className="h-8 w-8 text-foreground/25" />
        )}
      </div>

      {/* Name */}
      <h3 className="truncate text-sm font-medium text-foreground">{template.name}</h3>

      {/* Description */}
      {template.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-foreground/50">{template.description}</p>
      )}

      {/* Meta */}
      <div className="mt-2 flex items-center gap-2 text-xs text-foreground/40">
        <span>{t('template.nodeCount', { count: template.node_count })}</span>
        {template.use_count > 0 && (
          <>
            <span>·</span>
            <span>{t('template.useCount', { count: template.use_count })}</span>
          </>
        )}
      </div>

      {showAuthor && template.user_id && (
        <div className="mt-1 text-xs text-foreground/30">
          {t('template.by')} {template.user_id.slice(0, 8)}...
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUse(template)}
          className="flex-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-80"
        >
          {t('template.useTemplate')}
        </button>

        {/* Publish/Unpublish */}
        {onPublish && !template.is_public && (
          <button
            type="button"
            onClick={() => onPublish(template)}
            title={t('template.publish')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
          </button>
        )}
        {onUnpublish && template.is_public && (
          <button
            type="button"
            onClick={() => onUnpublish(template)}
            title={t('template.unpublish')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-green-500/60 transition-colors hover:bg-green-500/10 hover:text-green-500"
          >
            <GlobeLock className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Update */}
        {onUpdate && (
          <button
            type="button"
            onClick={() => onUpdate(template)}
            title={t('template.updateTemplate')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-foreground/10 hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(template)}
            title={t('template.deleteTemplate')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';
