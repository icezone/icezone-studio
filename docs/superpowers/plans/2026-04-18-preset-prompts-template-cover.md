# Preset Prompts & Template Cover Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preset prompt management to Settings with canvas node injection, plus cover image and overwrite-save support for templates.

**Architecture:** Feature 1 uses an independent Zustand persist store (`presetPromptsStore`) and a shared `PresetPicker` popover component consumed by five canvas nodes. Feature 2 extends `SaveTemplateDialog` with a cover image section (auto-selected from canvas ImageNodes) and an overwrite mode, backed by a new PATCH endpoint and a Supabase Storage upload route.

**Tech Stack:** Next.js 15 App Router, React 18, Zustand + persist, Tailwind CSS, Supabase (Postgres + Storage), Zod, react-i18next, nanoid, lucide-react, Vitest

---

## File Map

### Created
- `src/stores/presetPromptsStore.ts` — Zustand persist store for PresetPrompt CRUD
- `src/features/preset-prompts/PresetPicker.tsx` — shared Popover picker component
- `src/features/settings/PresetPromptsSection.tsx` — settings page section (list + inline form)
- `src/app/api/templates/upload-cover/route.ts` — Supabase Storage upload endpoint
- `src/__tests__/presetPromptsStore.test.ts` — store unit tests

### Modified
- `src/i18n/locales/en.json` — add `presetPrompts.*` and `template.cover*` / `template.overwrite*` keys
- `src/i18n/locales/zh.json` — same keys in Chinese
- `src/app/(app)/settings/page.tsx` — append `<PresetPromptsSection />`
- `src/features/templates/SaveTemplateDialog.tsx` — add cover image + overwrite mode
- `src/features/templates/TemplateLibrary.tsx` — update `onSaveTemplate` prop signature + pass `canvasImages`
- `src/lib/validation.ts` — add `updateTemplateSchema`
- `src/app/api/templates/[id]/route.ts` — add PATCH handler
- `src/features/canvas/Canvas.tsx` — update `handleSaveTemplate` + collect canvas images
- `src/app/(app)/dashboard/page.tsx` — update `handleSaveTemplate` signature
- `src/features/canvas/nodes/VideoGenNode.tsx` — add PresetPicker button
- `src/features/canvas/nodes/ImageEditNode.tsx` — add PresetPicker button
- `src/features/canvas/nodes/NovelInputNode.tsx` — add ref + PresetPicker button
- `src/features/canvas/nodes/StoryboardNode.tsx` — add PresetPicker to FrameCard
- `src/features/canvas/nodes/StoryboardGenNode.tsx` — add PresetPicker to frame textarea

---

## Part 1: Preset Prompts

---

### Task 1: Preset Prompts Store

**Files:**
- Create: `src/stores/presetPromptsStore.ts`
- Create: `src/__tests__/presetPromptsStore.test.ts`

- [ ] **Step 1: Write failing store tests**

```ts
// src/__tests__/presetPromptsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePresetPromptsStore } from '@/stores/presetPromptsStore'

beforeEach(() => {
  usePresetPromptsStore.setState({ presets: [] })
})

describe('presetPromptsStore', () => {
  it('adds a preset', () => {
    const { addPreset, presets } = usePresetPromptsStore.getState()
    addPreset({ name: 'Test', content: 'Hello world', tags: ['test'] })
    const next = usePresetPromptsStore.getState().presets
    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('Test')
    expect(next[0].content).toBe('Hello world')
    expect(next[0].tags).toEqual(['test'])
    expect(typeof next[0].id).toBe('string')
    expect(typeof next[0].createdAt).toBe('number')
  })

  it('updates a preset', () => {
    const { addPreset } = usePresetPromptsStore.getState()
    addPreset({ name: 'Old', content: 'Old content', tags: [] })
    const id = usePresetPromptsStore.getState().presets[0].id
    usePresetPromptsStore.getState().updatePreset(id, { name: 'New' })
    expect(usePresetPromptsStore.getState().presets[0].name).toBe('New')
  })

  it('deletes a preset', () => {
    const { addPreset } = usePresetPromptsStore.getState()
    addPreset({ name: 'Delete me', content: 'x', tags: [] })
    const id = usePresetPromptsStore.getState().presets[0].id
    usePresetPromptsStore.getState().deletePreset(id)
    expect(usePresetPromptsStore.getState().presets).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/presetPromptsStore.test.ts
```
Expected: FAIL — `@/stores/presetPromptsStore` not found

- [ ] **Step 3: Create the store**

```ts
// src/stores/presetPromptsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export interface PresetPrompt {
  id: string
  name: string
  content: string
  tags: string[]
  createdAt: number
}

interface PresetPromptsState {
  presets: PresetPrompt[]
  addPreset: (input: Omit<PresetPrompt, 'id' | 'createdAt'>) => void
  updatePreset: (id: string, patch: Partial<Omit<PresetPrompt, 'id' | 'createdAt'>>) => void
  deletePreset: (id: string) => void
}

export const usePresetPromptsStore = create<PresetPromptsState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (input) =>
        set((state) => ({
          presets: [
            ...state.presets,
            { ...input, id: nanoid(), createdAt: Date.now() },
          ],
        })),
      updatePreset: (id, patch) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'preset-prompts-storage',
      version: 1,
    }
  )
)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/presetPromptsStore.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/presetPromptsStore.ts src/__tests__/presetPromptsStore.test.ts
git commit -m "feat: add presetPromptsStore with Zustand persist"
```

---

### Task 2: i18n Keys for Preset Prompts

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: Add English keys**

In `src/i18n/locales/en.json`, find the top-level JSON object and add a new `"presetPrompts"` key at the same level as `"template"` (after the template block):

```json
"presetPrompts": {
  "sectionTitle": "Preset Prompts",
  "sectionDesc": "Save reusable prompts and insert them into any node",
  "addButton": "Add Preset",
  "editButton": "Edit",
  "deleteButton": "Delete",
  "saveButton": "Save",
  "uncategorized": "Uncategorized",
  "namePlaceholder": "Preset name (e.g. Cinematic style)",
  "contentPlaceholder": "Enter prompt text...",
  "tagsPlaceholder": "Add tag and press Enter",
  "searchPlaceholder": "Search presets...",
  "noPresets": "No presets yet. Add one in Settings.",
  "insertPreset": "Insert preset",
  "nameRequired": "Name is required",
  "contentRequired": "Content is required",
  "confirmDelete": "Delete preset \"{{name}}\"?"
}
```

- [ ] **Step 2: Add Chinese keys**

In `src/i18n/locales/zh.json`, add the same key at the same level:

```json
"presetPrompts": {
  "sectionTitle": "预设提示词",
  "sectionDesc": "保存可复用的提示词，在任意节点中一键插入",
  "addButton": "新增预设",
  "editButton": "编辑",
  "deleteButton": "删除",
  "saveButton": "保存",
  "uncategorized": "未分类",
  "namePlaceholder": "预设名称（如：电影感风格）",
  "contentPlaceholder": "输入提示词内容...",
  "tagsPlaceholder": "添加标签后回车",
  "searchPlaceholder": "搜索预设...",
  "noPresets": "暂无预设，请前往设置添加。",
  "insertPreset": "插入预设",
  "nameRequired": "名称不能为空",
  "contentRequired": "内容不能为空",
  "confirmDelete": "删除预设「{{name}}」？"
}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "feat: add i18n keys for preset prompts"
```

---

### Task 3: PresetPromptsSection in Settings Page

**Files:**
- Create: `src/features/settings/PresetPromptsSection.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create PresetPromptsSection component**

```tsx
// src/features/settings/PresetPromptsSection.tsx
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
    const next: typeof errors = {}
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

  // Group by first tag, ungrouped last
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
      {/* Preset list */}
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
                <div
                  key={preset.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--ui-line)] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ui-fg truncate">{preset.name}</p>
                    <p className="mt-0.5 text-xs text-ui-fg-muted truncate">{preset.content}</p>
                    {preset.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {preset.tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] text-ui-fg-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(preset)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-foreground/10 hover:text-ui-fg"
                      title={t('presetPrompts.editButton')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-red-500/10 hover:text-red-400"
                      title={t('presetPrompts.deleteButton')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}

      {/* New preset form */}
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

      {/* Add button */}
      {editingId === null && (
        <button
          type="button"
          onClick={startAdd}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-[var(--ui-line)] px-3 py-1.5 text-xs text-ui-fg-muted hover:border-ui-primary/40 hover:text-ui-fg"
        >
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
        <input
          autoFocus
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t('presetPrompts.namePlaceholder')}
          className={inputCls}
        />
        {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name}</p>}
      </div>
      <div>
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder={t('presetPrompts.contentPlaceholder')}
          rows={4}
          className={`${inputCls} resize-none`}
        />
        {errors.content && <p className="mt-0.5 text-xs text-red-400">{errors.content}</p>}
      </div>
      {/* Tags */}
      <div>
        <div className="mb-1 flex flex-wrap gap-1">
          {form.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] text-ui-fg-muted">
              {tag}
              <button type="button" onClick={() => onRemoveTag(tag)} className="ml-0.5 hover:text-red-400">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={form.tagInput}
          onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
          onKeyDown={onTagKeyDown}
          placeholder={t('presetPrompts.tagsPlaceholder')}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--ui-line)] px-3 py-1.5 text-xs text-ui-fg-muted hover:text-ui-fg"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 rounded-lg bg-ui-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-ui-primary-pressed"
        >
          <Check className="h-3.5 w-3.5" />
          {t('presetPrompts.saveButton')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add PresetPromptsSection to settings page**

In `src/app/(app)/settings/page.tsx`, add the import at the top (after existing imports):
```tsx
import { PresetPromptsSection } from '@/features/settings/PresetPromptsSection'
```

Then add at the end of the `<div className="space-y-4">` block, after the last existing `<SectionCard>`:
```tsx
{/* Preset Prompts */}
<SectionCard
  title={t('presetPrompts.sectionTitle')}
  desc={t('presetPrompts.sectionDesc')}
>
  <PresetPromptsSection />
</SectionCard>
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/PresetPromptsSection.tsx src/app/(app)/settings/page.tsx
git commit -m "feat: add PresetPromptsSection to settings page"
```

---

### Task 4: Shared PresetPicker Component

**Files:**
- Create: `src/features/preset-prompts/PresetPicker.tsx`

- [ ] **Step 1: Create PresetPicker component**

```tsx
// src/features/preset-prompts/PresetPicker.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, Search, X } from 'lucide-react'
import { usePresetPromptsStore } from '@/stores/presetPromptsStore'

interface PresetPickerProps {
  onInsert: (content: string) => void
}

export function PresetPickerButton({ onInsert }: PresetPickerProps) {
  const { t } = useTranslation()
  const { presets } = usePresetPromptsStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const allTags = Array.from(new Set(presets.flatMap((p) => p.tags)))

  const filtered = presets.filter((p) => {
    const matchesTag = activeTag === null || p.tags.includes(activeTag)
    const q = search.toLowerCase()
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
    return matchesTag && matchesSearch
  })

  function handleSelect(content: string) {
    onInsert(content)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={t('presetPrompts.insertPreset')}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)] hover:text-[var(--canvas-node-fg)]"
      >
        <BookmarkIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-72 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--canvas-node-bg)] shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('presetPrompts.searchPlaceholder')}
              className="flex-1 bg-transparent text-xs text-[var(--canvas-node-fg)] outline-none placeholder:text-[var(--canvas-node-fg-muted)]"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X className="h-3 w-3 text-[var(--canvas-node-fg-muted)]" />
              </button>
            )}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-[rgba(255,255,255,0.08)] px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                  activeTag === null
                    ? 'bg-accent text-white'
                    : 'bg-[var(--canvas-node-section-bg)] text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)]'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                  className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                    activeTag === tag
                      ? 'bg-accent text-white'
                      : 'bg-[var(--canvas-node-section-bg)] text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="max-h-56 overflow-y-auto ui-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[var(--canvas-node-fg-muted)]">
                {t('presetPrompts.noPresets')}
              </p>
            ) : (
              filtered.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset.content)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--canvas-menu-item-hover)] transition-colors"
                >
                  <p className="text-xs font-medium text-[var(--canvas-node-fg)] truncate">{preset.name}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--canvas-node-fg-muted)] line-clamp-2">{preset.content}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/preset-prompts/PresetPicker.tsx
git commit -m "feat: add shared PresetPicker popover component"
```

---

### Task 5: Integrate PresetPicker into VideoGenNode and ImageEditNode

**Files:**
- Modify: `src/features/canvas/nodes/VideoGenNode.tsx`
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`

Both nodes follow the same pattern — they already have `promptRef = useRef<HTMLTextAreaElement>()` and `promptDraft` / `setPromptDraft` state.

- [ ] **Step 1: Update VideoGenNode**

In `src/features/canvas/nodes/VideoGenNode.tsx`:

1. Add import at the top (with other lucide/component imports):
```tsx
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker'
```

2. Add `handlePresetInsert` inside the component function (after the existing state declarations):
```tsx
const handlePresetInsert = (content: string) => {
  const el = promptRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + content + el.value.slice(end)
  setPromptDraft(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + content.length, start + content.length)
  })
}
```

3. In the JSX, find the prompt section header button (the collapse toggle) — it looks like:
```tsx
<button onClick={...} className="w-full flex items-center justify-between px-3 py-2 ...">
```
Add `<PresetPickerButton onInsert={handlePresetInsert} />` as a sibling inside that header row, before the collapse chevron icon. Wrap both in a `flex items-center gap-1` div if needed.

- [ ] **Step 2: Update ImageEditNode**

Apply the identical changes to `src/features/canvas/nodes/ImageEditNode.tsx`:

1. Add import:
```tsx
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker'
```

2. Add `handlePresetInsert` (same code as VideoGenNode above, uses `promptRef` and `setPromptDraft` which already exist):
```tsx
const handlePresetInsert = (content: string) => {
  const el = promptRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + content + el.value.slice(end)
  setPromptDraft(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + content.length, start + content.length)
  })
}
```

3. In the JSX, find the prompt section header and add `<PresetPickerButton onInsert={handlePresetInsert} />` in the header row.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/canvas/nodes/VideoGenNode.tsx src/features/canvas/nodes/ImageEditNode.tsx
git commit -m "feat: add preset prompt picker to VideoGenNode and ImageEditNode"
```

---

### Task 6: Integrate PresetPicker into NovelInputNode

**Files:**
- Modify: `src/features/canvas/nodes/NovelInputNode.tsx`

NovelInputNode uses `data.text` directly via `updateNodeData(id, { text: value })` — no local draft state. We need to add a `useRef` on the textarea.

- [ ] **Step 1: Add ref and preset handler to NovelInputNode**

In `src/features/canvas/nodes/NovelInputNode.tsx`:

1. Add imports:
```tsx
import { useRef } from 'react'
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker'
```

2. Inside the component, after existing `useCanvasStore` calls, add:
```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null)

const handlePresetInsert = (content: string) => {
  const el = textareaRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const currentText = data.text ?? ''
  const next = currentText.slice(0, start) + content + currentText.slice(end)
  updateNodeData(id, { text: next })
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + content.length, start + content.length)
  })
}
```

3. On the `<textarea>` element (currently has `value={data.text ?? ''}`) add the ref:
```tsx
<textarea
  ref={textareaRef}
  value={data.text ?? ''}
  ...
```

4. Add a `<PresetPickerButton>` in the node header area or above the textarea. Find the `NodeHeader` render and add it in the title row, or add a small toolbar row above the textarea `<div className="relative flex-1 min-h-0">`:
```tsx
{/* Preset picker toolbar */}
<div className="flex justify-end px-1 pb-1">
  <PresetPickerButton onInsert={handlePresetInsert} />
</div>
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/canvas/nodes/NovelInputNode.tsx
git commit -m "feat: add preset prompt picker to NovelInputNode"
```

---

### Task 7: Integrate PresetPicker into StoryboardNode FrameCard

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardNode.tsx`

StoryboardNode has a `FrameCard` component (memo) that renders per-frame. The textarea uses `frame.note` and calls `updateStoryboardFrame`. We add a local ref and a `PresetPickerButton` inside `FrameCard`.

- [ ] **Step 1: Update FrameCard inside StoryboardNode**

In `src/features/canvas/nodes/StoryboardNode.tsx`:

1. Add imports at the top:
```tsx
import { useRef } from 'react'
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker'
```
(If `useRef` is already imported via existing React imports, skip adding it again.)

2. Inside the `FrameCard` component function, add a ref and handler (place after existing props destructuring):
```tsx
const noteRef = useRef<HTMLTextAreaElement>(null)

const handlePresetInsert = (content: string) => {
  const el = noteRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = (frame.note ?? '').slice(0, start) + content + (frame.note ?? '').slice(end)
  updateStoryboardFrame(nodeId, frame.id, { note: next })
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + content.length, start + content.length)
  })
}
```

3. Add `ref={noteRef}` to the `<textarea>` element (currently has `value={frame.note}`):
```tsx
<textarea
  ref={noteRef}
  value={frame.note}
  ...
```

4. Add `<PresetPickerButton>` in a small header row above the textarea (inside the FrameCard JSX). The textarea currently has a border-t — add a row before it:
```tsx
<div className="flex justify-end px-1 pt-1">
  <PresetPickerButton onInsert={handlePresetInsert} />
</div>
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/canvas/nodes/StoryboardNode.tsx
git commit -m "feat: add preset prompt picker to StoryboardNode FrameCard"
```

---

### Task 8: Integrate PresetPicker into StoryboardGenNode

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`

StoryboardGenNode has a frame-level textarea at approximately line 1586. Find the `<textarea>` for frame note/prompt and apply the same pattern as Task 7.

- [ ] **Step 1: Locate the frame textarea**

Search for `<textarea` in `StoryboardGenNode.tsx` around line 1586. The textarea is inside a frame render function or component. Identify the state/handler used to update it (likely `updateStoryboardFrame` or similar).

- [ ] **Step 2: Add ref and PresetPickerButton**

1. Add imports:
```tsx
import { useRef } from 'react'
import { PresetPickerButton } from '@/features/preset-prompts/PresetPicker'
```

2. In the frame render context (find the component/function that renders each frame's textarea around line 1586), add a `noteRef` and `handlePresetInsert`. First read the `onChange` handler on that `<textarea>` to identify the exact updater function and frame ID variable names, then write:
```tsx
const noteRef = useRef<HTMLTextAreaElement>(null)

// Replace `updateFn`, `frameId`, and `fieldName` with the actual names found in onChange
const handlePresetInsert = (content: string) => {
  const el = noteRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + content + el.value.slice(end)
  updateFn(frameId, { fieldName: next })
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + content.length, start + content.length)
  })
}
```

3. Add `ref={noteRef}` to the `<textarea>` and a `<PresetPickerButton onInsert={handlePresetInsert} />` adjacent to it.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/canvas/nodes/StoryboardGenNode.tsx
git commit -m "feat: add preset prompt picker to StoryboardGenNode"
```

---

## Part 2: Template Cover Image + Overwrite Save

---

### Task 9: PATCH API + updateTemplateSchema

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/app/api/templates/[id]/route.ts`

- [ ] **Step 1: Add updateTemplateSchema to validation.ts**

In `src/lib/validation.ts`, after the `publishTemplateSchema` block, add:

```ts
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  templateData: z.object({
    version: z.number().int().positive(),
    nodes: z.array(z.object({}).passthrough()),
    edges: z.array(z.object({}).passthrough()),
    metadata: z.object({}).passthrough(),
  }).optional(),
})
```

- [ ] **Step 2: Add PATCH handler to /api/templates/[id]/route.ts**

In `src/app/api/templates/[id]/route.ts`, add the following after the existing `DELETE` export (also add the import for `updateTemplateSchema` at the top):

```ts
import { updateTemplateSchema } from '@/lib/validation'
```

```ts
export async function PATCH(request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  const body = await request.json()
  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const patch = parsed.data
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.description !== undefined) updates.description = patch.description
  if (patch.tags !== undefined) updates.tags = patch.tags
  if (patch.thumbnailUrl !== undefined) updates.thumbnail_url = patch.thumbnailUrl
  if (patch.isPublic !== undefined) {
    updates.is_public = patch.isPublic
    updates.category = patch.isPublic ? 'shared' : 'custom'
  }
  if (patch.templateData !== undefined) {
    updates.template_data = patch.templateData
    updates.node_count = patch.templateData.nodes.length
  }

  const { data, error } = await supabase
    .from('workflow_templates')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, category, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation.ts src/app/api/templates/[id]/route.ts
git commit -m "feat: add PATCH /api/templates/[id] endpoint and updateTemplateSchema"
```

---

### Task 10: Upload Cover API

**Files:**
- Create: `src/app/api/templates/upload-cover/route.ts`

- [ ] **Step 1: Create the upload route**

```ts
// src/app/api/templates/upload-cover/route.ts
import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

const BUCKET = 'template-covers'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'unsupported file type' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'file too large (max 2 MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${user.id}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
}
```

**Note:** The Supabase Storage bucket `template-covers` must exist with public access. Create it in the Supabase dashboard: Storage → New bucket → name: `template-covers` → Public: on.

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/templates/upload-cover/route.ts
git commit -m "feat: add POST /api/templates/upload-cover endpoint"
```

---

### Task 11: i18n Keys for Template Cover & Overwrite

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: Add English keys**

In `src/i18n/locales/en.json`, inside the `"template"` object, add:

```json
"coverImage": "Cover Image",
"coverImageDesc": "Auto-selected from canvas — click to upload a custom image",
"noCoverImage": "No canvas images. Upload a cover below.",
"coverUpload": "Upload Cover",
"coverUploading": "Uploading...",
"coverUploadFailed": "Cover upload failed",
"overwriteExisting": "Overwrite existing template",
"selectExistingTemplate": "Select template to overwrite",
"saveAsNew": "Save as new template",
"updateTemplate": "Update Template"
```

- [ ] **Step 2: Add Chinese keys**

In `src/i18n/locales/zh.json`, inside `"template"` object, add:

```json
"coverImage": "封面图片",
"coverImageDesc": "自动选取画布第一张图片，点击可上传自定义封面",
"noCoverImage": "画布暂无图片，可上传封面。",
"coverUpload": "上传封面",
"coverUploading": "上传中...",
"coverUploadFailed": "封面上传失败",
"overwriteExisting": "覆盖现有模板",
"selectExistingTemplate": "选择要覆盖的模板",
"saveAsNew": "保存为新模板",
"updateTemplate": "更新模板"
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "feat: add i18n keys for template cover and overwrite"
```

---

### Task 12: Refactor SaveTemplateDialog

**Files:**
- Modify: `src/features/templates/SaveTemplateDialog.tsx`

The dialog gains: (a) a cover image preview area with auto-select and upload, (b) an overwrite mode toggle with template selector.

- [ ] **Step 1: Replace SaveTemplateDialog**

Replace the entire content of `src/features/templates/SaveTemplateDialog.tsx`:

```tsx
'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ImageIcon, Upload } from 'lucide-react';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasImages: string[];
  onSave: (data: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
    thumbnailUrl?: string;
    existingTemplateId?: string;
  }) => Promise<void>;
}

interface UserTemplate {
  id: string;
  name: string;
}

export function SaveTemplateDialog({ isOpen, onClose, canvasImages, onSave }: SaveTemplateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cover image
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Overwrite mode
  const [overwrite, setOverwrite] = useState(false);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select first canvas image as default cover
  useEffect(() => {
    if (isOpen) {
      setCoverUrl(canvasImages[0] ?? undefined);
    }
  }, [isOpen, canvasImages]);

  // Load user templates when overwrite toggled on
  useEffect(() => {
    if (!overwrite) return;
    setLoadingTemplates(true);
    fetch('/api/templates?category=custom')
      .then((r) => r.json())
      .then((d) => setUserTemplates((d.templates ?? []) as UserTemplate[]))
      .catch(() => setUserTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [overwrite]);

  // When a template is selected in overwrite mode, pre-fill fields
  useEffect(() => {
    if (!selectedTemplateId) return;
    const tpl = userTemplates.find((t) => t.id === selectedTemplateId);
    if (tpl) setName(tpl.name);
  }, [selectedTemplateId, userTemplates]);

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
      } else {
        setError(t('template.coverUploadFailed'));
      }
    } finally {
      setCoverUploading(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError(t('template.templateNamePlaceholder')); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        tags,
        isPublic,
        thumbnailUrl: coverUrl,
        existingTemplateId: overwrite && selectedTemplateId ? selectedTemplateId : undefined,
      });
      setName(''); setDescription(''); setTags([]); setIsPublic(false);
      setCoverUrl(undefined); setOverwrite(false); setSelectedTemplateId('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('template.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [name, description, tags, isPublic, coverUrl, overwrite, selectedTemplateId, onSave, onClose, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t('template.saveAsTemplate')}</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cover image */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.coverImage')}</label>
          <div
            onClick={() => !coverUploading && coverInputRef.current?.click()}
            className="relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.04] hover:border-foreground/30"
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

        {/* Overwrite toggle */}
        <div className="mb-4 flex items-center gap-2">
          <input
            id="overwrite-toggle"
            type="checkbox"
            checked={overwrite}
            onChange={(e) => { setOverwrite(e.target.checked); setSelectedTemplateId(''); }}
            className="h-3.5 w-3.5 accent-blue-500"
          />
          <label htmlFor="overwrite-toggle" className="text-xs text-foreground/60">{t('template.overwriteExisting')}</label>
        </div>

        {overwrite && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-foreground/60">{t('template.selectExistingTemplate')}</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-foreground/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              disabled={loadingTemplates}
            >
              <option value="">{loadingTemplates ? t('common.loading') : t('template.selectExistingTemplate')}</option>
              {userTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </div>
        )}

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
            {saving ? t('common.saving') : overwrite && selectedTemplateId ? t('template.updateTemplate') : t('template.saveAsTemplate')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/templates/SaveTemplateDialog.tsx
git commit -m "feat: refactor SaveTemplateDialog with cover image and overwrite mode"
```

---

### Task 13: Wire Up TemplateLibrary, Canvas.tsx, and Dashboard

**Files:**
- Modify: `src/features/templates/TemplateLibrary.tsx`
- Modify: `src/features/canvas/Canvas.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update TemplateLibrary prop signature**

In `src/features/templates/TemplateLibrary.tsx`:

1. Update the `onSaveTemplate` prop type (find the interface near line 17):
```ts
onSaveTemplate: (data: {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  thumbnailUrl?: string;
  existingTemplateId?: string;
}) => Promise<void>;
```

2. Add `canvasImages` prop to the interface:
```ts
canvasImages?: string[];
```

3. Pass `canvasImages` to `SaveTemplateDialog`. Find the `<SaveTemplateDialog>` render (around line 277) and add:
```tsx
<SaveTemplateDialog
  isOpen={showSaveDialog}
  onClose={() => setShowSaveDialog(false)}
  canvasImages={canvasImages ?? []}
  onSave={handleSaveTemplate}
/>
```

4. In `handleSaveTemplate` (around line 115), forward the full data:
```ts
const handleSaveTemplate = useCallback(async (data: {
  name: string; description: string; tags: string[]; isPublic: boolean;
  thumbnailUrl?: string; existingTemplateId?: string;
}) => {
  await onSaveTemplate(data);
  await fetchTemplates();
}, [onSaveTemplate, fetchTemplates]);
```

- [ ] **Step 2: Update Canvas.tsx handleSaveTemplate**

In `src/features/canvas/Canvas.tsx`:

1. Update `handleSaveTemplate` (around line 1723):
```ts
const handleSaveTemplate = useCallback(async (data: {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  thumbnailUrl?: string;
  existingTemplateId?: string;
}) => {
  const templateData = serializeCanvasToTemplate(nodes, edges, {
    name: data.name,
    description: data.description,
  });

  const isUpdate = Boolean(data.existingTemplateId);
  const url = isUpdate ? `/api/templates/${data.existingTemplateId}` : '/api/templates';
  const method = isUpdate ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      tags: data.tags,
      isPublic: data.isPublic,
      thumbnailUrl: data.thumbnailUrl,
      templateData,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}, [nodes, edges]);
```

2. Collect canvas image URLs and pass to `TemplateLibrary`. Find where nodes are available and add:
```ts
const canvasImages = useMemo(
  () =>
    nodes
      .filter((n) => n.type === 'imageNode')
      .map((n) => (n.data as { imageUrl?: string }).imageUrl)
      .filter((url): url is string => typeof url === 'string' && url.length > 0),
  [nodes]
);
```

3. Pass `canvasImages` to `<TemplateLibrary>` (find where it's rendered around line 1957):
```tsx
<TemplateLibrary
  ...
  canvasImages={canvasImages}
  onSaveTemplate={handleSaveTemplate}
  ...
/>
```

- [ ] **Step 3: Update dashboard/page.tsx**

In `src/app/(app)/dashboard/page.tsx`, find the `handleSaveTemplate` definition (around line 566) and update its type signature to match the new interface:

```ts
const handleSaveTemplate = useCallback(async (data: {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  thumbnailUrl?: string;
  existingTemplateId?: string;
}) => {
  // existing implementation — add thumbnailUrl and existingTemplateId handling
  const isUpdate = Boolean(data.existingTemplateId);
  const url = isUpdate ? `/api/templates/${data.existingTemplateId}` : '/api/templates';
  const method = isUpdate ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      tags: data.tags,
      isPublic: data.isPublic,
      thumbnailUrl: data.thumbnailUrl,
      // dashboard has no canvas, so no templateData — keep existing behavior
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}, []);
```

**Note:** The dashboard `handleSaveTemplate` does not have access to canvas nodes/edges, so it cannot pass `templateData`. If the dashboard's existing implementation already passes `templateData` (check line ~566 in `dashboard/page.tsx`), update it to also pass `thumbnailUrl` and handle `existingTemplateId`. If it does **not** pass `templateData` (meaning dashboard-side save is not currently functional), leave the dashboard implementation as-is and only update the type signature to match the new interface so TypeScript compiles.

Also pass `canvasImages={[]}` to `<TemplateLibrary>` on the dashboard page.

- [ ] **Step 4: Run type check and build**

```bash
npx tsc --noEmit
npm run build
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/features/templates/TemplateLibrary.tsx src/features/canvas/Canvas.tsx src/app/(app)/dashboard/page.tsx
git commit -m "feat: wire up template cover and overwrite save across TemplateLibrary and Canvas"
```

---

## Verification

After all tasks are complete, run the full check suite:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
```

Manual smoke tests:
1. **Preset Prompts:** Go to `/settings` → scroll to "预设提示词" → add a preset with a tag → open VideoGenNode → click bookmark icon → search → click preset → confirm text inserted at cursor
2. **Template Cover (with images):** Open a canvas with at least one ImageNode → open Template Library → click save → confirm cover auto-selected → save as new template → verify thumbnail shown in library
3. **Template Cover (no images):** Open empty canvas → open save dialog → confirm "no images" message shown → upload a cover manually → save
4. **Overwrite:** Save a template → re-open save dialog → check "overwrite" → select the template → save → confirm template updated (not duplicated)
