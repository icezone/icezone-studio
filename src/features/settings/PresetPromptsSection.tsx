'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { usePresetPromptsStore, type PresetPrompt } from '@/stores/presetPromptsStore'

interface FormState {
  name: string
  content: string
  tags: string[]
  tagInput: string
}

const emptyForm = (): FormState => ({ name: '', content: '', tags: [], tagInput: '' })

export function PresetPromptsSection() {
  const { t } = useTranslation()
  const { presets, addPreset, updatePreset, deletePreset } = usePresetPromptsStore()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<{ name?: string; content?: string }>({})

  function startAdd() {
    setEditingId('new')
    setForm(emptyForm())
    setErrors({})
  }

  function startEdit(preset: PresetPrompt) {
    setEditingId(preset.id)
    setForm({ name: preset.name, content: preset.content, tags: preset.tags, tagInput: '' })
    setErrors({})
  }

  function cancel() {
    setEditingId(null)
    setForm(emptyForm())
    setErrors({})
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && form.tagInput.trim()) {
      e.preventDefault()
      const tag = form.tagInput.trim()
      if (!form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag], tagInput: '' }))
      } else {
        setForm((f) => ({ ...f, tagInput: '' }))
      }
    }
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  function validate(): boolean {
    const next: { name?: string; content?: string } = {}
    if (!form.name.trim()) next.name = t('presetPrompts.nameRequired')
    if (!form.content.trim()) next.content = t('presetPrompts.contentRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSave() {
    if (!validate()) return
    if (editingId === 'new') {
      addPreset({ name: form.name.trim(), content: form.content.trim(), tags: form.tags })
    } else if (editingId) {
      updatePreset(editingId, { name: form.name.trim(), content: form.content.trim(), tags: form.tags })
    }
    cancel()
  }

  function handleDelete(preset: PresetPrompt) {
    if (window.confirm(t('presetPrompts.confirmDelete', { name: preset.name }))) {
      deletePreset(preset.id)
    }
  }

  // Group by first tag; ungrouped last
  const grouped = new Map<string, PresetPrompt[]>()
  const ungrouped: PresetPrompt[] = []
  for (const p of presets) {
    if (p.tags.length > 0) {
      const key = p.tags[0]
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(p)
    } else {
      ungrouped.push(p)
    }
  }
  if (ungrouped.length > 0) grouped.set('__ungrouped__', ungrouped)

  const inputCls = 'w-full rounded-lg border border-[var(--ui-line)] bg-[var(--ui-surface-field)] px-3 py-2 text-sm text-ui-fg outline-none placeholder:text-ui-fg-placeholder focus:border-ui-primary'

  return (
    <div>
      {presets.length === 0 && editingId !== 'new' && (
        <p className="text-xs text-ui-fg-muted">{t('presetPrompts.noPresets')}</p>
      )}

      {Array.from(grouped.entries()).map(([group, items]) => (
        <div key={group} className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-ui-fg-muted uppercase tracking-wide">
            {group === '__ungrouped__' ? t('presetPrompts.uncategorized') : group}
          </p>
          <div className="space-y-2">
            {items.map((preset) =>
              editingId === preset.id ? (
                <InlineForm
                  key={preset.id}
                  form={form}
                  errors={errors}
                  setForm={setForm}
                  onTagKeyDown={handleTagKeyDown}
                  onRemoveTag={removeTag}
                  onSave={handleSave}
                  onCancel={cancel}
                  inputCls={inputCls}
                  t={t}
                />
              ) : (
                <div key={preset.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--ui-line)] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ui-fg truncate">{preset.name}</p>
                    <p className="mt-0.5 text-xs text-ui-fg-muted truncate">{preset.content}</p>
                    {preset.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {preset.tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] text-ui-fg-muted">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(preset)} className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-foreground/10 hover:text-ui-fg" title={t('presetPrompts.editButton')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(preset)} className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-red-500/10 hover:text-red-400" title={t('presetPrompts.deleteButton')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}

      {editingId === 'new' && (
        <InlineForm
          form={form}
          errors={errors}
          setForm={setForm}
          onTagKeyDown={handleTagKeyDown}
          onRemoveTag={removeTag}
          onSave={handleSave}
          onCancel={cancel}
          inputCls={inputCls}
          t={t}
        />
      )}

      {editingId === null && (
        <button type="button" onClick={startAdd} className="mt-2 flex items-center gap-1.5 rounded-lg border border-[var(--ui-line)] px-3 py-1.5 text-xs text-ui-fg-muted hover:border-ui-primary/40 hover:text-ui-fg">
          <Plus className="h-3.5 w-3.5" />
          {t('presetPrompts.addButton')}
        </button>
      )}
    </div>
  )
}

interface InlineFormProps {
  form: FormState
  errors: { name?: string; content?: string }
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onRemoveTag: (tag: string) => void
  onSave: () => void
  onCancel: () => void
  inputCls: string
  t: (key: string, opts?: Record<string, unknown>) => string
}

function InlineForm({ form, errors, setForm, onTagKeyDown, onRemoveTag, onSave, onCancel, inputCls, t }: InlineFormProps) {
  return (
    <div className="rounded-lg border border-ui-primary/30 bg-[var(--ui-surface-field)] p-3 space-y-2">
      <div>
        <input autoFocus type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('presetPrompts.namePlaceholder')} className={inputCls} />
        {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name}</p>}
      </div>
      <div>
        <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder={t('presetPrompts.contentPlaceholder')} rows={4} className={`${inputCls} resize-none`} />
        {errors.content && <p className="mt-0.5 text-xs text-red-400">{errors.content}</p>}
      </div>
      <div>
        <div className="mb-1 flex flex-wrap gap-1">
          {form.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] text-ui-fg-muted">
              {tag}
              <button type="button" onClick={() => onRemoveTag(tag)} className="ml-0.5 hover:text-red-400"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
        </div>
        <input type="text" value={form.tagInput} onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))} onKeyDown={onTagKeyDown} placeholder={t('presetPrompts.tagsPlaceholder')} className={inputCls} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--ui-line)] px-3 py-1.5 text-xs text-ui-fg-muted hover:text-ui-fg">{t('common.cancel')}</button>
        <button type="button" onClick={onSave} className="flex items-center gap-1 rounded-lg bg-ui-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-ui-primary-pressed">
          <Check className="h-3.5 w-3.5" />
          {t('presetPrompts.saveButton')}
        </button>
      </div>
    </div>
  )
}
