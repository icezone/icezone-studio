'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';
import type { WorkflowTemplate } from './types';

interface PublishTemplateDialogProps {
  isOpen: boolean;
  template: WorkflowTemplate | null;
  onClose: () => void;
  onPublish: (template: WorkflowTemplate) => Promise<void>;
}

export function PublishTemplateDialog({
  isOpen,
  template,
  onClose,
  onPublish,
}: PublishTemplateDialogProps) {
  const { t } = useTranslation();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!template) return;
    setPublishing(true);
    try {
      await onPublish(template);
      onClose();
    } finally {
      setPublishing(false);
    }
  }, [template, onPublish, onClose]);

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t('template.publish')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-lg bg-foreground/[0.04] p-3">
          <Globe className="h-5 w-5 text-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">{template.name}</p>
            <p className="text-xs text-foreground/50">{t('template.publishDescription')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/70 hover:bg-foreground/5"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {publishing ? t('common.loading') : t('template.publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
