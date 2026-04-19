# Design: Preset Prompts & Template Cover Image

**Date:** 2026-04-18  
**Status:** Approved

---

## Overview

Two independent features:

1. **Preset Prompts** — Users manage named, tagged prompt presets in Settings; any canvas node with a prompt textarea can insert a preset at the cursor position.
2. **Template Cover Image + Overwrite Save** — SaveTemplateDialog gains a cover image (auto-selected from canvas, user-uploadable) and an "overwrite existing template" mode. TemplateCard already renders `thumbnail_url`.

---

## Feature 1: Preset Prompts

### Data Model

```ts
interface PresetPrompt {
  id: string        // nanoid
  name: string      // display label
  content: string   // prompt text
  tags: string[]    // free-input tags, auto-grouped in UI
  createdAt: number // Unix ms
}
```

### Storage

New file: `src/stores/presetPromptsStore.ts`

- Zustand + `persist` middleware, key `preset-prompts-storage`, version 1
- Initial state: `presets: PresetPrompt[]`
- Actions: `addPreset(preset)`, `updatePreset(id, partial)`, `deletePreset(id)`
- No migration needed at v1

### Settings UI

Location: `/settings` page — new `PresetPromptsSection` component appended below existing sections.

Layout:
- Section header "预设提示词 / Preset Prompts" + "新增" button
- Presets grouped by tag (ungrouped → "未分类 / Uncategorized")
- Each preset row: name (bold) + content preview (truncated, 1 line) + tag chips + Edit / Delete icon buttons
- "新增" or "编辑" opens an inline form (or small modal):
  - Name field (required)
  - Content textarea (required, ~4 rows)
  - Tags input (Enter/comma to add, ×-chip to remove)
  - Save / Cancel buttons

### Shared Component: `PresetPicker`

New file: `src/features/preset-prompts/PresetPicker.tsx`

Props:
```ts
interface PresetPickerProps {
  onInsert: (content: string) => void
  trigger: React.ReactNode  // icon button rendered by the caller
}
```

Behavior:
- Renders `trigger` wrapped in a Popover container
- Popover content: search input (filters by name + content) + tag filter chips + scrollable list
- Clicking a preset item calls `onInsert(content)` and closes the popover
- Empty state: "暂无预设 / No presets — go to Settings to add"

### Node Integration

Nodes to update: `VideoGenNode`, `ImageEditNode`, `StoryboardGenNode`, `StoryboardNode`, `NovelInputNode`

For each node:
1. Import `PresetPicker` and the node's prompt `ref` (textarea ref)
2. Add a `BookmarkIcon` trigger button adjacent to the prompt textarea label/header
3. Implement `handleInsert(content)`:
   ```ts
   const handleInsert = (content: string) => {
     const el = promptRef.current
     if (!el) return
     const start = el.selectionStart ?? el.value.length
     const end = el.selectionEnd ?? el.value.length
     const next = el.value.slice(0, start) + content + el.value.slice(end)
     setPromptDraft(next)
     // restore cursor after inserted text
     requestAnimationFrame(() => {
       el.focus()
       el.setSelectionRange(start + content.length, start + content.length)
     })
   }
   ```
4. Pass `handleInsert` to `PresetPicker` as `onInsert`

---

## Feature 2: Template Cover Image + Overwrite Save

### Cover Image Flow

When `SaveTemplateDialog` opens:
1. Caller passes `canvasImages: string[]` — ordered list of image URLs found on the canvas (ImageNode `imageUrl` only; video URLs are excluded as they are not displayable as static images)
2. If `canvasImages.length > 0`: pre-select `canvasImages[0]` as default `coverUrl`
3. If `canvasImages.length === 0`: `coverUrl` is null; show empty cover placeholder with text "画布暂无图片，可上传封面 / No canvas images — upload a cover"
4. User may click the cover area to upload a local file → file is uploaded via `POST /api/templates/upload-cover` → response `{ url }` replaces `coverUrl`

### Overwrite Existing Template

`SaveTemplateDialog` new "overwrite" mode:
- A toggle/checkbox "覆盖现有模板 / Overwrite existing template" near the top
- When checked: fetch `GET /api/templates?category=custom` to populate a `<select>` dropdown of the user's own templates
- Selecting a template auto-fills name, description, tags, and sets `existingTemplateId`
- On save: if `existingTemplateId` is set → `PATCH /api/templates/:id`; else → `POST /api/templates`

### `SaveTemplateDialog` Props Update

```ts
interface SaveTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  canvasImages: string[]  // NEW — ordered list of canvas image URLs
  onSave: (data: {
    name: string
    description: string
    tags: string[]
    isPublic: boolean
    thumbnailUrl?: string   // NEW
    existingTemplateId?: string  // NEW
  }) => Promise<void>
}
```

Callers must pass `canvasImages` (collected from canvasStore nodes before opening the dialog).

### API: Upload Cover

`POST /api/templates/upload-cover`
- Request: `multipart/form-data` with field `file` (image, max 2 MB)
- Uploads to Supabase Storage bucket `template-covers` (public)
- Response: `{ url: string }` — public URL
- Auth: required (same pattern as other template routes)

### API: Update Template

`PATCH /api/templates/[id]`
- Request body (all fields optional):
  ```json
  {
    "name": "string",
    "description": "string",
    "tags": ["string"],
    "thumbnailUrl": "string",
    "isPublic": true,
    "templateData": { ... }
  }
  ```
- Validates ownership via `user_id = auth.uid()` (RLS)
- Updates only provided fields (partial update)
- Response: updated template row

### `TemplateLibrary` Changes

- `onSaveTemplate` prop signature updated to match new `SaveTemplateDialog.onSave`
- Pass `canvasImages` down to `SaveTemplateDialog` (collect from `useCanvasStore` in the canvas page or `TemplateLibrary` caller)
- `TemplateCard` requires no changes — `thumbnail_url` display already implemented

---

## i18n Keys

### Feature 1 — Preset Prompts
```
presetPrompts.sectionTitle
presetPrompts.addButton
presetPrompts.editButton
presetPrompts.deleteButton
presetPrompts.uncategorized
presetPrompts.namePlaceholder
presetPrompts.contentPlaceholder
presetPrompts.tagsPlaceholder
presetPrompts.searchPlaceholder
presetPrompts.noPresets
presetPrompts.insertPreset
```

### Feature 2 — Template Cover & Overwrite
```
template.coverImage
template.coverUpload
template.noCoverImage
template.overwriteExisting
template.selectExistingTemplate
template.uploadingCover
template.coverUploadFailed
```

---

## Error Handling

- Cover upload fails: show inline error in dialog, coverUrl falls back to canvas default or null
- Overwrite PATCH fails: surface error message in dialog (same pattern as existing POST error handling)
- `PresetPicker` with no presets: shows empty state with link-style text directing user to Settings

---

## Out of Scope

- Preset prompts sync across devices (localStorage only)
- Preset import/export
- Template cover cropping/resizing
- Template versioning history
