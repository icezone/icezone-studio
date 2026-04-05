'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; tags: string[]; isPublic: boolean }) => Promise<void>;
}

export function SaveTemplateDialog({ isOpen, onClose, onSave }: SaveTemplateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTagKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim();
      if (!tags.includes(tag)) {
        setTags((prev) => [...prev, tag]);
      }
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), tags, isPublic });
      setName('');
      setDescription('');
      setTags([]);
      setIsPublic(false);
      setError(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('template.saveFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [name, description, tags, isPublic, onSave, onClose, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t('template.saveAsTemplate')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Name */}
        <label className="mb-1 block text-xs font-medium text-foreground/60">
          {t('template.templateName')}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('template.templateNamePlaceholder')}
          className="mb-4 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
          autoFocus
        />

        {/* Description */}
        <label className="mb-1 block text-xs font-medium text-foreground/60">
          {t('template.templateDescription')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('template.templateDescriptionPlaceholder')}
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
        />

        {/* Tags */}
        <label className="mb-1 block text-xs font-medium text-foreground/60">
          {t('template.templateTags')}
        </label>
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground/70"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-foreground/40 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('template.templateTagsPlaceholder')}
            className="w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
          />
        </div>

        {/* Visibility */}
        <label className="mb-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-foreground/15 bg-foreground/[0.04] text-accent focus:ring-accent focus:ring-offset-0"
          />
          <span className="text-sm text-foreground/70">
            {t('template.makePublic')}
          </span>
          <span className="text-xs text-foreground/40">
            ({t('template.makePublicHint')})
          </span>
        </label>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
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
            onClick={() => void handleSave()}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {saving ? t('template.saving') : t('template.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
