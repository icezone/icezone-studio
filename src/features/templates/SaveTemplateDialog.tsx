'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ImageIcon, Upload } from 'lucide-react';

interface EditingTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
  isPublic: boolean;
}

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasImages: string[];
  editingTemplate?: EditingTemplate;
  onSave: (data: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
    thumbnailUrl?: string;
    existingTemplateId?: string;
  }) => Promise<void>;
}

export function SaveTemplateDialog({ isOpen, onClose, canvasImages, editingTemplate, onSave }: SaveTemplateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill or reset fields every time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description);
      setTags(editingTemplate.tags);
      setIsPublic(editingTemplate.isPublic);
      setCoverUrl(editingTemplate.thumbnailUrl);
    } else {
      setName('');
      setDescription('');
      setTags([]);
      setIsPublic(false);
      setCoverUrl(canvasImages[0] ?? undefined);
    }
    setTagInput('');
    setError(null);
  }, [isOpen, editingTemplate, canvasImages]);

  const handleTagKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim();
      setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
      setTagInput('');
    }
  }, [tagInput]);

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/templates/upload-cover', { method: 'POST', body: form });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        setCoverUrl(url);
        setError(null);
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? t('template.coverUploadFailed'));
      }
    } catch {
      setError(t('template.coverUploadFailed'));
    } finally {
      setCoverUploading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError(t('template.templateNamePlaceholder')); return; }
    if (!coverUrl) { setError(t('template.coverImageRequired')); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        tags,
        isPublic,
        thumbnailUrl: coverUrl,
        existingTemplateId: editingTemplate?.id,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('template.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [name, description, tags, isPublic, coverUrl, editingTemplate, onSave, onClose, t]);

  if (!isOpen) return null;

  const isEditing = !!editingTemplate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {isEditing ? t('template.updateTemplate') : t('template.saveAsTemplate')}
          </h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cover image */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.coverImage')}</label>
          <div
            onClick={() => !coverUploading && coverInputRef.current?.click()}
            className="relative flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.04] hover:border-foreground/30"
          >
            {coverUrl ? (
              <img src={coverUrl} alt="cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-foreground/30">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">{canvasImages.length === 0 ? t('template.noCoverImage') : t('template.coverUpload')}</span>
              </div>
            )}
            {coverUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                {t('template.coverUploading')}
              </div>
            )}
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
              <Upload className="h-3 w-3" />
              {t('template.coverUpload')}
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleCoverUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Name */}
        <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.templateName')}</label>
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
        <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.templateDescription')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('template.templateDescriptionPlaceholder')}
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
        />

        {/* Tags */}
        <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.templateTags')}</label>
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-foreground/[0.08] px-2 py-0.5 text-xs text-foreground/70">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder={t('template.templateTagsPlaceholder')}
          className="mb-4 w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
        />

        {/* Public toggle */}
        <div className="mb-4 flex items-center gap-2">
          <input
            id="public-toggle"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-500"
          />
          <label htmlFor="public-toggle" className="text-xs text-foreground/60">{t('template.publish')}</label>
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || coverUploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('common.saving') : isEditing ? t('template.updateTemplate') : t('template.saveAsTemplate')}
          </button>
        </div>
      </div>
    </div>
  );
}
