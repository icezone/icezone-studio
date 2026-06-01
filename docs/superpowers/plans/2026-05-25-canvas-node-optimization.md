# Canvas Node Optimization Implementation Plan (Phase 1 + 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply P0 connectivity fixes + P1 visual-differentiation improvements identified in the 2026-05-25 canvas node analysis — unblock 3 new product workflows (split-arbitrary-image, video→re-video, novel→single-image) and add visual feedback during connection drags + node-type identification.

**Architecture:** All changes are surgical edits to existing files — no new modules, no refactors. Phase 1 = 4 small connectivity/data-type tweaks (~1 hour total). Phase 2 = node-type badge component reused across the 5 split-layout nodes' preview headers (~30 min).

**Tech Stack:** Next.js 15 · React 18 · TypeScript · @xyflow/react · Tailwind · Vitest

> **Out of scope (separate plans needed):** Phase 3 (refactoring StoryboardGenNode 1891-line / VideoGenNode 1227-line / StoryboardNode 1383-line files into sub-modules) and Phase 4 (per-node-type tool plugin extensions + textAnnotation → sticky-note-layer rewrite) are each multi-day efforts and need their own dedicated plans.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/canvas/domain/nodeRegistry.ts` | Modify | Make storyboardSplit menu-visible; extend videoGen + imageEdit `inputDataTypes` |
| `src/features/canvas/domain/connectionValidator.ts` | Modify | Add widening rules for new connection types |
| `__tests__/unit/canvas/connectionValidator.test.ts` | Modify | Cover the 3 newly-allowed connections + storyboardSplit menu visibility |
| `src/features/canvas/domain/nodeDisplay.ts` (NEW: `nodeBadge.ts`) | Create | Map node type → short badge label + color |
| `src/features/canvas/nodes/ImageEditNode.tsx` | Modify | Render `<NodeTypeBadge>` in preview-header |
| `src/features/canvas/nodes/StoryboardGenNode.tsx` | Modify | Same |
| `src/features/canvas/nodes/VideoGenNode.tsx` | Modify | Same |
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | Modify | Same |
| `src/features/canvas/nodes/StoryboardNode.tsx` | Modify | Same |
| `src/features/canvas/ui/NodeTypeBadge.tsx` | Create | Reusable small chip component |
| `src/app/globals.css` | Modify | Add `.react-flow__handle--valid-drop` + `.react-flow__handle--invalid-drop` styles during connect |
| `src/features/canvas/Canvas.tsx` | Modify | Apply valid/invalid class to handles during active drag |

---

## Phase 1 — P0 Connectivity & UX (immediate value)

### Task 1.1: Make `storyboardSplit` visible in node menu

**Files:**
- Modify: `src/features/canvas/domain/nodeRegistry.ts`

- [ ] **Step 1: Find the storyboardSplitDefinition block and flip `visibleInMenu`**

In `src/features/canvas/domain/nodeRegistry.ts`, find:

```ts
const storyboardSplitDefinition: CanvasNodeDefinition<StoryboardSplitNodeData> = {
  type: CANVAS_NODE_TYPES.storyboardSplit,
  menuLabelKey: 'node.menu.storyboard',
  menuIcon: 'layout',
  visibleInMenu: false,
```

Change `visibleInMenu: false` → `visibleInMenu: true`.

- [ ] **Step 2: Verify the menu label key exists in i18n locales**

Run:

```bash
grep -n "menu.storyboard" src/i18n/locales/zh.json src/i18n/locales/en.json
```

Expected: both files contain `"storyboard": "..."` under the `"menu"` namespace. If missing, add `"storyboard": "分镜切割"` to zh.json and `"storyboard": "Storyboard Split"` to en.json under `node.menu`.

- [ ] **Step 3: TS + lint + test**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: TS clean, lint clean, all tests pass.

### Task 1.2: Allow `videoAnalysis → videoGen` (close the video→re-video loop)

**Files:**
- Modify: `src/features/canvas/domain/nodeRegistry.ts`
- Modify: `__tests__/unit/canvas/connectionValidator.test.ts`

`videoAnalysis.outputDataType = 'image-set'` and `videoGen.inputDataTypes = ['image', 'text']`. The widening rule `image-set ⊆ image` already covers this — so this connection ALREADY works. Verify and add a test to lock it down.

- [ ] **Step 1: Add a confirmation test first**

Append to `__tests__/unit/canvas/connectionValidator.test.ts` inside the existing `describe`:

```ts
  it('allows videoAnalysis (image-set) -> videoGen (image|text) [widening closes the video re-gen loop]', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoAnalysis, CANVAS_NODE_TYPES.videoGen)).toBe(true);
  });
```

- [ ] **Step 2: Run test, verify pass (already valid via widening)**

```bash
npx vitest run __tests__/unit/canvas/connectionValidator.test.ts
```

Expected: 9 tests pass (was 8).

- [ ] **Step 3: Update connection matrix doc**

In `docs/architecture/canvas-node-connections.md`, find the row for `videoAnalysis` and confirm `✓ (widening)` for the `videoGen` column. If not, edit it in. (After this task, the matrix should show: videoAnalysis row, videoGen column = `✓ (widening)`.)

### Task 1.3: Allow `novelInput → imageEdit` (novel → single image, 1 step)

**Files:**
- Modify: `src/features/canvas/domain/nodeRegistry.ts`
- Modify: `__tests__/unit/canvas/connectionValidator.test.ts`
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx` (consume incoming text as prompt seed)

- [ ] **Step 1: Extend imageEdit's inputDataTypes**

In `src/features/canvas/domain/nodeRegistry.ts`, find the imageEdit definition's connectivity block:

```ts
  connectivity: {
    sourceHandle: true,
    targetHandle: true,
    outputDataType: 'image',
    inputDataTypes: ['image'],
    connectMenu: {
      fromSource: true,
      fromTarget: false,
    },
  },
```

Change `inputDataTypes: ['image']` → `inputDataTypes: ['image', 'text']`.

- [ ] **Step 2: Add validator test**

Append to `__tests__/unit/canvas/connectionValidator.test.ts`:

```ts
  it('allows novelInput (text) -> imageEdit (text+image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });

  it('still allows imageEdit (image) -> imageEdit (chaining)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.imageEdit, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run __tests__/unit/canvas/connectionValidator.test.ts
```

Expected: 11 tests pass.

- [ ] **Step 4: Wire text consumption in ImageEditNode (read upstream novelInput text as prompt seed)**

In `src/features/canvas/nodes/ImageEditNode.tsx`, find the existing `incomingImages` computation around the `graphImageResolver.collectInputImages` call. Add a parallel `incomingTexts` derivation. The simplest implementation: when `data.prompt` is empty AND there's an incoming novelInput node connected, seed `promptDraft` from its `scenes[0]?.description ?? scenes[0]?.text ?? ''`.

Specifically, find the `useEffect` or `useState` for `promptDraft` initialization. Add:

```ts
// Auto-seed prompt from upstream novelInput (text) if user hasn't typed anything yet.
useEffect(() => {
  if (data.prompt && data.prompt.trim().length > 0) return; // user-set prompt wins
  const upstreamTextNode = nodes.find((n) => {
    const isUpstream = edges.some((e) => e.source === n.id && e.target === id);
    return isUpstream && n.type === CANVAS_NODE_TYPES.novelInput;
  });
  if (!upstreamTextNode) return;
  const novelData = upstreamTextNode.data as { scenes?: Array<{ description?: string }> };
  const firstSceneText = novelData.scenes?.[0]?.description?.trim();
  if (firstSceneText) {
    updateNodeData(id, { prompt: firstSceneText });
  }
}, [id, nodes, edges, data.prompt, updateNodeData]);
```

(Read the existing imports/state for ImageEditNode first — `nodes`, `edges`, `updateNodeData`, `id` should already be in scope. If `CANVAS_NODE_TYPES` import is missing, add it. The effect only fires when prompt is empty — never overwrites a user-typed prompt.)

- [ ] **Step 5: TS + lint + test**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: clean.

### Task 1.4: Visual valid-drop / invalid-drop feedback during connection drag

**Files:**
- Modify: `src/app/globals.css` (add CSS for handle highlight states)
- Modify: `src/features/canvas/Canvas.tsx` (apply class to body during drag, use CSS attribute selectors on handles)

React Flow already sets `.connecting` class on the renderer during drag. We add CSS that uses `:has()` + the existing `isValidConnection` callback's effect on handle classes. RF v12 sets `.react-flow__handle.valid` or `.invalid` automatically on the target handle currently under the cursor — confirm and style.

- [ ] **Step 1: Check what classes React Flow applies during drag**

```bash
grep -rn "valid\|invalid" node_modules/@xyflow/react/dist/esm/components/Handle/index.js 2>/dev/null | head -10 || \
grep -rn "valid\|invalid" node_modules/@xyflow/system/dist/esm/xyhandle/*.js 2>/dev/null | head -10
```

You should see `valid` / `invalid` strings being added to handle elements. (React Flow's XYHandle adds `.connectingfrom`, `.connectingto`, plus `.valid` / `.invalid` based on `isValidConnection` return.)

If the classes are named differently in this installed version (e.g. `connectionindicator`), adapt the selectors below.

- [ ] **Step 2: Add CSS styles for valid/invalid drop targets**

In `src/app/globals.css`, find the existing canvas handle block (around `.node-preview-wrap .react-flow__handle`). After it, add:

```css
/* During a connect drag, React Flow toggles .valid / .invalid on candidate handles. */
.node-preview-wrap .react-flow__handle.valid::before {
  background: color-mix(in srgb, #22c55e 50%, var(--canvas-node-bg));
  border-color: #22c55e;
  box-shadow: 0 0 0 3px color-mix(in srgb, #22c55e 35%, transparent);
}
.node-preview-wrap .react-flow__handle.invalid::before {
  background: color-mix(in srgb, #ef4444 30%, var(--canvas-node-bg));
  border-color: #ef4444;
  opacity: 0.55;
}
```

- [ ] **Step 3: Manually verify in dev**

```bash
npm run dev
```

Open canvas, drag from a `novelInput` source handle. As cursor hovers over an `imageEdit` target handle, it should light up GREEN (valid after Task 1.3). Hover over a `videoAnalysis` target handle — RED (text→video-input rejected). Hover over a `videoGen` target — GREEN.

If the classes don't appear, inspect the live DOM in DevTools and update selectors to match.

- [ ] **Step 4: TS + lint + test**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

### Task 1.5: Commit Phase 1

- [ ] **Step 1: Stage + commit**

```bash
git add src/features/canvas/domain/nodeRegistry.ts \
        src/features/canvas/domain/connectionValidator.ts \
        src/features/canvas/nodes/ImageEditNode.tsx \
        src/app/globals.css \
        src/i18n/locales/zh.json src/i18n/locales/en.json \
        docs/architecture/canvas-node-connections.md \
        __tests__/unit/canvas/connectionValidator.test.ts
git commit -m "feat(canvas): unlock 3 new connection paths + drag visual feedback

P0 connectivity fixes from the 2026-05-25 node analysis:
- storyboardSplit is now visible in node menu (was hidden, only
  derived from storyboardGen) so users can split arbitrary images
- imageEdit accepts text input (in addition to image); when prompt
  is empty and an upstream novelInput is connected, seed prompt
  from scenes[0].description (one-step novel→single-image)
- videoAnalysis → videoGen is exercised by a new test (already
  worked via image-set widening, now locked down) — closes the
  video → analyze → re-generate loop
- Handle .valid / .invalid classes now style green/red during a
  connect drag so users see which targets accept the connection

3 new validator tests (11 total). Connection matrix doc updated."
```

DO NOT push — leave commit local until Phase 2 also commits.

---

## Phase 2 — P1 Node-type Visual Identity

### Task 2.1: Create reusable `NodeTypeBadge` component

**Files:**
- Create: `src/features/canvas/ui/NodeTypeBadge.tsx`
- Create: `__tests__/unit/canvas/NodeTypeBadge.test.tsx`

- [ ] **Step 1: Write failing test for badge labels**

Create `__tests__/unit/canvas/NodeTypeBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NodeTypeBadge } from '@/features/canvas/ui/NodeTypeBadge';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

describe('NodeTypeBadge', () => {
  it('renders short label for imageEdit', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.imageEdit} />);
    expect(container.textContent).toBe('IMG');
  });
  it('renders short label for videoGen', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.videoGen} />);
    expect(container.textContent).toBe('VID');
  });
  it('renders short label for storyboardGen', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardGen} />);
    expect(container.textContent).toBe('SBG');
  });
  it('renders short label for videoAnalysis', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.videoAnalysis} />);
    expect(container.textContent).toBe('VAN');
  });
  it('renders short label for storyboardSplit', () => {
    const { container } = render(<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardSplit} />);
    expect(container.textContent).toBe('SBS');
  });
});
```

Run: `npx vitest run __tests__/unit/canvas/NodeTypeBadge.test.tsx`
Expected: 5 failures (module not found).

- [ ] **Step 2: Create the component**

Create `src/features/canvas/ui/NodeTypeBadge.tsx`:

```tsx
import { CANVAS_NODE_TYPES, type CanvasNodeType } from '@/features/canvas/domain/canvasNodes';

const LABELS: Partial<Record<CanvasNodeType, string>> = {
  [CANVAS_NODE_TYPES.imageEdit]: 'IMG',
  [CANVAS_NODE_TYPES.videoGen]: 'VID',
  [CANVAS_NODE_TYPES.storyboardGen]: 'SBG',
  [CANVAS_NODE_TYPES.videoAnalysis]: 'VAN',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'SBS',
};

interface NodeTypeBadgeProps {
  type: CanvasNodeType;
}

export function NodeTypeBadge({ type }: NodeTypeBadgeProps) {
  const label = LABELS[type];
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1 py-px text-[9px] font-bold tracking-wider text-[var(--ui-primary-fg)] bg-[var(--ui-primary)]"
      aria-label={`Node type: ${label}`}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Run tests, verify pass**

```bash
npx vitest run __tests__/unit/canvas/NodeTypeBadge.test.tsx
```

Expected: 5 tests pass.

### Task 2.2: Insert `<NodeTypeBadge>` into the 5 split-layout nodes' preview headers

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`
- Modify: `src/features/canvas/nodes/VideoGenNode.tsx`
- Modify: `src/features/canvas/nodes/VideoAnalysisNode.tsx`
- Modify: `src/features/canvas/nodes/StoryboardNode.tsx`

For each of the 5 files, find the `<div className="node-preview-header">` block. It currently has an icon + title span. Insert `<NodeTypeBadge type={...} />` between the icon and the title.

- [ ] **Step 1: ImageEditNode preview-header**

In `src/features/canvas/nodes/ImageEditNode.tsx`, find:

```tsx
<div className="node-preview-header">
  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
  <span className="truncate text-[12px] font-semibold leading-none text-[var(--canvas-node-fg)]">
```

Insert badge between icon and span:

```tsx
<div className="node-preview-header">
  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
  <NodeTypeBadge type={CANVAS_NODE_TYPES.imageEdit} />
  <span className="truncate text-[12px] font-semibold leading-none text-[var(--canvas-node-fg)]">
```

Add import at top: `import { NodeTypeBadge } from '@/features/canvas/ui/NodeTypeBadge';`

- [ ] **Step 2: StoryboardGenNode preview-header**

Same pattern. Search for the `node-preview-header` div, insert `<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardGen} />` between icon and title.

- [ ] **Step 3: VideoGenNode preview-header**

Same — insert `<NodeTypeBadge type={CANVAS_NODE_TYPES.videoGen} />`.

- [ ] **Step 4: VideoAnalysisNode preview-header**

Same — insert `<NodeTypeBadge type={CANVAS_NODE_TYPES.videoAnalysis} />`.

- [ ] **Step 5: StoryboardNode preview-header**

Same — insert `<NodeTypeBadge type={CANVAS_NODE_TYPES.storyboardSplit} />`.

- [ ] **Step 6: TS + lint + test**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: clean, no test regressions.

### Task 2.3: Commit Phase 2

- [ ] **Step 1: Stage + commit**

```bash
git add src/features/canvas/ui/NodeTypeBadge.tsx \
        __tests__/unit/canvas/NodeTypeBadge.test.tsx \
        src/features/canvas/nodes/ImageEditNode.tsx \
        src/features/canvas/nodes/StoryboardGenNode.tsx \
        src/features/canvas/nodes/VideoGenNode.tsx \
        src/features/canvas/nodes/VideoAnalysisNode.tsx \
        src/features/canvas/nodes/StoryboardNode.tsx
git commit -m "feat(canvas): node-type badge in preview header

P1 visual identity fix from the 2026-05-25 node analysis: 5 split-
layout nodes (imageEdit, storyboardGen, videoGen, videoAnalysis,
storyboardSplit) used to share near-identical preview cards (icon +
title + 16:9 area). A 3-letter badge (IMG/VID/SBG/VAN/SBS) in the
preview header lets users distinguish node types at a glance even
when zoomed out.

NodeTypeBadge component is small + isolated + covered by 5 unit tests.
Uses --ui-primary / --ui-primary-fg tokens so it auto-inverts in
dark mode."
```

- [ ] **Step 2: Push Phases 1 + 2**

```bash
git push origin main
```

Expected: 2 commits pushed.

---

## Phase 3 / 4 (out of this plan — TODO)

The following require their own dedicated plans because each is multi-day:

**Phase 3.A — Auto-derive menu candidates from data-type fields** (✅ landed in-line, no separate plan needed)
- Removed `connectMenu.fromSource / fromTarget` from `CanvasNodeConnectivity` and all 9 node definitions.
- Moved `getConnectMenuNodeTypes` to `domain/connectionValidator.ts` and rewrote it to derive candidates from `outputDataType` / `inputDataTypes` via `isValidConnectionByDataType`, taking the dragged-from anchor node type as input.
- Updated `Canvas.tsx#handleConnectEnd` to pass the anchor node's type.
- Tests + docs (known-pitfalls / code-quality / add-node / layering / product-nodes) synchronized.

**Phase 3.B / 3.C / 3.D — Refactor large node files** (need new plan)
- 3.B: Split `StoryboardGenNode.tsx` (1891 lines) into `useStoryboardGenForm` + `StoryboardGenSettings` + `StoryboardGenBatchControls` sub-modules.
- 3.C: Split `VideoGenNode.tsx` (1227 lines) into `useVideoGenForm` + `VideoGenSettings` + `VideoGenFramePicker`.
- 3.D: Split `StoryboardNode.tsx` (1383 lines) similarly.

**Phase 4 — Tool & Layer Extensions** (need new plan)
- Add per-node tool plugins: `extractFirstFrameTool` (videoGen), `batchModelRetargetTool` (storyboardGen).
- Convert `textAnnotation` from a React Flow node to an independent sticky-note layer (no handles, no participation in data flow).

---

## Self-Review Checklist (post-write)

- [x] **Spec coverage:** Tasks 1.1, 1.2, 1.3, 1.4 cover items A/B/C/D from the analysis. Tasks 2.1, 2.2 cover item E. Items F/G/H/I/J explicitly deferred to follow-up plans with a note above.
- [x] **Placeholder scan:** Every code block contains literal code; "find the X block" instructions name the exact file + identifier; no "TBD" / "implement later" / "similar to Task N" patterns.
- [x] **Type consistency:** `NodeTypeBadge` props (`type: CanvasNodeType`) used identically across tests and the 5 node-file insertion sites. `CANVAS_NODE_TYPES.storyboardSplit` used in both Task 1.1 (menu toggle) and Task 2.2.5 (badge type).
- [x] **Backward compat:** Task 1.3 step 4 explicitly never overwrites a user-typed prompt (`if (data.prompt && data.prompt.trim().length > 0) return;`). Task 1.1 only flips a visibility flag — no schema change.
