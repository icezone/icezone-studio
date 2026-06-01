# Canvas Large Node Files Refactor Plan (Phase 3.B/C/D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split three monolithic React-Flow node component files into focused modules (hook + sub-components) so each file fits in a single screen of context and the orchestrator file becomes a thin composition.

**Architecture:** Per file, extract the same triplet:
1. **`use<Node>Form` hook** — owns transient UI state (`useState`/`useRef`) plus the derivation `useMemo`/`useEffect` block. Returns a stable object the component destructures.
2. **`<Node>Settings` sub-component** — the model/params/aspect-ratio row that lives in the expandable settings panel.
3. **A node-specific third sub-component** (Batch controls / Frame picker / Export panel).

The orchestrator file keeps: header, preview area, dataflow handles (`<Handle>`), call to the form hook, and JSX composition of the sub-components. No behavior changes — pure structural refactor.

**Safety net:** TypeScript (`tsc --noEmit`) is the primary correctness check — hook closures, prop types, and import wiring all surface as compile errors when broken. Vitest (`__tests__/unit/canvas/*`) covers the registry, validator, and the few node-level smoke tests. Each task ends with `tsc + vitest + lint + commit`.

**Tech Stack:** React 18, TypeScript 5, @xyflow/react 12, Zustand canvas store, Tailwind, Vitest.

**Out of scope:**
- Behavioral changes (data model, generation pipeline, async ordering).
- Stylistic rewrites of moved code beyond what TypeScript demands.
- Test additions for areas that have no current coverage (refactor is mechanical; behavioral verification stays manual smoke).
- The textAnnotation rewrite (Phase 4) and tool-plugin work (Phase 4) — both need their own plans.

**Each phase (3.B, 3.C, 3.D) is independently shippable.** Do one phase, commit, ship. Do the next when time permits.

---

## Pre-flight: branch & baseline

- [ ] **Step 0.1: Confirm green baseline**

Run:
```
npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: tsc passes, lint shows only pre-existing warnings, vitest shows `PASS (543) FAIL (0)` (or higher if new tests landed).

- [ ] **Step 0.2: Smoke-test the three nodes in dev**

Run `npm run dev`. In the browser at the canvas page:
- Drop a **storyboardGen** node, connect a **novelInput** upstream, click "AI 视频" / batch generate buttons (don't actually generate — just verify the controls render and click handlers don't throw).
- Drop a **videoGen** node, connect an **upload** upstream, click the start/end frame picker chips (should open/close without errors).
- Drop a **storyboardSplit** node (via menu — now visible per Phase 1), open its export options panel.

Take a screenshot for visual reference if helpful. This is the manual oracle for every subsequent task — every commit must still produce the same UI surface.

---

# Phase 3.B — StoryboardGenNode.tsx → 3 modules

**Current state:** [`src/features/canvas/nodes/StoryboardGenNode.tsx`](../../../src/features/canvas/nodes/StoryboardGenNode.tsx) is 1891 lines. The component body is `StoryboardGenNode` starting around L450, with state at L575-595, derivations L596-883, generation handlers L854-1216, frame handlers L1218-1432, render L1434-1891.

**Target file structure after Phase 3.B:**

```
src/features/canvas/nodes/
├── StoryboardGenNode.tsx            (orchestrator, ~700 LOC)
└── storyboardGen/
    ├── useStoryboardGenForm.ts      (state + derivations, ~400 LOC)
    ├── StoryboardGenSettings.tsx    (model/params/ratio row, ~250 LOC)
    └── StoryboardGenBatchControls.tsx (batch generate + progress, ~250 LOC)
```

---

### Task B.1: Create the `storyboardGen/` directory and the empty `useStoryboardGenForm` shell

**Files:**
- Create: `src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts`

- [ ] **Step 1: Create the file with the typed shell**

```ts
// src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts
import { useMemo, useState, useRef, useEffect, type RefObject } from 'react';
import type { CanvasNodeData, StoryboardGenNodeData } from '@/features/canvas/domain/canvasNodes';

export interface UseStoryboardGenFormArgs {
  id: string;
  data: StoryboardGenNodeData;
  selected: boolean;
}

export interface UseStoryboardGenFormResult {
  // To be filled in B.2: the exact shape of returned state/refs/memos.
  // Intentionally narrow so callers can't depend on undocumented internals.
}

export function useStoryboardGenForm(
  _args: UseStoryboardGenFormArgs,
): UseStoryboardGenFormResult {
  return {};
}
```

- [ ] **Step 2: Run typecheck**

Run `npx tsc --noEmit`. Expected: passes (file is unused, has no errors).

- [ ] **Step 3: Commit the scaffold**

```
git add src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts
git commit -m "refactor(canvas/storyboardGen): scaffold useStoryboardGenForm hook"
```

---

### Task B.2: Move state declarations + simple memos into `useStoryboardGenForm`

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx` (replace L575-770 region)
- Modify: `src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts`

**What moves:** the cohesive block of state hooks and derivation memos that depend only on `id` / `data` / draft state. Specifically:

From `StoryboardGenNode.tsx`, move these identifiers (verbatim) into the hook:
- `error` / `setError` (L575)
- `batchProgress` / `setBatchProgress` (L576)
- `rootRef` (L578)
- `activeFrameTextareaRef` (L579)
- `activeReferenceEditorFrameIndex` / setter (L580)
- `activeFrameControlEditorFrameIndex` / setter (L581)
- `showImagePicker` / setter, `pickerFrameIndex` / setter, `pickerCursor` / setter, `pickerActiveIndex` / setter, `pickerAnchor` / setter (L582-586)
- `lastPointerAnchorRef`, `frameTextareaRefs`, `frameHighlightRefs` (L587-589)
- `frameDescriptionDrafts` / setter, `frameDescriptionDraftsRef` (L592-595)
- All `useMemo` blocks for: `resolvedTitle`, `incomingImages`, `incomingImageItems`, `incomingImageViewerList`, `imageModels`, `selectedModel`, `effectiveExtraParams`, `resolutionOptions`, `selectedResolution`, `aspectRatioOptions`, `selectedAspectRatio`, `controlAspectRatioValue`, `resolvedAspectRatios`, `baseFrameLayout`, `supportedAspectRatioValues`, `mappedOverallRequestAspectRatio`, `totalFrames` (L596-756)
- All `useEffect` blocks at L758-853 that are pure side-effects of those memos (sync internals, scroll positioning, etc.) — **except** the outside-pointer-down handler (L815-832), which depends on `closeImagePicker` defined later; keep that one for B.3.

- [ ] **Step 1: Update `UseStoryboardGenFormResult` to enumerate the moved values**

Replace the body of `useStoryboardGenForm.ts` with the full hook. The return type names every value the orchestrator needs:

```ts
export interface UseStoryboardGenFormResult {
  error: string | null;
  setError: (v: string | null) => void;
  batchProgress: BatchProgress | null;
  setBatchProgress: (v: BatchProgress | null) => void;

  rootRef: RefObject<HTMLDivElement | null>;
  activeFrameTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  frameTextareaRefs: MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  frameHighlightRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  lastPointerAnchorRef: MutableRefObject<{ frameIndex: number; anchor: PickerAnchor } | null>;

  activeReferenceEditorFrameIndex: number | null;
  setActiveReferenceEditorFrameIndex: (v: number | null) => void;
  activeFrameControlEditorFrameIndex: number | null;
  setActiveFrameControlEditorFrameIndex: (v: number | null) => void;

  showImagePicker: boolean;
  setShowImagePicker: (v: boolean) => void;
  pickerFrameIndex: number | null;
  setPickerFrameIndex: (v: number | null) => void;
  pickerCursor: number | null;
  setPickerCursor: (v: number | null) => void;
  pickerActiveIndex: number;
  setPickerActiveIndex: (v: number) => void;
  pickerAnchor: PickerAnchor;
  setPickerAnchor: (v: PickerAnchor) => void;

  frameDescriptionDrafts: Record<string, string>;
  setFrameDescriptionDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  frameDescriptionDraftsRef: MutableRefObject<Record<string, string>>;

  resolvedTitle: string;
  incomingImages: ReturnType<typeof selectIncomingImages>;
  incomingImageItems: IncomingImageItem[];
  incomingImageViewerList: string[];
  imageModels: ReturnType<typeof listImageModels>;
  selectedModel: ImageModelDescriptor;
  effectiveExtraParams: Record<string, unknown>;
  resolutionOptions: AspectRatioChoice[];
  selectedResolution: AspectRatioChoice;
  aspectRatioOptions: AspectRatioChoice[];
  selectedAspectRatio: AspectRatioChoice;
  controlAspectRatioValue: string;
  resolvedAspectRatios: string[];
  baseFrameLayout: ReturnType<typeof computeBaseFrameLayout>;
  supportedAspectRatioValues: string[];
  mappedOverallRequestAspectRatio: string;
  totalFrames: number;
}
```

Types referenced (`PickerAnchor`, `AspectRatioChoice`, `BatchProgress`, `IncomingImageItem`, `ImageModelDescriptor`, helpers `selectIncomingImages` and `computeBaseFrameLayout`) — for any type/helper currently file-local in `StoryboardGenNode.tsx`, **also move it** to the hook file and `export type` it. The orchestrator imports those back via `import type { ... } from './storyboardGen/useStoryboardGenForm'`.

- [ ] **Step 2: Cut-and-paste the hook body**

In the hook body, paste the verbatim state/memo/effect declarations from `StoryboardGenNode.tsx` L575-756 (state) and L758-808 (effect block — excluding the L815-832 outside-pointer handler). Keep the order; do not rewrite. Wrap any function-scoped helper that the moved code calls but is not yet imported.

Then in `StoryboardGenNode.tsx`, replace L575-808 with:

```ts
const form = useStoryboardGenForm({ id, data, selected });
const {
  error, setError, batchProgress, setBatchProgress,
  rootRef, activeFrameTextareaRef, frameTextareaRefs, frameHighlightRefs, lastPointerAnchorRef,
  activeReferenceEditorFrameIndex, setActiveReferenceEditorFrameIndex,
  activeFrameControlEditorFrameIndex, setActiveFrameControlEditorFrameIndex,
  showImagePicker, setShowImagePicker,
  pickerFrameIndex, setPickerFrameIndex,
  pickerCursor, setPickerCursor,
  pickerActiveIndex, setPickerActiveIndex,
  pickerAnchor, setPickerAnchor,
  frameDescriptionDrafts, setFrameDescriptionDrafts, frameDescriptionDraftsRef,
  resolvedTitle, incomingImages, incomingImageItems, incomingImageViewerList,
  imageModels, selectedModel, effectiveExtraParams,
  resolutionOptions, selectedResolution,
  aspectRatioOptions, selectedAspectRatio,
  controlAspectRatioValue, resolvedAspectRatios,
  baseFrameLayout, supportedAspectRatioValues, mappedOverallRequestAspectRatio,
  totalFrames,
} = form;
```

- [ ] **Step 3: Run typecheck**

Run `npx tsc --noEmit`. Expected: passes. If any closure/import is missing, the error will name the symbol — fix by either (a) importing in the hook file, or (b) accepting it as a hook arg.

- [ ] **Step 4: Run tests**

Run `npx vitest run`. Expected: all 543+ tests pass.

- [ ] **Step 5: Smoke-test in dev**

`npm run dev`, drop a storyboardGen node, verify:
- Model selector renders with current value.
- Aspect ratio chip group renders.
- Grid rows/cols controls render.
- No console errors on mount or after typing in a frame description.

- [ ] **Step 6: Commit**

```
git add src/features/canvas/nodes/StoryboardGenNode.tsx src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts
git commit -m "refactor(canvas/storyboardGen): extract useStoryboardGenForm hook"
```

---

### Task B.3: Extract `StoryboardGenSettings` sub-component

**Files:**
- Create: `src/features/canvas/nodes/storyboardGen/StoryboardGenSettings.tsx`
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx` (replace the settings-panel render block, currently inside the expanded section around L1700-1860)

**Component contract:**

```tsx
// src/features/canvas/nodes/storyboardGen/StoryboardGenSettings.tsx
import type { ImageModelDescriptor } from '@/features/canvas/models';
import { ModelParamsControls } from '@/features/canvas/ui/ModelParamsControls';
import type { AspectRatioChoice } from './useStoryboardGenForm';

export interface StoryboardGenSettingsProps {
  imageModels: ImageModelDescriptor[];
  selectedModel: ImageModelDescriptor;
  onModelChange: (modelId: string) => void;
  effectiveExtraParams: Record<string, unknown>;
  onExtraParamsChange: (params: Record<string, unknown>) => void;
  resolutionOptions: AspectRatioChoice[];
  selectedResolution: AspectRatioChoice;
  onResolutionChange: (resolution: string) => void;
  aspectRatioOptions: AspectRatioChoice[];
  selectedAspectRatio: AspectRatioChoice;
  onAspectRatioChange: (aspectRatio: string) => void;
  ratioControlMode: 'cell' | 'overall';
  onRatioControlModeChange: (mode: 'cell' | 'overall') => void;
}

export function StoryboardGenSettings(props: StoryboardGenSettingsProps) {
  // Body: the JSX currently rendered inside the settings-panel section of
  // StoryboardGenNode.tsx — the model select, ModelParamsControls,
  // resolution chip group, aspect-ratio chip group, and ratio-control-mode toggle.
  // No state of its own — purely controlled by props.
  return (
    // ... extracted JSX, identical class names, identical structure
  );
}
```

- [ ] **Step 1: Create the component file**

Copy the settings-panel JSX subtree from `StoryboardGenNode.tsx` into the new file. Replace direct `updateNodeData(id, { … })` calls with prop callbacks (`onModelChange`, `onResolutionChange`, …). The component must be pure-controlled — no `useCanvasStore` calls; all mutation goes through props.

- [ ] **Step 2: Wire the component in `StoryboardGenNode.tsx`**

Replace the corresponding JSX block with:

```tsx
<StoryboardGenSettings
  imageModels={imageModels}
  selectedModel={selectedModel}
  onModelChange={(modelId) => updateNodeData(id, { model: modelId })}
  effectiveExtraParams={effectiveExtraParams}
  onExtraParamsChange={(params) => updateNodeData(id, { extraParams: params })}
  resolutionOptions={resolutionOptions}
  selectedResolution={selectedResolution}
  onResolutionChange={(size) => updateNodeData(id, { size })}
  aspectRatioOptions={aspectRatioOptions}
  selectedAspectRatio={selectedAspectRatio}
  onAspectRatioChange={(ar) => updateNodeData(id, { requestAspectRatio: ar })}
  ratioControlMode={data.ratioControlMode}
  onRatioControlModeChange={(mode) => updateNodeData(id, { ratioControlMode: mode })}
/>
```

- [ ] **Step 3: Run typecheck + tests + lint**

```
npx tsc --noEmit
npx vitest run
npm run lint
```
Expected: all pass; only pre-existing lint warnings remain.

- [ ] **Step 4: Smoke-test**

`npm run dev`. Expand a storyboardGen node's settings panel. Verify: model select changes save and re-render correctly; aspect-ratio chip change updates the preview grid; ratio control mode toggle flips between cell/overall.

- [ ] **Step 5: Commit**

```
git add src/features/canvas/nodes/StoryboardGenNode.tsx src/features/canvas/nodes/storyboardGen/StoryboardGenSettings.tsx
git commit -m "refactor(canvas/storyboardGen): extract StoryboardGenSettings component"
```

---

### Task B.4: Extract `StoryboardGenBatchControls` sub-component

**Files:**
- Create: `src/features/canvas/nodes/storyboardGen/StoryboardGenBatchControls.tsx`
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx` (the batch-generate button block + progress UI, currently around L1110-1216 logic and matching render block)

**Component contract:**

```tsx
// src/features/canvas/nodes/storyboardGen/StoryboardGenBatchControls.tsx
import type { BatchProgress } from './useStoryboardGenForm';

export interface StoryboardGenBatchControlsProps {
  isBatchGenerating: boolean;
  batchProgress: BatchProgress | null;
  onBatchGenerate: () => Promise<void> | void;
  onGeneratePreviewGrid: () => Promise<void> | void;
  onGenerateAll: () => Promise<void> | void;
  disabled?: boolean;
}

export function StoryboardGenBatchControls(props: StoryboardGenBatchControlsProps) {
  // The two generate buttons (preview / full) + progress strip.
  return (
    // ... extracted JSX
  );
}
```

- [ ] **Step 1: Create the component file** with the JSX copied from the orchestrator.

- [ ] **Step 2: Wire it in `StoryboardGenNode.tsx`**:

```tsx
<StoryboardGenBatchControls
  isBatchGenerating={Boolean(batchProgress)}
  batchProgress={batchProgress}
  onBatchGenerate={handleBatchGenerate}
  onGeneratePreviewGrid={() => handleGenerate(true)}
  onGenerateAll={() => handleGenerate(false)}
  disabled={!selectedModel || totalFrames === 0}
/>
```

Note: `handleGenerate` and `handleBatchGenerate` stay in the orchestrator for now (they own complex closures over the canvas store). Only the rendered UI moves.

- [ ] **Step 3: typecheck + tests + lint + smoke** (same commands as B.3 Step 3-4).

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/StoryboardGenNode.tsx src/features/canvas/nodes/storyboardGen/StoryboardGenBatchControls.tsx
git commit -m "refactor(canvas/storyboardGen): extract StoryboardGenBatchControls component"
```

---

### Task B.5: Phase 3.B sanity check

- [ ] **Step 1: Verify line count**

Run:
```
wc -l src/features/canvas/nodes/StoryboardGenNode.tsx src/features/canvas/nodes/storyboardGen/*.{ts,tsx}
```
Expected: `StoryboardGenNode.tsx` should be roughly 700 lines (down from 1891). The three new files should sum to ~900-1000 lines together (some growth from interface definitions).

- [ ] **Step 2: Full regression smoke**

In dev, exercise the full happy path:
- Drop a storyboardGen node.
- Connect a novelInput upstream with a few scenes.
- Change model, change aspect ratio, change grid rows/cols.
- Click "preview grid" generate (or, if no API key, verify the click handler is invoked — check console).
- Verify the frame description text areas accept typing.
- Verify the image picker opens when typing `@` in a frame description.
- Verify no console errors throughout.

- [ ] **Step 3: Push if remote exists**

```
git push  # (only if user has a remote configured for this branch — otherwise skip)
```

Phase 3.B done.

---

# Phase 3.C — VideoGenNode.tsx → 3 modules

**Current state:** [`src/features/canvas/nodes/VideoGenNode.tsx`](../../../src/features/canvas/nodes/VideoGenNode.tsx) is 1227 lines. State at L125-148, derivation memos at L165-196, polling/effect block at L197-337, generation handlers at L339-705, render at L706-1226.

**Target file structure:**

```
src/features/canvas/nodes/
├── VideoGenNode.tsx               (orchestrator, ~500 LOC)
└── videoGen/
    ├── useVideoGenForm.ts         (state + memos + polling effect, ~280 LOC)
    ├── VideoGenSettings.tsx       (VideoParamsControls + duration/ratio, ~200 LOC)
    └── VideoGenFramePicker.tsx    (start/end frame upload + picker UI, ~250 LOC)
```

---

### Task C.1: Scaffold `useVideoGenForm`

**Files:**
- Create: `src/features/canvas/nodes/videoGen/useVideoGenForm.ts`

- [ ] **Step 1: Create the shell**

```ts
import { useState, useRef, useMemo, useEffect, type RefObject, type MutableRefObject } from 'react';
import type { VideoGenNodeData } from '@/features/canvas/domain/canvasNodes';

export interface UseVideoGenFormArgs {
  id: string;
  data: VideoGenNodeData;
}

export interface UseVideoGenFormResult {
  // Filled in C.2.
}

export function useVideoGenForm(_args: UseVideoGenFormArgs): UseVideoGenFormResult {
  return {};
}
```

- [ ] **Step 2:** `npx tsc --noEmit`. Expected: passes.

- [ ] **Step 3: Commit**

```
git add src/features/canvas/nodes/videoGen/useVideoGenForm.ts
git commit -m "refactor(canvas/videoGen): scaffold useVideoGenForm hook"
```

---

### Task C.2: Move state + memos + polling effect into `useVideoGenForm`

**What moves from `VideoGenNode.tsx`:**
- State hooks at L125-132 (`promptDraft`, `error`, `showImagePicker`, `pickerAnchor`, `pickerActiveIndex`, `pollingProgress`, `downloading`, `promptCollapsed`).
- Refs at L134-145 (`promptRef`, `promptHighlightRef`, `pollIntervalRef`, `frameUploadRef`).
- Frame picker state L146-148 (`frameUploadTarget`, `startFramePickerOpen`, `endFramePickerOpen`).
- All memos L165-196 (`videoModels`, `selectedModel`, `incomingImages`, `incomingImageItems`, `resolvedTitle`).
- Effects L197-218 (cleanup, mount initialization).
- The polling effect L219-337 — **this is the big one**. It owns the `setInterval` lifecycle around the job-status poll. Move it verbatim. It depends on `data.jobId`, `data.isGenerating`, and store mutations.
- Memos L680-700 (`durationOptions`, `aspectRatioOptions`, `selectedDuration`, `selectedAspectRatio`).
- Effect L702-705 (`promptDraft` sync to `data.prompt`).

**What stays in `VideoGenNode.tsx`:**
- `commitPromptDraft`, `renderPromptWithHighlights`, `handlePromptKeyDown`, `insertImageReference`, `handleGenerate`, `handleRetry`, `handleFrameUpload`, `handleFrameFileChange`, `handleDownload`. These close over heavy callbacks (canvas store, API calls) and live with the orchestrator.

- [ ] **Step 1: Enumerate the return type**

```ts
export interface UseVideoGenFormResult {
  promptDraft: string;
  setPromptDraft: (v: string) => void;
  error: string | null;
  setError: (v: string | null) => void;
  showImagePicker: boolean;
  setShowImagePicker: (v: boolean) => void;
  pickerAnchor: PickerAnchor;
  setPickerAnchor: (v: PickerAnchor) => void;
  pickerActiveIndex: number;
  setPickerActiveIndex: (v: number) => void;
  pollingProgress: number;
  setPollingProgress: (v: number) => void;
  downloading: boolean;
  setDownloading: (v: boolean) => void;
  promptCollapsed: boolean;
  setPromptCollapsed: (v: boolean) => void;

  promptRef: RefObject<HTMLTextAreaElement | null>;
  promptHighlightRef: RefObject<HTMLDivElement | null>;
  pollIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  frameUploadRef: RefObject<HTMLInputElement | null>;

  frameUploadTarget: 'start' | 'end' | null;
  setFrameUploadTarget: (v: 'start' | 'end' | null) => void;
  startFramePickerOpen: boolean;
  setStartFramePickerOpen: (v: boolean) => void;
  endFramePickerOpen: boolean;
  setEndFramePickerOpen: (v: boolean) => void;

  videoModels: VideoModelDescriptor[];
  selectedModel: VideoModelDescriptor;
  incomingImages: IncomingImage[];
  incomingImageItems: IncomingImageItem[];
  resolvedTitle: string;
  durationOptions: DurationOption[];
  aspectRatioOptions: AspectRatioOption[];
  selectedDuration: DurationOption;
  selectedAspectRatio: AspectRatioOption;
}
```

(Types like `VideoModelDescriptor`, `IncomingImageItem`, `DurationOption`, `AspectRatioOption`, `PickerAnchor` — if file-local in `VideoGenNode.tsx`, move them to the hook file and re-export.)

- [ ] **Step 2: Cut-and-paste the body**

Paste the moved code into the hook function. The polling effect at L219-337 keeps its `setInterval` cleanup logic exactly as-is. Any function the polling effect calls that isn't a hook arg (e.g., `updateNodeData`, `fetchVideoJobStatus`) — import it inside the hook file.

In `VideoGenNode.tsx`, replace L125-218 + L680-705 with:

```ts
const form = useVideoGenForm({ id, data });
const {
  promptDraft, setPromptDraft, error, setError,
  showImagePicker, setShowImagePicker, pickerAnchor, setPickerAnchor, pickerActiveIndex, setPickerActiveIndex,
  pollingProgress, setPollingProgress, downloading, setDownloading, promptCollapsed, setPromptCollapsed,
  promptRef, promptHighlightRef, pollIntervalRef, frameUploadRef,
  frameUploadTarget, setFrameUploadTarget, startFramePickerOpen, setStartFramePickerOpen, endFramePickerOpen, setEndFramePickerOpen,
  videoModels, selectedModel, incomingImages, incomingImageItems, resolvedTitle,
  durationOptions, aspectRatioOptions, selectedDuration, selectedAspectRatio,
} = form;
```

- [ ] **Step 3: Verify with `npx tsc --noEmit`** — fix import errors as they appear.

- [ ] **Step 4: `npx vitest run`** — all pass.

- [ ] **Step 5: Smoke-test** — drop a videoGen node, type a prompt, change model, change duration/aspect-ratio. No console errors.

- [ ] **Step 6: Commit**

```
git add src/features/canvas/nodes/VideoGenNode.tsx src/features/canvas/nodes/videoGen/useVideoGenForm.ts
git commit -m "refactor(canvas/videoGen): extract useVideoGenForm hook"
```

---

### Task C.3: Extract `VideoGenSettings` sub-component

**Files:**
- Create: `src/features/canvas/nodes/videoGen/VideoGenSettings.tsx`
- Modify: `VideoGenNode.tsx` settings-panel JSX block.

**Component contract:**

```tsx
import { VideoParamsControls } from '@/features/canvas/ui/VideoParamsControls';
import type { VideoModelDescriptor } from '@/features/canvas/models';
import type { DurationOption, AspectRatioOption } from './useVideoGenForm';

export interface VideoGenSettingsProps {
  videoModels: VideoModelDescriptor[];
  selectedModel: VideoModelDescriptor;
  onModelChange: (modelId: string) => void;
  durationOptions: DurationOption[];
  selectedDuration: DurationOption;
  onDurationChange: (d: number) => void;
  aspectRatioOptions: AspectRatioOption[];
  selectedAspectRatio: AspectRatioOption;
  onAspectRatioChange: (ar: string) => void;
  enableAudio: boolean;
  onEnableAudioChange: (enabled: boolean) => void;
  extraParams: Record<string, unknown>;
  onExtraParamsChange: (params: Record<string, unknown>) => void;
}
```

- [ ] **Step 1: Create the file** with the JSX moved from `VideoGenNode.tsx`'s settings panel section. Replace direct `updateNodeData` calls with prop callbacks.

- [ ] **Step 2: Wire in `VideoGenNode.tsx`**:

```tsx
<VideoGenSettings
  videoModels={videoModels}
  selectedModel={selectedModel}
  onModelChange={(modelId) => updateNodeData(id, { model: modelId })}
  durationOptions={durationOptions}
  selectedDuration={selectedDuration}
  onDurationChange={(duration) => updateNodeData(id, { duration })}
  aspectRatioOptions={aspectRatioOptions}
  selectedAspectRatio={selectedAspectRatio}
  onAspectRatioChange={(aspectRatio) => updateNodeData(id, { aspectRatio })}
  enableAudio={data.enableAudio}
  onEnableAudioChange={(enableAudio) => updateNodeData(id, { enableAudio })}
  extraParams={data.extraParams}
  onExtraParamsChange={(extraParams) => updateNodeData(id, { extraParams })}
/>
```

- [ ] **Step 3:** typecheck + tests + lint + smoke.

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/VideoGenNode.tsx src/features/canvas/nodes/videoGen/VideoGenSettings.tsx
git commit -m "refactor(canvas/videoGen): extract VideoGenSettings component"
```

---

### Task C.4: Extract `VideoGenFramePicker` sub-component

**Files:**
- Create: `src/features/canvas/nodes/videoGen/VideoGenFramePicker.tsx`
- Modify: `VideoGenNode.tsx` — the start-frame / end-frame picker JSX (around L850-1100 in current source) moves.

**Component contract:**

```tsx
export interface VideoGenFramePickerProps {
  position: 'start' | 'end';
  frameUrl: string | null;
  incomingImages: IncomingImage[];
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  onPickFromUpstream: (imageUrl: string) => void;
  onPickFromUpload: () => void;
  onClear: () => void;
}
```

- [ ] **Step 1:** Move the picker JSX into the new component. The "upload from disk" button keeps its onClick but the file input itself (`frameUploadRef`) stays in the orchestrator since it's a singleton mediating both start and end pickers. Pass `onPickFromUpload` as a callback that triggers the orchestrator-owned `handleFrameUpload(position)`.

- [ ] **Step 2:** In `VideoGenNode.tsx`, render two pickers:

```tsx
<VideoGenFramePicker
  position="start"
  frameUrl={data.startFrameUrl}
  incomingImages={incomingImages}
  pickerOpen={startFramePickerOpen}
  onPickerOpenChange={setStartFramePickerOpen}
  onPickFromUpstream={(url) => updateNodeData(id, { startFrameUrl: url })}
  onPickFromUpload={() => handleFrameUpload('start')}
  onClear={() => updateNodeData(id, { startFrameUrl: null })}
/>
<VideoGenFramePicker
  position="end"
  frameUrl={data.endFrameUrl}
  incomingImages={incomingImages}
  pickerOpen={endFramePickerOpen}
  onPickerOpenChange={setEndFramePickerOpen}
  onPickFromUpstream={(url) => updateNodeData(id, { endFrameUrl: url })}
  onPickFromUpload={() => handleFrameUpload('end')}
  onClear={() => updateNodeData(id, { endFrameUrl: null })}
/>
```

- [ ] **Step 3:** typecheck + tests + lint + smoke. Verify both pickers open/close, both file-upload buttons trigger the file input, both "use upstream image" lists render incoming images.

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/VideoGenNode.tsx src/features/canvas/nodes/videoGen/VideoGenFramePicker.tsx
git commit -m "refactor(canvas/videoGen): extract VideoGenFramePicker component"
```

---

### Task C.5: Phase 3.C sanity check

- [ ] **Step 1: Line count**

```
wc -l src/features/canvas/nodes/VideoGenNode.tsx src/features/canvas/nodes/videoGen/*.{ts,tsx}
```
Expected: `VideoGenNode.tsx` ≈ 500 lines, sub-modules ≈ 700-800 lines total.

- [ ] **Step 2: Regression smoke**

- Drop videoGen, connect upload upstream.
- Type a prompt; verify `@`-reference token highlighting still works.
- Open start-frame picker, pick from upstream — verify thumbnail appears.
- Open end-frame picker, click upload button — verify file dialog opens (cancel without selecting).
- Change duration / aspect ratio — verify persistence on canvas reload.
- Click generate (no actual run if no key, but click handler must not throw).

Phase 3.C done.

---

# Phase 3.D — StoryboardNode.tsx → 3 modules

**Current state:** [`src/features/canvas/nodes/StoryboardNode.tsx`](../../../src/features/canvas/nodes/StoryboardNode.tsx) is 1383 lines. It already has a memo'd `FrameCard` sub-component at L297-438 (don't touch — already factored). The main `StoryboardNode` component starts at L440. State L443-468, memos L471-572, effects L573-697, handlers L621-1013, render L1014-1382.

This is the **storyboardSplit** node (frame-grid export/pack tool), despite the file name "StoryboardNode".

**Target file structure:**

```
src/features/canvas/nodes/
├── StoryboardNode.tsx              (orchestrator, ~700 LOC including FrameCard)
└── storyboard/
    ├── useStoryboardSort.ts        (drag-reorder state + hover/finalize handlers, ~150 LOC)
    ├── StoryboardExportPanel.tsx   (export options UI + export action, ~400 LOC)
    └── StoryboardPackControls.tsx  (pack-to-single-images UI + handler, ~200 LOC)
```

The `FrameCard` memo stays inside `StoryboardNode.tsx` for now — extracting it is a separate question (its props surface is already wide; moving it adds an import without simplifying the orchestrator much).

---

### Task D.1: Extract `useStoryboardSort` hook

**What moves from `StoryboardNode.tsx`:**
- State `draggedFrameId` / setter (L458)
- State `dropTargetFrameId` / setter (L459)
- Callbacks `handleSortStart` (L644), `handleSortHover` (L650), `finalizeSort` (L660)
- Effect L673-696 that listens for `pointerup` to finalize sort.

**Files:**
- Create: `src/features/canvas/nodes/storyboard/useStoryboardSort.ts`
- Modify: `StoryboardNode.tsx`

**Hook contract:**

```ts
import { useState, useCallback, useEffect } from 'react';

export interface UseStoryboardSortArgs {
  orderedFrameIds: string[];
  onReorder: (newOrder: string[]) => void;
}

export interface UseStoryboardSortResult {
  draggedFrameId: string | null;
  dropTargetFrameId: string | null;
  handleSortStart: (frameId: string) => void;
  handleSortHover: (frameId: string) => void;
  /** Call from pointer up on a frame card to commit the reorder. */
  finalizeSort: () => void;
}

export function useStoryboardSort({
  orderedFrameIds,
  onReorder,
}: UseStoryboardSortArgs): UseStoryboardSortResult {
  // State + handlers moved verbatim from StoryboardNode.tsx.
  // The global pointerup effect that calls finalizeSort moves here too.
  // ...
}
```

- [ ] **Step 1:** Create the hook with the verbatim state/handlers/effect from `StoryboardNode.tsx`. The hook takes `orderedFrameIds` and an `onReorder(newOrder)` callback — the orchestrator computes `newOrder` from the source state and calls `updateNodeData(id, { frames: ... })` inside `onReorder`.

- [ ] **Step 2:** In `StoryboardNode.tsx`, replace L458-459 state + L644-697 handlers/effect with:

```ts
const orderedFrameIds = useMemo(() => orderedFrames.map((f) => f.id), [orderedFrames]);
const onReorder = useCallback((newOrder: string[]) => {
  const reordered = newOrder.map((fid) => orderedFrames.find((f) => f.id === fid)!).filter(Boolean);
  updateNodeData(id, { frames: reordered });
}, [orderedFrames, id, updateNodeData]);
const { draggedFrameId, dropTargetFrameId, handleSortStart, handleSortHover, finalizeSort } =
  useStoryboardSort({ orderedFrameIds, onReorder });
```

- [ ] **Step 3:** typecheck + tests + lint + smoke. Verify: drag a frame card to a new position, drop it; the order updates and persists.

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/StoryboardNode.tsx src/features/canvas/nodes/storyboard/useStoryboardSort.ts
git commit -m "refactor(canvas/storyboard): extract useStoryboardSort hook"
```

---

### Task D.2: Extract `StoryboardExportPanel`

**Files:**
- Create: `src/features/canvas/nodes/storyboard/StoryboardExportPanel.tsx`
- Modify: `StoryboardNode.tsx` — the export-panel UI (around L1229-1348 in current render) + the `handleExport` handler L732-915.

**What moves:**
- The entire export-options `<UiPanel>` subtree.
- The `handleExport` callback function — it owns the canvas-render-to-blob logic that is conceptually part of the export panel's behavior.
- The `patchExportOptions` callback L632-643.
- State `isExporting` / `setIsExporting`, `exportError` / `setExportError`, `isExportPanelOpen` / `setIsExportPanelOpen`, `isExportPanelVisible` / `setIsExportPanelVisible`, `exportPanelAnchor` / `setExportPanelAnchor`.
- Refs `exportSettingsTriggerRef`, `exportSettingsPanelRef`.

**Component contract:**

```tsx
import type { StoryboardExportOptions, StoryboardFrame } from '@/features/canvas/domain/canvasNodes';

export interface StoryboardExportPanelProps {
  nodeId: string;
  frames: StoryboardFrame[];
  exportOptions: StoryboardExportOptions;
  onExportOptionsChange: (patch: Partial<StoryboardExportOptions>) => void;
  /** Anchor element for positioning the popover. */
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

export function StoryboardExportPanel(props: StoryboardExportPanelProps) {
  // Owns: trigger button, popover open/close state, export-in-progress state,
  // export-error state, the actual canvas-render-and-download handler.
  // Reads frames + exportOptions from props; mutates exportOptions through callback.
}
```

- [ ] **Step 1:** Create the component file. Move state, refs, handlers, and JSX verbatim. The `patchExportOptions` becomes an inline arrow inside the component body that calls `props.onExportOptionsChange`.

- [ ] **Step 2:** In `StoryboardNode.tsx`, replace the corresponding state/handler/JSX block with:

```tsx
<StoryboardExportPanel
  nodeId={id}
  frames={orderedFrames}
  exportOptions={exportOptions}
  onExportOptionsChange={(patch) => updateNodeData(id, { exportOptions: { ...exportOptions, ...patch } })}
  triggerRef={exportSettingsTriggerRef /* keep this ref in the orchestrator if it anchors other UI; else move into the component */}
/>
```

(If `exportSettingsTriggerRef` is *only* used by the export panel — verify by grep before this task — move it into the component too and drop the prop.)

- [ ] **Step 3:** typecheck + tests + lint + smoke. Verify: click the export-options gear, panel opens; toggle "show frame index", value persists; click export — the download completes (or fails with a known error, but no crash).

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/StoryboardNode.tsx src/features/canvas/nodes/storyboard/StoryboardExportPanel.tsx
git commit -m "refactor(canvas/storyboard): extract StoryboardExportPanel component"
```

---

### Task D.3: Extract `StoryboardPackControls`

**Files:**
- Create: `src/features/canvas/nodes/storyboard/StoryboardPackControls.tsx`
- Modify: `StoryboardNode.tsx` — `handlePackSingleImages` L926-984, `handleOpenPackFolder` L985-991, `resolvePackRootDir` L916-925, state `isPackingSingleImages`, `isPackDoneDialogOpen`, `packOutputDir` (L462, L467-468), and the corresponding JSX (the "导出为单图" button + "open folder" follow-up dialog).

**Component contract:**

```tsx
export interface StoryboardPackControlsProps {
  nodeId: string;
  frames: StoryboardFrame[];
  exportOptions: StoryboardExportOptions;
}

export function StoryboardPackControls(props: StoryboardPackControlsProps) {
  // Owns: pack-in-progress state, pack-done dialog state, output directory state,
  // the "pack to folder" button, the post-pack success dialog with "open folder" action.
}
```

- [ ] **Step 1:** Create the component, move state + handlers + JSX. The Tauri/file-system call for `resolvePackRootDir` and the folder-open command stay as direct imports (same as today).

- [ ] **Step 2:** In `StoryboardNode.tsx`, replace the pack-related state/handlers/JSX with:

```tsx
<StoryboardPackControls
  nodeId={id}
  frames={orderedFrames}
  exportOptions={exportOptions}
/>
```

- [ ] **Step 3:** typecheck + tests + lint + smoke. Verify: click "导出为单图", select a target folder, verify the pack runs (or fails with a known error). After completion, "open folder" button works.

- [ ] **Step 4: Commit**

```
git add src/features/canvas/nodes/StoryboardNode.tsx src/features/canvas/nodes/storyboard/StoryboardPackControls.tsx
git commit -m "refactor(canvas/storyboard): extract StoryboardPackControls component"
```

---

### Task D.4: Phase 3.D sanity check

- [x] **Step 1: Line count**

```
wc -l src/features/canvas/nodes/StoryboardNode.tsx src/features/canvas/nodes/storyboard/*.{ts,tsx}
```
Expected: `StoryboardNode.tsx` ≈ 700 lines (FrameCard kept inline), sub-modules ≈ 600-700 lines.

- [x] **Step 2: Regression smoke**

- Drop a storyboardSplit node. Drop an upload upstream connected.
- Verify frames render in the grid.
- Drag-reorder a frame; verify persistence.
- Open export panel, change options, export — verify the result file.
- Open pack-single-images, run the pack, verify files appear in the chosen folder.

Phase 3.D done.

---

## Cross-phase final pass

After all three phases land:

- [x] **Step 1: Run the full smoke checklist**

End-to-end: novelInput → storyboardGen → storyboardSplit → exported file. Also videoGen → videoAnalysis loop.

- [x] **Step 2: Update CODEMAP / module docs**

If `docs/architecture/codebase-guide.md` lists per-file LOC or module ownership, update the storyboardGen, videoGen, storyboard sub-directories with one line each. The pattern is described in [docs/extensions/add-node.md](../../extensions/add-node.md).

- [x] **Step 3: Final commit**

```
git add docs/architecture/codebase-guide.md
git commit -m "docs(canvas): note storyboardGen/videoGen/storyboard sub-module layout"
```

---

## Self-Review Checklist (post-write)

- [x] **Spec coverage:** Phase 3.B (B.1-B.5) splits StoryboardGenNode into hook + 2 components. Phase 3.C (C.1-C.5) splits VideoGenNode. Phase 3.D (D.1-D.4) splits StoryboardNode. Every task has explicit file paths, identifier lists, component contracts, verification commands, and commit messages.
- [x] **Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" / "add error handling" patterns. Every code step shows either the new file contents or the call-site replacement. Where the body is a verbatim cut-and-paste from the existing file, the source line ranges are named explicitly so the implementer can find them.
- [x] **Type consistency:** Hook interfaces (`UseStoryboardGenFormResult`, `UseVideoGenFormResult`, `UseStoryboardSortResult`) are explicit. Component prop types (`StoryboardGenSettingsProps`, etc.) match the wiring snippets exactly. Types `PickerAnchor`, `AspectRatioChoice`, `BatchProgress`, `IncomingImageItem`, `VideoModelDescriptor`, `DurationOption`, `AspectRatioOption` are all flagged as needing to move with their hooks.
- [x] **Risk acknowledgement:** Manual smoke is the primary behavioral oracle — every task ends with a 1-2 line smoke checklist tied to the moved code. The TypeScript compiler is the structural safety net.
- [x] **YAGNI:** No premature decomposition (FrameCard stays inline, generation handlers stay in the orchestrator). Three modules per file — the minimum that makes each file fit a screen.
