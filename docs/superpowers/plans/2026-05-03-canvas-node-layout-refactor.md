# Canvas Node Preview/Expand Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure 5 canvas node components so the media preview area is always visible as a compact card, and clicking it expands an independent settings panel with the prompt and controls.

**Architecture:** A new `useNodeExpanded` hook (local React state, no persistence) drives expand/collapse. Each node's JSX is restructured: React Flow Handles move into a `.node-preview-wrap` container that anchors them vertically to the preview card; a `.node-settings-panel` is conditionally rendered below. Collapsing is triggered by `selected → false` (React Flow deselection). All business logic stays unchanged. CSS classes are added to `globals.css`.

**Spec:** `docs/superpowers/specs/2026-05-02-canvas-node-layout-refactor-design.md`

**Tech Stack:** Next.js 15 · React 18 · TypeScript · @xyflow/react · CSS custom properties · react-i18next · Vitest · React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/canvas/nodes/shared/useNodeExpanded.ts` | Create | expand/collapse state hook |
| `src/features/canvas/nodes/shared/useNodeExpanded.test.ts` | Create | unit tests for hook |
| `src/app/globals.css` | Modify | append node layout CSS block |
| `src/i18n/locales/zh.json` | Modify | add `canvas.clickToEdit` key |
| `src/i18n/locales/en.json` | Modify | add `canvas.clickToEdit` key |
| `src/features/canvas/nodes/ImageEditNode.tsx` | Modify | preview + expand layout (~863 lines) |
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | Modify | preview + expand layout (~542 lines) |
| `src/features/canvas/nodes/VideoGenNode.tsx` | Modify | preview + expand layout (~1180 lines) |
| `src/features/canvas/nodes/StoryboardNode.tsx` | Modify | preview + expand layout (~1354 lines) |
| `src/features/canvas/nodes/StoryboardGenNode.tsx` | Modify | preview + expand layout (~1870 lines) |

---

## Task 1: useNodeExpanded hook

**Files:**
- Create: `src/features/canvas/nodes/shared/useNodeExpanded.ts`
- Create: `src/features/canvas/nodes/shared/useNodeExpanded.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/canvas/nodes/shared/useNodeExpanded.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useNodeExpanded } from './useNodeExpanded';

describe('useNodeExpanded', () => {
  it('starts collapsed', () => {
    const { result } = renderHook(() => useNodeExpanded());
    expect(result.current.expanded).toBe(false);
  });

  it('toggle flips expanded state', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.toggle(); });
    expect(result.current.expanded).toBe(true);
    act(() => { result.current.toggle(); });
    expect(result.current.expanded).toBe(false);
  });

  it('collapse sets expanded to false when expanded', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.toggle(); });
    act(() => { result.current.collapse(); });
    expect(result.current.expanded).toBe(false);
  });

  it('collapse is idempotent when already collapsed', () => {
    const { result } = renderHook(() => useNodeExpanded());
    act(() => { result.current.collapse(); });
    expect(result.current.expanded).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```
rtk vitest run src/features/canvas/nodes/shared/useNodeExpanded.test.ts
```
Expected: FAIL — "cannot find module './useNodeExpanded'"

- [ ] **Step 3: Create the hook**

Create `src/features/canvas/nodes/shared/useNodeExpanded.ts`:

```ts
import { useState, useCallback } from 'react';

export function useNodeExpanded() {
  const [expanded, setExpanded] = useState(false);
  const toggle   = useCallback(() => setExpanded(v => !v), []);
  const collapse = useCallback(() => setExpanded(false), []);
  return { expanded, toggle, collapse };
}
```

- [ ] **Step 4: Run to verify it passes**

```
rtk vitest run src/features/canvas/nodes/shared/useNodeExpanded.test.ts
```
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/canvas/nodes/shared/useNodeExpanded.ts src/features/canvas/nodes/shared/useNodeExpanded.test.ts
rtk git commit -m "feat(canvas): add useNodeExpanded hook with toggle and collapse"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add to zh.json**

Open `src/i18n/locales/zh.json`. Find the `"canvas"` object and add inside it:
```json
"clickToEdit": "点击编辑"
```

- [ ] **Step 2: Add to en.json**

Open `src/i18n/locales/en.json`. Find the `"canvas"` object and add inside it:
```json
"clickToEdit": "Click to edit"
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
rtk git add src/i18n/locales/zh.json src/i18n/locales/en.json
rtk git commit -m "feat(canvas): add clickToEdit i18n key for node preview hint"
```

---

## Task 3: Node layout CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the CSS block**

Open `src/app/globals.css` and append the following at the very end of the file:

```css
/* === Canvas Node Preview / Expand Layout === */

.node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-preview-wrap {
  position: relative;
}

/* React Flow Handles — spring-animated pop, hidden by default */
.node-preview-wrap .react-flow__handle {
  width: 28px !important;
  height: 28px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  border-radius: 50% !important;
  background: #1e1e2e !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  opacity: 0;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.node-preview-wrap .react-flow__handle-left {
  transform: translateY(-50%) translateX(8px) !important;
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.15s ease,
    box-shadow 0.15s ease !important;
}
.node-preview-wrap .react-flow__handle-right {
  transform: translateY(-50%) translateX(-8px) !important;
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.15s ease,
    box-shadow 0.15s ease !important;
}
.node-preview-wrap:hover .react-flow__handle {
  opacity: 1;
}
.node-preview-wrap:hover .react-flow__handle-left {
  transform: translateY(-50%) translateX(0) !important;
}
.node-preview-wrap:hover .react-flow__handle-right {
  transform: translateY(-50%) translateX(0) !important;
}
.node-preview-wrap .react-flow__handle:hover {
  background: #5b76fe !important;
  border-color: #5b76fe !important;
  box-shadow: 0 0 0 4px rgba(91, 118, 254, 0.2), 0 3px 12px rgba(91, 118, 254, 0.5) !important;
  transform: translateY(-50%) scale(1.15) !important;
}

.node-preview-card {
  width: 100%;
  background: var(--canvas-node-bg);
  border-radius: 12px;
  box-shadow: 0 0 0 1px var(--canvas-node-border);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}
.node-wrap:hover .node-preview-card {
  box-shadow: 0 0 0 1.5px rgba(91, 118, 254, 0.5), 0 4px 20px rgba(91, 118, 254, 0.1);
}
.node-preview-card--selected {
  box-shadow: 0 0 0 1.5px #5b76fe, 0 4px 24px rgba(91, 118, 254, 0.18) !important;
}

.node-preview-header {
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid var(--canvas-node-border);
}

.node-preview-media {
  background: var(--canvas-node-section-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 120px;
  overflow: hidden;
}

.node-edit-hint {
  position: absolute;
  bottom: 8px;
  right: 10px;
  font-size: 10px;
  color: var(--canvas-node-fg-muted);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--canvas-node-border);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease 0.1s;
}
.node-wrap:hover .node-edit-hint {
  opacity: 1;
}

.node-gap-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 16px;
  gap: 3px;
}
.node-dot {
  width: 2px;
  height: 2px;
  background: var(--canvas-node-border);
  border-radius: 50%;
}

.node-settings-panel {
  display: inline-flex;
  flex-direction: column;
  gap: 10px;
  background: var(--canvas-node-bg);
  border-radius: 12px;
  box-shadow: 0 0 0 1px var(--canvas-node-border);
  padding: 14px;
  min-width: 220px;
}

.node-ctrl-row {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/app/globals.css
rtk git commit -m "feat(canvas): add node preview/expand layout CSS classes"
```

---

## Task 4: Refactor ImageEditNode

**Context — read before starting:**
- File: `src/features/canvas/nodes/ImageEditNode.tsx` (~863 lines)
- JSX return starts at line ~673; Handles at lines ~840–851 (inside root div)
- Already imports: `useUpdateNodeInternals`, `useRef`, `useEffect`, `useState`, `useCallback`, `Handle`, `Position`, `Sparkles`, `NodeHeader`, `NODE_HEADER_FLOATING_POSITION_CLASS`
- Current outer div: `data-testid="node-imageEdit"`, `onClick={() => setSelectedNode(id)}`, `style={{ width, height }}`
- `resolvedWidth` / `resolvedHeight` computed from node data
- `setSelectedNode` from `useCanvasStore`

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`

- [ ] **Step 1: Add import for useNodeExpanded**

In the imports section, add:
```ts
import { useNodeExpanded } from './shared/useNodeExpanded';
```

- [ ] **Step 2: Add hook + effects inside component body**

After all existing hooks (just before the `return`), add:

```ts
const { expanded, toggle, collapse } = useNodeExpanded();

const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);

useEffect(() => {
  updateNodeInternals(id);
}, [expanded, id, updateNodeInternals]);
```

`updateNodeInternals` is already declared via `useUpdateNodeInternals(id)` earlier in the component. If it uses a different variable name, adapt accordingly.

- [ ] **Step 3: Replace the entire return block**

Find `return (` at line ~673 and replace the entire block through the closing `);` (line ~859) with:

```tsx
return (
  <div
    ref={rootRef}
    className="node-wrap"
    style={{ width: `${resolvedWidth}px` }}
    data-testid="node-imageEdit"
  >
    {/* Preview wrap — Handles anchor here, vertically centred on preview card */}
    <div className="node-preview-wrap" style={{ width: `${resolvedWidth}px` }}>
      <Handle
        type="target"
        id="target"
        position={Position.Left}
      />
      <Handle
        type="source"
        id="source"
        position={Position.Right}
      />
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
          toggle();
        }}
        className={`node-preview-card${selected ? ' node-preview-card--selected' : ''}`}
      >
        <div className="node-preview-header">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
          <span className="truncate text-[12px] font-semibold leading-none text-[var(--canvas-node-fg)]">
            {resolvedTitle}
          </span>
        </div>
        <div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
          <Sparkles className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
          <div className="node-edit-hint">{t('canvas.clickToEdit')}</div>
        </div>
      </div>
    </div>

    {expanded && (
      <div className="node-gap-dots">
        <span className="node-dot" />
        <span className="node-dot" />
        <span className="node-dot" />
      </div>
    )}

    {expanded && (
      <div
        onClick={(e) => e.stopPropagation()}
        className="node-settings-panel"
      >
        <NodeHeader
          icon={<Sparkles className="h-4 w-4" />}
          titleText={resolvedTitle}
          rightSlot={undefined}
          editable
          onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
        />

        <div className="relative rounded-lg border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] p-2">
          <div className="mb-1 flex w-full items-center justify-between">
            <span className="text-xs text-[var(--canvas-node-fg-muted)]">
              {t('node.imageEdit.promptPlaceholder')}
            </span>
            <div className="flex items-center gap-1">
              <PresetPickerButton onInsert={handlePresetInsert} />
            </div>
          </div>
          <div className="relative" style={{ minHeight: 72 }}>
            <div
              ref={promptHighlightRef}
              aria-hidden="true"
              className="ui-scrollbar pointer-events-none absolute inset-0 overflow-y-auto overflow-x-hidden text-sm leading-6 text-[var(--canvas-node-fg)]"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="min-h-full whitespace-pre-wrap break-words px-1 py-0.5">
                {renderPromptWithHighlights(promptDraft, incomingImages.length)}
              </div>
            </div>
            <textarea
              ref={promptRef}
              value={promptDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setPromptDraft(nextValue);
                commitPromptDraft(nextValue);
              }}
              onKeyDown={handlePromptKeyDown}
              onScroll={syncPromptHighlightScroll}
              onMouseDown={(event) => event.stopPropagation()}
              placeholder={t('node.imageEdit.promptPlaceholder')}
              className="ui-scrollbar nodrag nowheel relative z-10 w-full resize-none overflow-y-auto overflow-x-hidden border-none bg-transparent px-1 py-0.5 text-sm leading-6 text-transparent caret-[var(--canvas-node-fg)] outline-none placeholder:text-[var(--canvas-node-fg-muted)]/80 focus:border-transparent whitespace-pre-wrap break-words"
              style={{ scrollbarGutter: 'stable', minHeight: 72 }}
            />
          </div>

          {showImagePicker && incomingImageItems.length > 0 && (
            <div
              className="nowheel absolute z-30 w-[120px] overflow-hidden rounded-xl border border-[var(--canvas-node-border)] bg-[var(--canvas-menu-bg)] shadow-xl"
              style={{ left: pickerAnchor.left, top: pickerAnchor.top }}
              onMouseDown={(event) => event.stopPropagation()}
              onWheelCapture={(event) => event.stopPropagation()}
            >
              <div
                className="ui-scrollbar nowheel max-h-[180px] overflow-y-auto"
                onWheelCapture={(event) => event.stopPropagation()}
              >
                {incomingImageItems.map((item, index) => (
                  <button
                    key={`${item.imageUrl}-${index}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      insertImageReference(index);
                    }}
                    onMouseEnter={() => setPickerActiveIndex(index)}
                    className={`flex w-full items-center gap-2 border border-transparent bg-[var(--canvas-node-section-bg)] px-2 py-2 text-left text-sm text-[var(--canvas-node-fg)] transition-colors hover:border-[var(--canvas-node-border)] ${
                      pickerActiveIndex === index
                        ? 'border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)]'
                        : ''
                    }`}
                  >
                    <CanvasNodeImage
                      src={item.displayUrl}
                      alt={item.label}
                      viewerSourceUrl={resolveImageDisplayUrl(item.imageUrl)}
                      viewerImageList={incomingImageViewerList}
                      className="h-8 w-8 rounded object-cover"
                      draggable={false}
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <LogicalModelPicker
          scenario="image"
          value={data.logicalModelId ?? null}
          onChange={handleLogicalModelChange}
        />

        <div className="node-ctrl-row">
          <ModelParamsControls
            imageModels={imageModels}
            selectedModel={selectedModel}
            resolutionOptions={resolutionOptions}
            selectedResolution={selectedResolution}
            selectedAspectRatio={selectedAspectRatio}
            aspectRatioOptions={aspectRatioOptions}
            onModelChange={(modelId) => { updateNodeData(id, { model: modelId }); }}
            onResolutionChange={(resolution) => { updateNodeData(id, { size: resolution as ImageSize }); }}
            onAspectRatioChange={(aspectRatio) => { updateNodeData(id, { requestAspectRatio: aspectRatio }); }}
            extraParams={data.extraParams}
            onExtraParamChange={(key, value) =>
              updateNodeData(id, {
                extraParams: { ...(data.extraParams ?? {}), [key]: value },
              })
            }
            showWebSearchToggle={showWebSearchToggle}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={(enabled) =>
              updateNodeData(id, {
                extraParams: { ...(data.extraParams ?? {}), enable_web_search: enabled },
              })
            }
            triggerSize="sm"
            chipClassName={NODE_CONTROL_CHIP_CLASS}
            modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
            paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
          />
          <div className="ml-auto" />
          <UiButton
            onClick={(event) => {
              event.stopPropagation();
              void handleGenerate();
            }}
            variant="primary"
            className={`shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
          >
            <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
            {t('canvas.generate')}
          </UiButton>
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
    )}

    <NodeResizeHandle
      minWidth={IMAGE_EDIT_NODE_MIN_WIDTH}
      minHeight={IMAGE_EDIT_NODE_MIN_HEIGHT}
      maxWidth={IMAGE_EDIT_NODE_MAX_WIDTH}
      maxHeight={IMAGE_EDIT_NODE_MAX_HEIGHT}
    />
  </div>
);
```

Note: The outer div no longer has `height` in its inline style (height is now auto). `NodeResizeHandle` is kept so users can still resize the preview card width.

- [ ] **Step 4: Run TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors. Common issues to watch: unused `resolvedHeight` variable (remove if no longer used), removed `onClick` on outer div (correct — moved to preview card).

- [ ] **Step 5: Run unit tests**

```
rtk vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/features/canvas/nodes/ImageEditNode.tsx
rtk git commit -m "feat(canvas): refactor ImageEditNode to preview/expand layout"
```

---

## Task 5: Refactor VideoAnalysisNode

**Context — read before starting:**
- File: `src/features/canvas/nodes/VideoAnalysisNode.tsx` (~542 lines)
- Smallest of the 5 nodes. Read the full JSX return section before editing.
- The node receives a `data.videoUrl` (or similar field — check `VideoAnalysisNodeData` in `src/features/canvas/domain/canvasNodes.ts` for the exact field name).
- Preview card content: video thumbnail with `<video src={data.videoUrl} ... />` if available, else placeholder `<Film />` icon.
- Settings panel content: everything else — file upload input, analysis controls, result display, action buttons.
- Uses `Film` icon (imported from `lucide-react`).

**Files:**
- Modify: `src/features/canvas/nodes/VideoAnalysisNode.tsx`

- [ ] **Step 1: Add import**

```ts
import { useNodeExpanded } from './shared/useNodeExpanded';
```

- [ ] **Step 2: Add hook + effects inside component body**

After all existing hooks (before the `return`), add:

```ts
const { expanded, toggle, collapse } = useNodeExpanded();

const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);
```

If `useUpdateNodeInternals` is already imported and called in this file, also add:
```ts
useEffect(() => {
  updateNodeInternals(id);
}, [expanded, id, updateNodeInternals]);
```

- [ ] **Step 3: Replace the return block**

Replace the existing `return (...)` with the new structure. Use the following skeleton, filling in the settings panel with ALL existing content from the old return (NodeHeader, file upload, analysis controls, results, buttons):

```tsx
return (
  <div
    className="node-wrap"
    style={{ width: `${width ?? DEFAULT_WIDTH}px` }}
    data-testid="node-videoAnalysis"
  >
    <div className="node-preview-wrap" style={{ width: `${width ?? DEFAULT_WIDTH}px` }}>
      <Handle type="target" id="target" position={Position.Left} />
      <Handle type="source" id="source" position={Position.Right} />
      <div
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={`node-preview-card${selected ? ' node-preview-card--selected' : ''}`}
      >
        <div className="node-preview-header">
          <Film className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
          <span className="truncate text-[12px] font-semibold leading-none text-[var(--canvas-node-fg)]">
            {resolveNodeDisplayName(data, t)}
          </span>
        </div>
        <div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
          {/* Show video thumbnail if loaded, else placeholder */}
          {data.videoUrl ? (
            <video
              src={data.videoUrl}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <Film className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
          )}
          <div className="node-edit-hint">{t('canvas.clickToEdit')}</div>
        </div>
      </div>
    </div>

    {expanded && (
      <div className="node-gap-dots">
        <span className="node-dot" />
        <span className="node-dot" />
        <span className="node-dot" />
      </div>
    )}

    {expanded && (
      <div
        onClick={(e) => e.stopPropagation()}
        className="node-settings-panel"
      >
        {/* === MOVE ALL EXISTING SETTINGS CONTENT HERE === */}
        {/* NodeHeader (remove NODE_HEADER_FLOATING_POSITION_CLASS — not needed in panel) */}
        {/* File upload input, analysis controls, scene list, action buttons */}
        {/* Keep all existing handlers/logic exactly as-is */}
      </div>
    )}

    {/* Keep NodeResizeHandle if the original has it */}
  </div>
);
```

**Important:** Check the actual field name for the video URL in `VideoAnalysisNodeData`. If it's not `data.videoUrl`, use the correct field. If there's no video URL field at all, use the placeholder only.

**Also check:** Does the current return use `width` and `height` from props directly, or `resolvedWidth`/`resolvedHeight` computed values? Use whatever the existing code uses for the outer div's width.

- [ ] **Step 4: Run TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Run unit tests**

```
rtk vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/features/canvas/nodes/VideoAnalysisNode.tsx
rtk git commit -m "feat(canvas): refactor VideoAnalysisNode to preview/expand layout"
```

---

## Task 6: Refactor VideoGenNode

**Context — read before starting:**
- File: `src/features/canvas/nodes/VideoGenNode.tsx` (~1180 lines)
- JSX return at line ~697. Outer div uses `flex flex-col rounded-xl border-2 bg-[var(--canvas-node-bg)]` with `selected ? 'border-accent ...' : 'border-...'` conditional.
- Has `setSelectedNode(id)` on outer div — move to preview card click handler.
- Has internal `promptCollapsed` state (collapsible prompt section) — this stays in the settings panel.
- The `status.videoUrl` holds the generated video URL (from line ~255 in the file).
- Preview card content: video player if `status.videoUrl` is set, else placeholder `<Sparkles />` or `<Film />` icon.
- Settings panel content: NodeHeader, prompt input section (with `promptCollapsed` toggle), model/param controls, start/end frame pickers, generate button.
- Uses `Sparkles` icon for the header.

**Files:**
- Modify: `src/features/canvas/nodes/VideoGenNode.tsx`

- [ ] **Step 1: Add import**

```ts
import { useNodeExpanded } from './shared/useNodeExpanded';
```

- [ ] **Step 2: Add hook + effects**

After all existing hooks (before `return`):

```ts
const { expanded, toggle, collapse } = useNodeExpanded();

const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);

useEffect(() => {
  updateNodeInternals(id);
}, [expanded, id, updateNodeInternals]);
```

If `useUpdateNodeInternals` is not already in this file, add its import from `@xyflow/react` and call `const updateNodeInternals = useUpdateNodeInternals(id)`.

- [ ] **Step 3: Replace the return block**

Replace the existing `return (...)` with:

```tsx
return (
  <div
    className="node-wrap"
    style={{ width: `${resolvedWidth}px` }}
    data-testid="node-videoGen"
  >
    <div className="node-preview-wrap" style={{ width: `${resolvedWidth}px` }}>
      <Handle type="target" id="target" position={Position.Left} />
      <Handle type="source" id="source" position={Position.Right} />
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
          toggle();
        }}
        className={`node-preview-card${selected ? ' node-preview-card--selected' : ''}`}
      >
        <div className="node-preview-header">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
          <span className="truncate text-[12px] font-semibold leading-none text-[var(--canvas-node-fg)]">
            {resolvedTitle}
          </span>
        </div>
        <div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
          {status.videoUrl ? (
            <video
              src={status.videoUrl}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <Sparkles className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
          )}
          <div className="node-edit-hint">{t('canvas.clickToEdit')}</div>
        </div>
      </div>
    </div>

    {expanded && (
      <div className="node-gap-dots">
        <span className="node-dot" />
        <span className="node-dot" />
        <span className="node-dot" />
      </div>
    )}

    {expanded && (
      <div
        onClick={(e) => e.stopPropagation()}
        className="node-settings-panel"
      >
        {/* === ALL EXISTING SETTINGS CONTENT FROM OLD RETURN GOES HERE === */}
        {/* NodeHeader (no NODE_HEADER_FLOATING_POSITION_CLASS) */}
        {/* Content Wrapper div with gap-2 */}
        {/* Prompt Input section (with promptCollapsed toggle) */}
        {/* Model / param controls */}
        {/* Start/end frame pickers */}
        {/* Generate button */}
        {/* Error / status messages */}
      </div>
    )}

    {/* Copy the existing NodeResizeHandle call verbatim from the old return block */}
    {/* It uses constants like VIDEO_GEN_NODE_MIN_WIDTH etc. defined near the top of the file */}
  </div>
);
```

**Note:** `status` is the derived video status object. Confirm the correct field path for the video URL by checking where `videoUrl` is set in the file. If the variable is named differently (e.g., `videoResult`, `generatedVideoUrl`), use that name.

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Run unit tests**

```
rtk vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/features/canvas/nodes/VideoGenNode.tsx
rtk git commit -m "feat(canvas): refactor VideoGenNode to preview/expand layout"
```

---

## Task 7: Refactor StoryboardNode

**Context — read before starting:**
- File: `src/features/canvas/nodes/StoryboardNode.tsx` (~1354 lines)
- Read the JSX return section before editing.
- This node displays storyboard scenes. Look for a grid/list of scene thumbnails in the current JSX.
- Preview card content: the first row of storyboard frame thumbnails (or a stacked grid) if scenes exist, else a placeholder icon (use `Film` or whichever icon is used in NodeHeader).
- Settings panel content: scene editing controls, title inputs, action buttons, the full scene list editor.
- Check which icon is used in the existing NodeHeader call (`icon={...}`) — use that same icon in the preview card header.
- `setSelectedNode` — check if the outer div has this; if so, move it to the preview card click handler.

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardNode.tsx`

- [ ] **Step 1: Add import**

```ts
import { useNodeExpanded } from './shared/useNodeExpanded';
```

- [ ] **Step 2: Add hook + effects**

After all existing hooks (before `return`):

```ts
const { expanded, toggle, collapse } = useNodeExpanded();

const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);
```

If `useUpdateNodeInternals` is imported and used in this file, also add:
```ts
useEffect(() => {
  updateNodeInternals(id);
}, [expanded, id, updateNodeInternals]);
```

- [ ] **Step 3: Replace the return block**

Use the same structural skeleton as Tasks 5–6. For the preview card media area, show a compact storyboard preview:

```tsx
<div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
  {data.scenes && data.scenes.length > 0 ? (
    <div className="flex h-full w-full gap-0.5 overflow-hidden">
      {data.scenes.slice(0, 4).map((scene, i) => (
        <div key={i} className="flex-1 bg-[var(--canvas-node-section-bg)]">
          {scene.imageUrl && (
            <img
              src={scene.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  ) : (
    <Film className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
  )}
  <div className="node-edit-hint">{t('canvas.clickToEdit')}</div>
</div>
```

**Important:** Check the actual `StoryboardNodeData` interface for the correct field names (`scenes`, `imageUrl`, etc.). Adapt the preview JSX to match the real data shape.

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Run unit tests**

```
rtk vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/features/canvas/nodes/StoryboardNode.tsx
rtk git commit -m "feat(canvas): refactor StoryboardNode to preview/expand layout"
```

---

## Task 8: Refactor StoryboardGenNode

**Context — read before starting:**
- File: `src/features/canvas/nodes/StoryboardGenNode.tsx` (~1870 lines, most complex)
- Read the JSX return section before editing. The return is likely 500+ lines.
- This node GENERATES storyboards. Look for:
  - Any generated storyboard thumbnail display (scenes array in data, or a result preview)
  - The main generation controls: prompt textarea, style/aspect ratio params, generate button
- Preview card content: storyboard thumbnail grid (same pattern as Task 7) if `data.scenes` exists, else placeholder.
- Settings panel content: everything else — NodeHeader, prompt input, all generation controls, scene list if editable, generate button, error messages.
- Check which icon is used in NodeHeader and use the same in the preview header.

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`

- [ ] **Step 1: Add import**

```ts
import { useNodeExpanded } from './shared/useNodeExpanded';
```

- [ ] **Step 2: Add hook + effects**

Same pattern as all previous tasks:

```ts
const { expanded, toggle, collapse } = useNodeExpanded();

const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);
```

Add `updateNodeInternals` effect if `useUpdateNodeInternals` is already used in the file.

- [ ] **Step 3: Replace the return block**

Follow the same structural skeleton. For preview content, use the storyboard grid pattern from Task 7 (adapt to the actual data fields in `StoryboardGenNodeData`).

For the settings panel, move ALL existing settings/generation UI into it — this is a large block; be careful to preserve every handler and every existing JSX element.

Use `Ctrl+F` style search for `</div>` depths to find the exact end of the old return block.

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Run unit tests**

```
rtk vitest run
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/features/canvas/nodes/StoryboardGenNode.tsx
rtk git commit -m "feat(canvas): refactor StoryboardGenNode to preview/expand layout"
```

---

## Task 9: Final validation

**Files:** All modified files (read-only verification)

- [ ] **Step 1: Full TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 2: Full test suite**

```
rtk vitest run
```
Expected: all tests pass, no regressions

- [ ] **Step 3: Build check**

```
rtk next build
```
Expected: successful build, no errors

- [ ] **Step 4: Commit if any last-minute fixes were needed**

```bash
rtk git add -A
rtk git commit -m "fix(canvas): resolve any remaining issues from node layout refactor"
```

---

## Implementation Notes

**Pattern for collapse-on-deselect (all nodes):**
```ts
const prevSelected = useRef(selected);
useEffect(() => {
  if (prevSelected.current && !selected) collapse();
  prevSelected.current = selected;
}, [selected, collapse]);
```
This fires only when `selected` transitions from `true` to `false`, avoiding collapse on initial render.

**React Flow Handle positioning:**
Handles placed inside `.node-preview-wrap` (`position: relative`) are automatically vertically centred on the preview card height by React Flow's built-in CSS (`top: 50%`). When the settings panel expands below, handles stay centred on the preview card — this is the intended behaviour.

**`useUpdateNodeInternals`:**
Call it when `expanded` changes so React Flow recalculates edge connection points after the node's overall height changes.

**Settings panel width:**
`.node-settings-panel` uses `display: inline-flex; white-space: nowrap` so it expands to fit its controls naturally. Do NOT set a fixed width — let the content determine it.

**NodeHeader in settings panel:**
Remove `NODE_HEADER_FLOATING_POSITION_CLASS` from NodeHeader when placing it inside the settings panel. The floating class uses `position: absolute` which makes no sense inside a flex column.

**NodeResizeHandle:**
Keep it if the original node has it. After refactoring, it resizes the preview card width (and the outer node width). The settings panel width is independent (inline-flex).
