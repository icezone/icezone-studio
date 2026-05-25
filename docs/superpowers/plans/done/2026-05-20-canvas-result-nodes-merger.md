# Canvas Result Nodes Merger & Semantic Connection Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the duplicated "result-holder" nodes (`exportImage`, `videoResult`) into their generator nodes (`imageEdit`, `storyboardGen`, `videoGen`) by letting each generator's preview panel render its own latest output; then replace the buggy `canNodeTypeBeManualConnectionSource` whitelist with a proper data-type-aware connection validator.

**Architecture:** Six independent phases, each shippable on its own. Phase 1 deletes dead code (`videoResult`). Phase 2 makes `imageEdit`/`videoGen` previews display their own `imageUrl`/`videoUrl` (purely additive, no behavior change). Phase 3 double-writes — generators update their own field AND still create the legacy `exportImage` node — to remove the dependency without breaking the work-in-progress UI. Phase 4 adds a one-shot migration in `normalizeNodes` so existing drafts with orphan `exportImage` nodes fold their image data back into the upstream generator. Phase 5 removes all `exportImage`-related code. Phase 6 introduces `inputDataTypes` / `outputDataType` per node and a `isValidConnection` callback that replaces the current "allow only upload + exportImage as source" whitelist.

**Tech Stack:** Next.js 15 · React 18 · TypeScript · @xyflow/react · zustand · Vitest · Playwright

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/canvas/nodes/VideoResultNode.tsx` | Delete | Unused component |
| `src/features/canvas/nodes/index.ts` | Modify | Remove `videoResultNode` mapping |
| `src/features/canvas/domain/canvasNodes.ts` | Modify | Drop `videoResult` from `CANVAS_NODE_TYPES`, remove `VideoResultNodeData` |
| `src/features/canvas/domain/nodeRegistry.ts` | Modify | Drop `videoResultNodeDefinition`; later add `inputDataTypes` / `outputDataType` |
| `src/features/canvas/domain/nodeDisplay.ts` | Modify | Remove videoResult display name |
| `src/i18n/locales/zh.json` `en.json` | Modify | Remove videoResult i18n keys |
| `src/features/canvas/nodes/ImageEditNode.tsx` | Modify | Render generated image in preview; stop creating exportImage |
| `src/features/canvas/nodes/VideoGenNode.tsx` | Modify | Render generated video/thumbnail in preview |
| `src/features/canvas/nodes/StoryboardGenNode.tsx` | Modify | Stop creating exportImage children, update self instead (3 sites) |
| `src/features/canvas/Canvas.tsx` | Modify | Adjust polling to monitor `isGenerating` on generator nodes; replace `canNodeTypeBeManualConnectionSource`; add `isValidConnection` |
| `src/features/canvas/edges/DisconnectableEdge.tsx` | Modify | Move processing-edge detection from target-is-exportImage to source-isGenerating |
| `src/features/canvas/nodes/ImageNode.tsx` | Modify (then delete branch) | Remove `isExportResultNode` branch in phase 5 |
| `src/stores/canvasStore.ts` | Modify | Add legacy migration in `normalizeNodes`; remove `exportImage` factory helpers |
| `src/features/canvas/application/graphImageResolver.ts` | Modify | Remove `isExportImageNode` from upstream image lookup |
| `src/features/canvas/nodes/StoryboardNode.tsx` | Modify | Remove `isExportImageNode` from accepted sources |
| `src/features/canvas/tools/builtInTools.ts` | Modify | Remove `isExportImageNode` |
| `src/features/canvas/ui/NodeActionToolbar.tsx` | Modify | Remove `isExportImageNode` branches |
| `src/features/canvas/ui/NodeToolDialog.tsx` | Modify | Remove `isExportImageNode` |
| `__tests__/unit/canvas/canvasStoreMigration.test.ts` | Create | Cover phase-4 migration |
| `__tests__/unit/canvas/connectionValidator.test.ts` | Create | Cover phase-6 `isValidConnection` |

---

## Phase 1 — Delete videoResult (Dead Code)

`videoResult` has no `addNode` call site anywhere in the codebase. It's defined, registered, has a UI component, and is completely orphan.

### Task 1.1: Confirm videoResult has no creators

**Files:**
- Read-only: entire repo

- [ ] **Step 1: Run grep to confirm zero creators**

```bash
grep -rn "addNode.*CANVAS_NODE_TYPES\.videoResult\|createNode.*CANVAS_NODE_TYPES\.videoResult" src/ __tests__/
```

Expected output: (empty — no results).

If anything matches, **STOP** and report findings before continuing.

### Task 1.2: Remove videoResult from CANVAS_NODE_TYPES

**Files:**
- Modify: `src/features/canvas/domain/canvasNodes.ts`

- [ ] **Step 1: Delete the videoResult entry**

In `src/features/canvas/domain/canvasNodes.ts`, find:

```ts
export const CANVAS_NODE_TYPES = {
  upload: 'uploadNode',
  imageEdit: 'imageNode',
  exportImage: 'exportImageNode',
  textAnnotation: 'textAnnotationNode',
  group: 'groupNode',
  storyboardSplit: 'storyboardNode',
  storyboardGen: 'storyboardGenNode',
  videoGen: 'videoGenNode',
  videoResult: 'videoResultNode',       // ← delete this line
  novelInput: 'novelInputNode',
  videoAnalysis: 'videoAnalysisNode',
} as const;
```

Delete the `videoResult:` line.

- [ ] **Step 2: Delete VideoResultNodeData interface**

In the same file, find and delete:

```ts
export interface VideoResultNodeData ... { ... }
```

Also remove `VideoResultNodeData` from the `CanvasNodeData` union type (search for `| VideoResultNodeData`).

- [ ] **Step 3: Delete `isVideoResultNode` type guard if present**

```bash
grep -n "isVideoResultNode" src/features/canvas/domain/canvasNodes.ts
```

If found, delete the function definition.

### Task 1.3: Remove videoResult from nodeRegistry

**Files:**
- Modify: `src/features/canvas/domain/nodeRegistry.ts`

- [ ] **Step 1: Delete videoResultNodeDefinition**

In `src/features/canvas/domain/nodeRegistry.ts`, find `const videoResultNodeDefinition: CanvasNodeDefinition<...>` (around line 295). Delete the whole definition block (~15 lines).

- [ ] **Step 2: Delete the canvasNodeDefinitions mapping entry**

Find and remove:

```ts
[CANVAS_NODE_TYPES.videoResult]: videoResultNodeDefinition,
```

### Task 1.4: Remove videoResult from nodeDisplay

**Files:**
- Modify: `src/features/canvas/domain/nodeDisplay.ts`

- [ ] **Step 1: Delete videoResult entries**

Find and delete:

```ts
[CANVAS_NODE_TYPES.videoResult]: '视频结果',
[CANVAS_NODE_TYPES.videoResult]: 'nodeDisplayName.videoResult',
```

### Task 1.5: Remove VideoResultNode component + index registration

**Files:**
- Delete: `src/features/canvas/nodes/VideoResultNode.tsx`
- Modify: `src/features/canvas/nodes/index.ts`

- [ ] **Step 1: Delete the component file**

```bash
rm src/features/canvas/nodes/VideoResultNode.tsx
```

- [ ] **Step 2: Remove import + nodeType mapping from index.ts**

In `src/features/canvas/nodes/index.ts`:
- Delete the `import { VideoResultNode } from './VideoResultNode'` line
- Delete the `videoResultNode: VideoResultNode,` line from the `nodeTypes` object
- Remove `VideoResultNode` from the re-export list at the bottom

### Task 1.6: Remove i18n entries

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Remove `nodeDisplayName.videoResult` from both locale files**

In each file, find:

```json
"nodeDisplayName": {
  ...
  "videoResult": "视频结果"  // or "Video Result"
  ...
}
```

Delete that key.

### Task 1.7: Verify build is clean

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exits with code 0, no errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Run unit tests**

```bash
npx vitest run
```

Expected: all tests pass.

### Task 1.8: Commit Phase 1

- [ ] **Step 1: Stage + commit**

```bash
git add src/features/canvas/domain/canvasNodes.ts \
        src/features/canvas/domain/nodeRegistry.ts \
        src/features/canvas/domain/nodeDisplay.ts \
        src/features/canvas/nodes/index.ts \
        src/features/canvas/nodes/VideoResultNode.tsx \
        src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "refactor(canvas): remove videoResult node (dead code)

videoResult had no addNode call sites anywhere in the codebase — it was
defined, registered, had a UI component, but nothing ever created it.
The videoGen node already owns videoUrl/thumbnailUrl on its data so the
result is in the source node, not a downstream wrapper."
```

---

## Phase 2 — Show Generated Result in Preview Panel

Make `imageEdit` and `videoGen` preview panels render the latest output (additive — `exportImage` still gets created and continues to work).

### Task 2.1: Show generated image in ImageEditNode preview

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx` (around line 720)

- [ ] **Step 1: Locate the preview-media block**

In `src/features/canvas/nodes/ImageEditNode.tsx`, find:

```tsx
<div className="node-preview-media" style={{ aspectRatio: '16/9' }}>
  <Sparkles className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
</div>
```

- [ ] **Step 2: Replace the placeholder with a content switcher**

Change the block to:

```tsx
<div className="node-preview-media relative" style={{ aspectRatio: '16/9' }}>
  {data.imageUrl ? (
    <img
      src={data.imageUrl}
      alt={resolvedTitle}
      className="h-full w-full object-cover"
      draggable={false}
    />
  ) : data.isGenerating ? (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--canvas-node-fg-muted)]" />
    </div>
  ) : (
    <Sparkles className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
  )}
</div>
```

- [ ] **Step 3: Ensure `Loader2` is imported**

At the top of `ImageEditNode.tsx`, confirm or add:

```ts
import { Sparkles, Loader2 /* …other icons */ } from 'lucide-react';
```

(Search the existing imports — only add `Loader2` if not already present.)

- [ ] **Step 4: Confirm `data.imageUrl` exists on `ImageEditNodeData`**

```bash
grep -n "imageUrl" src/features/canvas/domain/canvasNodes.ts
```

If `imageUrl` is not on `ImageEditNodeData`, add it as `imageUrl?: string | null;`. (It should already exist — the generator already sets it on the exportImage child; we'll start populating it on `self` in Phase 3.)

### Task 2.2: Verify Phase 2.1 visually

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manually test**

Open a project in browser. Add an `AI 图片` (imageEdit) node. Preview shows the Sparkles placeholder (no `imageUrl` yet). Click expand, configure a prompt, click 生成. Preview still shows Sparkles (because the result still goes to the child exportImage in Phase 2; phase 3 is where the result lands on self).

For a quick visual confirmation pre-Phase 3, manually paste an `imageUrl` into Zustand devtools or a test stub project, and confirm the preview swaps to display the image.

### Task 2.3: Show generated video thumbnail in VideoGenNode preview

**Files:**
- Modify: `src/features/canvas/nodes/VideoGenNode.tsx`

- [ ] **Step 1: Locate the preview-media block**

In `src/features/canvas/nodes/VideoGenNode.tsx`, search for the JSX inside `node-preview-card` — it will mirror ImageEditNode's pattern with a placeholder icon.

```bash
grep -n "node-preview-media" src/features/canvas/nodes/VideoGenNode.tsx
```

- [ ] **Step 2: Apply same swap pattern**

Replace the placeholder content with:

```tsx
<div className="node-preview-media relative" style={{ aspectRatio: '16/9' }}>
  {data.videoUrl ? (
    <video
      src={data.videoUrl}
      poster={data.thumbnailUrl ?? undefined}
      muted
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  ) : data.thumbnailUrl ? (
    <img
      src={data.thumbnailUrl}
      alt={resolvedTitle}
      className="h-full w-full object-cover"
      draggable={false}
    />
  ) : data.isGenerating ? (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--canvas-node-fg-muted)]" />
    </div>
  ) : (
    <Film className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
  )}
</div>
```

- [ ] **Step 3: Ensure imports**

In VideoGenNode imports, confirm or add: `Loader2`, `Film` from `lucide-react`.

### Task 2.4: Show generated grid in StoryboardGenNode preview

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`

- [ ] **Step 1: Locate the preview-media block**

```bash
grep -n "node-preview-media" src/features/canvas/nodes/StoryboardGenNode.tsx
```

- [ ] **Step 2: Apply pattern with `data.imageUrl`/`previewImageUrl`**

Replace the placeholder with:

```tsx
<div className="node-preview-media relative" style={{ aspectRatio: '16/9' }}>
  {data.previewImageUrl || data.imageUrl ? (
    <img
      src={data.previewImageUrl ?? data.imageUrl ?? ''}
      alt={resolvedTitle}
      className="h-full w-full object-contain"
      draggable={false}
    />
  ) : data.isGenerating ? (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--canvas-node-fg-muted)]" />
    </div>
  ) : (
    <LayoutTemplate className="h-10 w-10 opacity-20 text-[var(--canvas-node-fg-muted)]" />
  )}
</div>
```

### Task 2.5: Commit Phase 2

- [ ] **Step 1: Commit**

```bash
git add src/features/canvas/nodes/ImageEditNode.tsx \
        src/features/canvas/nodes/VideoGenNode.tsx \
        src/features/canvas/nodes/StoryboardGenNode.tsx
git commit -m "feat(canvas): show generator output in preview panel

ImageEditNode / VideoGenNode / StoryboardGenNode preview-media block
now renders the node's own imageUrl/videoUrl/thumbnailUrl when
present, a loader while isGenerating, and the placeholder icon only
when truly empty. Purely additive — exportImage child node still
gets created on generation, so existing workflows are unaffected."
```

---

## Phase 3 — Self-Update on Generation

Make generators update their own `imageUrl`/`videoUrl` field at generation completion (in addition to the existing exportImage child creation). This is the actual data-model unification step.

### Task 3.1: ImageEditNode writes result to own data

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`

- [ ] **Step 1: Find the post-generation update site**

In `ImageEditNode.tsx` find where, after AI gateway returns the image URL, it updates the **child** exportImage node. There will be a `updateNodeData(newNodeId, { imageUrl, ... })` call (the `newNodeId` is the exportImage child). Around line 500-560.

```bash
grep -n "updateNodeData.*newNodeId\|setNodeData.*newNodeId" src/features/canvas/nodes/ImageEditNode.tsx
```

- [ ] **Step 2: Mirror the update to self**

Immediately AFTER the `updateNodeData(newNodeId, ...)` call, add:

```ts
updateNodeData(id, {
  imageUrl: resultImageUrl,
  isGenerating: false,
  generationStartedAt: null,
});
```

(Replace `resultImageUrl` with whatever variable holds the URL — read the surrounding code first to use the exact identifier.)

- [ ] **Step 3: Also set isGenerating=true on self when generation begins**

Find where `isGenerating: true` is set on the **new exportImage child**. Immediately before or after, add:

```ts
updateNodeData(id, { isGenerating: true, generationStartedAt });
```

### Task 3.2: VideoGenNode writes result to own data

**Files:**
- Modify: `src/features/canvas/nodes/VideoGenNode.tsx`

- [ ] **Step 1: Find the post-generation update site**

VideoGenNode already writes to itself (no separate result node) — confirm by:

```bash
grep -n "updateNodeData.*videoUrl\|updateNodeData.*thumbnailUrl" src/features/canvas/nodes/VideoGenNode.tsx
```

If updates already target `id` (self), no change needed.

- [ ] **Step 2: Confirm and skip if already self-updating**

If videoGen already updates self, just confirm with a code comment:

```ts
// videoGen already owns its result — no exportImage child to merge
```

### Task 3.3: StoryboardGenNode mirrors result to own preview field

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`

- [ ] **Step 1: Find the 3 exportImage creation sites**

```bash
grep -n "CANVAS_NODE_TYPES.exportImage" src/features/canvas/nodes/StoryboardGenNode.tsx
```

There will be 3 (around lines 957, 1003, 1210).

- [ ] **Step 2: At each site, add a mirrored self-update**

For each `addNode(CANVAS_NODE_TYPES.exportImage, ...)` call followed by `updateNodeData(previewNodeId, {imageUrl: ...})`, add an additional call to update self:

```ts
updateNodeData(id, {
  imageUrl: gridImageDataUrl,
  previewImageUrl: gridImageDataUrl,
  isGenerating: false,
});
```

(Adapt variable names to the actual surrounding context. Read each site individually.)

### Task 3.4: Commit Phase 3

- [ ] **Step 1: Commit**

```bash
git add src/features/canvas/nodes/ImageEditNode.tsx \
        src/features/canvas/nodes/VideoGenNode.tsx \
        src/features/canvas/nodes/StoryboardGenNode.tsx
git commit -m "feat(canvas): generators write result to own data (double-write)

ImageEditNode and StoryboardGenNode now update their own imageUrl
field at generation completion, in addition to the legacy
exportImage child. This makes the preview panel show the result
without any further glue. Phase 4 will migrate existing drafts
and Phase 5 will retire the exportImage child."
```

---

## Phase 4 — Legacy Draft Migration

Existing canvases stored in Supabase still have orphan `exportImage` nodes downstream of `imageEdit` / `storyboardGen`. On load, fold their `imageUrl` back onto the parent generator and delete the orphan, but only when safely paired via exactly one upstream edge.

### Task 4.1: Write failing test for migration

**Files:**
- Create: `__tests__/unit/canvas/canvasStoreMigration.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest';
import { migrateLegacyExportImageNodes } from '@/stores/canvasStoreMigration';
import type { CanvasNode, CanvasEdge } from '@/features/canvas/domain/canvasNodes';

describe('migrateLegacyExportImageNodes', () => {
  it('folds an exportImage result back into its imageEdit parent', () => {
    const nodes: CanvasNode[] = [
      {
        id: 'gen-1',
        type: 'imageNode',
        position: { x: 0, y: 0 },
        data: { imageUrl: null, prompt: 'cat', model: 'm', size: '1024' } as any,
      },
      {
        id: 'res-1',
        type: 'exportImageNode',
        position: { x: 200, y: 0 },
        data: { imageUrl: 'https://example/r.png', resultKind: 'generic' } as any,
      },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'gen-1', target: 'res-1', type: 'disconnectableEdge' } as any,
    ];

    const { nodes: outNodes, edges: outEdges } = migrateLegacyExportImageNodes(nodes, edges);

    expect(outNodes.find((n) => n.id === 'gen-1')?.data).toMatchObject({ imageUrl: 'https://example/r.png' });
    expect(outNodes.find((n) => n.id === 'res-1')).toBeUndefined();
    expect(outEdges.find((e) => e.id === 'e1')).toBeUndefined();
  });

  it('leaves exportImage alone if it has multiple incoming edges (ambiguous)', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'imageNode', position: { x: 0, y: 0 }, data: { imageUrl: null } as any },
      { id: 'b', type: 'imageNode', position: { x: 0, y: 100 }, data: { imageUrl: null } as any },
      { id: 'res', type: 'exportImageNode', position: { x: 200, y: 0 }, data: { imageUrl: 'https://x/r.png' } as any },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'a', target: 'res' } as any,
      { id: 'e2', source: 'b', target: 'res' } as any,
    ];

    const { nodes: outNodes } = migrateLegacyExportImageNodes(nodes, edges);
    expect(outNodes.find((n) => n.id === 'res')).toBeDefined();
  });

  it('leaves exportImage alone if parent is not a recognised generator type', () => {
    const nodes: CanvasNode[] = [
      { id: 'upload', type: 'uploadNode', position: { x: 0, y: 0 }, data: {} as any },
      { id: 'res', type: 'exportImageNode', position: { x: 200, y: 0 }, data: { imageUrl: 'https://x.png' } as any },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'upload', target: 'res' } as any,
    ];

    const { nodes: outNodes } = migrateLegacyExportImageNodes(nodes, edges);
    expect(outNodes.find((n) => n.id === 'res')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
npx vitest run __tests__/unit/canvas/canvasStoreMigration.test.ts
```

Expected: import failure (`canvasStoreMigration` not found yet).

### Task 4.2: Implement migration

**Files:**
- Create: `src/stores/canvasStoreMigration.ts`

- [ ] **Step 1: Create the migration module**

```ts
import type { CanvasNode, CanvasEdge } from '@/features/canvas/domain/canvasNodes';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

const RECOGNISED_PARENT_TYPES = new Set<string>([
  CANVAS_NODE_TYPES.imageEdit,
  CANVAS_NODE_TYPES.storyboardGen,
]);

export function migrateLegacyExportImageNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const incomingByTarget = new Map<string, CanvasEdge[]>();
  for (const e of edges) {
    const arr = incomingByTarget.get(e.target) ?? [];
    arr.push(e);
    incomingByTarget.set(e.target, arr);
  }

  const nodesToDelete = new Set<string>();
  const edgesToDelete = new Set<string>();
  const dataPatches = new Map<string, Partial<CanvasNode['data']>>();

  for (const n of nodes) {
    if (n.type !== CANVAS_NODE_TYPES.exportImage) continue;
    const incoming = incomingByTarget.get(n.id) ?? [];
    if (incoming.length !== 1) continue;
    const parent = nodesById.get(incoming[0].source);
    if (!parent || !RECOGNISED_PARENT_TYPES.has(parent.type as string)) continue;

    const resultImageUrl = (n.data as { imageUrl?: string | null }).imageUrl;
    if (!resultImageUrl) continue;

    nodesToDelete.add(n.id);
    edgesToDelete.add(incoming[0].id);
    dataPatches.set(parent.id, { imageUrl: resultImageUrl } as Partial<CanvasNode['data']>);
  }

  if (nodesToDelete.size === 0) return { nodes, edges };

  const outNodes = nodes
    .filter((n) => !nodesToDelete.has(n.id))
    .map((n) => {
      const patch = dataPatches.get(n.id);
      return patch ? { ...n, data: { ...n.data, ...patch } } : n;
    });
  const outEdges = edges.filter((e) => !edgesToDelete.has(e.id));

  return { nodes: outNodes, edges: outEdges };
}
```

- [ ] **Step 2: Run test, confirm pass**

```bash
npx vitest run __tests__/unit/canvas/canvasStoreMigration.test.ts
```

Expected: 3 tests pass.

### Task 4.3: Wire migration into normalizeNodes

**Files:**
- Modify: `src/stores/canvasStore.ts` (in `setCanvasData`)

- [ ] **Step 1: Locate setCanvasData**

```bash
grep -n "setCanvasData: (nodes, edges, history) =>" src/stores/canvasStore.ts
```

- [ ] **Step 2: Insert migration before normalize**

Update the body to:

```ts
setCanvasData: (nodes, edges, history) => {
  const { nodes: migratedNodes, edges: migratedEdges } =
    migrateLegacyExportImageNodes(nodes, edges);
  const normalizedNodes = normalizeNodes(migratedNodes);
  const normalizedEdges = normalizeEdgesWithNodes(migratedEdges, normalizedNodes);

  set({
    nodes: normalizedNodes,
    edges: normalizedEdges,
    selectedNodeId: null,
    activeToolDialog: null,
    history: normalizeHistory(history),
    dragHistorySnapshot: null,
  });
},
```

- [ ] **Step 3: Add import at top**

```ts
import { migrateLegacyExportImageNodes } from './canvasStoreMigration';
```

### Task 4.4: Verify + commit

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 2: Manual smoke-test in dev**

Open an existing project that had exportImage nodes saved. After load, those nodes should be gone from the canvas and the parent generator's preview should show the image.

- [ ] **Step 3: Commit**

```bash
git add src/stores/canvasStoreMigration.ts \
        src/stores/canvasStore.ts \
        __tests__/unit/canvas/canvasStoreMigration.test.ts
git commit -m "feat(canvas): migrate legacy exportImage nodes into parent on load

When loading an existing draft, any exportImage node with exactly one
incoming edge from imageEdit/storyboardGen is folded: its imageUrl
copies onto the parent, and the orphan node + edge are dropped.
Ambiguous cases (multiple incoming edges, unrecognised parents) are
left untouched so no data is silently destroyed."
```

---

## Phase 5 — Remove exportImage Completely

### Task 5.1: Stop creating exportImage in ImageEditNode

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`

- [ ] **Step 1: Locate exportImage creation block**

Around line 435-452: the block that calls `findNodePosition`, then `addNode(CANVAS_NODE_TYPES.exportImage, ...)`, then `addEdge(id, newNodeId)`.

- [ ] **Step 2: Remove the block**

Delete lines from the start of `findNodePosition` call through the `addEdge(id, newNodeId)`.

- [ ] **Step 3: Replace `newNodeId` references**

Any later updates that wrote to `newNodeId` must now write to `id` (self). Specifically: find all `updateNodeData(newNodeId, ...)` calls and change to `updateNodeData(id, ...)`.

(There should already be self-updates from Phase 3 — those stay; you're just removing the now-duplicate calls to `newNodeId`.)

- [ ] **Step 4: Remove unused imports**

```ts
// remove if no longer used:
import { addEdge } from ...
EXPORT_RESULT_NODE_DEFAULT_WIDTH,
EXPORT_RESULT_NODE_LAYOUT_HEIGHT,
```

Use `npx tsc --noEmit` to surface unused imports.

### Task 5.2: Stop creating exportImage in StoryboardGenNode

**Files:**
- Modify: `src/features/canvas/nodes/StoryboardGenNode.tsx`

- [ ] **Step 1: Locate the 3 sites**

```bash
grep -n "CANVAS_NODE_TYPES.exportImage" src/features/canvas/nodes/StoryboardGenNode.tsx
```

- [ ] **Step 2: At each, remove the `addNode(exportImage, ...)` + `addEdge(...)` pair**

Keep only the self-update from Phase 3. Delete the `findNodePosition` + `addNode` + `addEdge` block.

### Task 5.3: Migrate Canvas.tsx polling

**Files:**
- Modify: `src/features/canvas/Canvas.tsx`

- [ ] **Step 1: Locate the polling effect**

Around line 444-450: `pendingExportNodes = nodes.filter((node) => node.type === CANVAS_NODE_TYPES.exportImage && ...)`.

- [ ] **Step 2: Change to monitor generators directly**

Replace:

```ts
const pendingExportNodes = nodes.filter((node) => {
  if (node.type !== CANVAS_NODE_TYPES.exportImage) return false;
  const data = node.data as Record<string, unknown>;
  return data.isGenerating === true && typeof data.generationJobId === 'string' && data.generationJobId.length > 0;
});
```

With:

```ts
const pendingGenerationNodes = nodes.filter((node) => {
  if (node.type !== CANVAS_NODE_TYPES.imageEdit
      && node.type !== CANVAS_NODE_TYPES.storyboardGen
      && node.type !== CANVAS_NODE_TYPES.videoGen) return false;
  const data = node.data as Record<string, unknown>;
  return data.isGenerating === true && typeof data.generationJobId === 'string' && data.generationJobId.length > 0;
});
```

Update the loop body's variable name `pendingExportNodes` → `pendingGenerationNodes` consistently.

### Task 5.4: Migrate DisconnectableEdge processing-edge detection

**Files:**
- Modify: `src/features/canvas/edges/DisconnectableEdge.tsx`

- [ ] **Step 1: Replace target-is-exportImage check with source-isGenerating**

Find lines 98-117. Replace:

```ts
const isProcessingEdge = useMemo(() => {
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode || targetNode.type !== CANVAS_NODE_TYPES.exportImage) {
    return false;
  }
  const isSupportedSource =
    sourceNode.type === CANVAS_NODE_TYPES.storyboardGen ||
    sourceNode.type === CANVAS_NODE_TYPES.imageEdit;
  if (!isSupportedSource) return false;

  const isTargetGenerating =
    (targetNode.data as { isGenerating?: boolean } | undefined)?.isGenerating === true;
  return isTargetGenerating;
}, [nodes, source, target]);
```

With:

```ts
const isProcessingEdge = useMemo(() => {
  const sourceNode = nodes.find((node) => node.id === source);
  if (!sourceNode) return false;
  const eligible =
    sourceNode.type === CANVAS_NODE_TYPES.imageEdit ||
    sourceNode.type === CANVAS_NODE_TYPES.storyboardGen ||
    sourceNode.type === CANVAS_NODE_TYPES.videoGen;
  if (!eligible) return false;
  return (sourceNode.data as { isGenerating?: boolean } | undefined)?.isGenerating === true;
}, [nodes, source]);
```

### Task 5.5: Remove `isExportImageNode` from upstream image lookup

**Files:**
- Modify: `src/features/canvas/application/graphImageResolver.ts`
- Modify: `src/features/canvas/nodes/StoryboardNode.tsx`
- Modify: `src/features/canvas/tools/builtInTools.ts`
- Modify: `src/features/canvas/ui/NodeActionToolbar.tsx`
- Modify: `src/features/canvas/ui/NodeToolDialog.tsx`
- Modify: `src/features/canvas/domain/canvasNodes.ts` (the helper `nodeIsImageSource` at line 385)

- [ ] **Step 1: For each file above, remove `isExportImageNode(...)` calls and the import**

Example (graphImageResolver.ts):

```ts
// BEFORE
if (isUploadNode(node) || isImageEditNode(node) || isExportImageNode(node)) {
// AFTER
if (isUploadNode(node) || isImageEditNode(node)) {
```

Repeat for each file. Drop the `isExportImageNode` import from each file's import list.

### Task 5.6: Remove ImageNode `isExportResultNode` branch

**Files:**
- Modify: `src/features/canvas/nodes/ImageNode.tsx`

ImageNode currently doubles as the renderer for both `imageEdit` (no — it's actually only registered for `exportImage` in `nodes/index.ts`; `imageEdit` uses `ImageEditNode`). Confirm by:

```bash
grep -n "imageNode:" src/features/canvas/nodes/index.ts
grep -n "exportImageNode:" src/features/canvas/nodes/index.ts
```

- [ ] **Step 1: Delete the entire ImageNode.tsx file**

Since exportImage no longer exists, ImageNode (which only rendered exportImage) is dead.

```bash
rm src/features/canvas/nodes/ImageNode.tsx
```

- [ ] **Step 2: Remove from nodes/index.ts**

Delete the import and the `exportImageNode: ImageNode,` mapping line.

### Task 5.7: Remove exportImage from CANVAS_NODE_TYPES + types

**Files:**
- Modify: `src/features/canvas/domain/canvasNodes.ts`
- Modify: `src/features/canvas/domain/nodeRegistry.ts`
- Modify: `src/features/canvas/domain/nodeDisplay.ts`
- Modify: `src/i18n/locales/zh.json`, `en.json`
- Modify: `src/stores/canvasStore.ts`

- [ ] **Step 1: Delete the entry from CANVAS_NODE_TYPES**

In `canvasNodes.ts`, delete the `exportImage: 'exportImageNode',` line.

- [ ] **Step 2: Delete the type definitions**

Delete `ExportImageNodeData`, `ExportImageNodeResultKind`, `isExportImageNode` (function), and remove from union type `CanvasNodeData`.

- [ ] **Step 3: Rename `EXPORT_RESULT_NODE_*` constants**

These constants describe a default rectangle for result nodes. Rename to `IMAGE_RESULT_DEFAULT_*` (or keep names and treat them as image-area defaults):

```ts
export const IMAGE_RESULT_DEFAULT_WIDTH = 384;
export const IMAGE_RESULT_DEFAULT_HEIGHT = 288;
export const IMAGE_RESULT_MIN_WIDTH = 168;
export const IMAGE_RESULT_MIN_HEIGHT = 168;
```

Update all references in UploadNode, canvasStore, StoryboardGenNode to the new names.

- [ ] **Step 4: Delete exportImageNodeDefinition**

In `nodeRegistry.ts`, delete the whole `const exportImageNodeDefinition = {...}` block and the mapping entry.

- [ ] **Step 5: Delete nodeDisplay entry**

Delete `[CANVAS_NODE_TYPES.exportImage]: '结果图片'` etc.

- [ ] **Step 6: Delete i18n keys**

In both locale files, delete `"exportImage": "..."` under `nodeDisplayName`.

- [ ] **Step 7: Clean canvasStore helpers**

In `canvasStore.ts`, find the helper at line ~1023 that creates exportImage nodes (`canvasNodeFactory.createNode(CANVAS_NODE_TYPES.exportImage, ...)`). Delete it.

Also delete `(type === CANVAS_NODE_TYPES.exportImage)` branches and update `nextSize = node.type === CANVAS_NODE_TYPES.exportImage ? {...} : {...}` to drop that branch.

### Task 5.8: TS + lint + test + commit

- [ ] **Step 1: Run all checks**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: clean.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(canvas): remove exportImage node type

Generator nodes (imageEdit, storyboardGen) now own their result on
their own data — exportImage was a redundant downstream wrapper. The
migration in Phase 4 already folded legacy data, so removing the type
is safe. Touches creation sites, polling, processing-edge detection,
type guards used by upstream-image lookup, the ImageNode renderer (now
unused), nodeRegistry, nodeDisplay, i18n, and EXPORT_RESULT_NODE_*
constants (renamed to IMAGE_RESULT_*)."
```

---

## Phase 6 — Data-Type-Aware Connection Validation

Replace the buggy `canNodeTypeBeManualConnectionSource` whitelist with declared `inputDataTypes` / `outputDataType` on each node and a `isValidConnection` callback that enforces semantic correctness.

### Task 6.1: Write failing tests for connection validator

**Files:**
- Create: `__tests__/unit/canvas/connectionValidator.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest';
import { isValidConnectionByDataType } from '@/features/canvas/domain/connectionValidator';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

describe('isValidConnectionByDataType', () => {
  it('allows upload (image) -> imageEdit (image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.upload, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });

  it('allows imageEdit (image) -> videoGen (image|text)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.imageEdit, CANVAS_NODE_TYPES.videoGen)).toBe(true);
  });

  it('rejects videoGen (video) -> imageEdit (image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoGen, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });

  it('rejects novelInput (text) -> imageEdit (image only)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });

  it('allows novelInput (text) -> storyboardGen (text|image)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.novelInput, CANVAS_NODE_TYPES.storyboardGen)).toBe(true);
  });

  it('allows videoGen (video) -> videoAnalysis (video)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.videoGen, CANVAS_NODE_TYPES.videoAnalysis)).toBe(true);
  });

  it('allows storyboardGen (image-set) -> imageEdit (image)', () => {
    // image-set source is acceptable wherever image is — allows per-frame downstream
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.storyboardGen, CANVAS_NODE_TYPES.imageEdit)).toBe(true);
  });

  it('rejects connection from textAnnotation (no output)', () => {
    expect(isValidConnectionByDataType(CANVAS_NODE_TYPES.textAnnotation, CANVAS_NODE_TYPES.imageEdit)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
npx vitest run __tests__/unit/canvas/connectionValidator.test.ts
```

Expected: module not found.

### Task 6.2: Add `inputDataTypes` + `outputDataType` to nodeRegistry

**Files:**
- Modify: `src/features/canvas/domain/nodeRegistry.ts`

- [ ] **Step 1: Add the type union**

At the top of nodeRegistry.ts (after imports), add:

```ts
export type CanvasDataType = 'image' | 'image-set' | 'video' | 'text';
```

- [ ] **Step 2: Extend `CanvasNodeConnectivity`**

Find the existing interface:

```ts
export interface CanvasNodeConnectivity {
  sourceHandle: boolean;
  targetHandle: boolean;
  connectMenu: {
    fromSource: boolean;
    fromTarget: boolean;
  };
}
```

Replace with:

```ts
export interface CanvasNodeConnectivity {
  sourceHandle: boolean;
  targetHandle: boolean;
  outputDataType: CanvasDataType | null;
  inputDataTypes: CanvasDataType[];
  connectMenu: {
    fromSource: boolean;
    fromTarget: boolean;
  };
}
```

- [ ] **Step 3: Fill in each definition**

For each `*NodeDefinition` block, add the two new fields to its `connectivity`:

| Node | outputDataType | inputDataTypes |
|---|---|---|
| upload | `'image'` | `[]` |
| imageEdit | `'image'` | `['image']` |
| storyboardSplit | `'image-set'` | `['image']` |
| storyboardGen | `'image-set'` | `['text', 'image']` |
| videoGen | `'video'` | `['image', 'text']` |
| videoAnalysis | `'image-set'` | `['video']` |
| novelInput | `'text'` | `[]` |
| textAnnotation | `null` | `[]` |
| group | `null` | `[]` |

(`exportImage` and `videoResult` are already deleted in earlier phases.)

Example for `uploadNodeDefinition`:

```ts
connectivity: {
  sourceHandle: true,
  targetHandle: false,
  outputDataType: 'image',
  inputDataTypes: [],
  connectMenu: { fromSource: false, fromTarget: true },
},
```

Apply to every definition.

### Task 6.3: Implement connection validator

**Files:**
- Create: `src/features/canvas/domain/connectionValidator.ts`

- [ ] **Step 1: Create the validator**

```ts
import { canvasNodeDefinitions } from './nodeRegistry';
import type { CanvasDataType } from './nodeRegistry';
import type { CanvasNodeType } from './canvasNodes';

export function isValidConnectionByDataType(
  sourceType: CanvasNodeType,
  targetType: CanvasNodeType
): boolean {
  if (sourceType === targetType) {
    // self-connect generally allowed for chaining (e.g. imageEdit → imageEdit)
    // but only if both ends have a handle and the types match
  }
  const srcDef = canvasNodeDefinitions[sourceType];
  const tgtDef = canvasNodeDefinitions[targetType];
  if (!srcDef || !tgtDef) return false;
  if (!srcDef.connectivity.sourceHandle) return false;
  if (!tgtDef.connectivity.targetHandle) return false;

  const out = srcDef.connectivity.outputDataType;
  const acceptedIn = tgtDef.connectivity.inputDataTypes;
  if (!out || acceptedIn.length === 0) return false;

  // image-set produces a stream of images — acceptable where 'image' is accepted
  if (out === 'image-set' && acceptedIn.includes('image')) return true;

  return acceptedIn.includes(out);
}
```

- [ ] **Step 2: Run test, confirm pass**

```bash
npx vitest run __tests__/unit/canvas/connectionValidator.test.ts
```

Expected: all 8 tests pass.

### Task 6.4: Wire validator into React Flow

**Files:**
- Modify: `src/features/canvas/Canvas.tsx`

- [ ] **Step 1: Add import**

At the top of Canvas.tsx:

```ts
import { isValidConnectionByDataType } from './domain/connectionValidator';
import type { Connection } from '@xyflow/react';
```

- [ ] **Step 2: Add isValidConnection callback**

Near `handleConnect`, add:

```ts
const isValidConnection = useCallback((c: Connection | { source: string | null; target: string | null }) => {
  if (!c.source || !c.target) return false;
  if (c.source === c.target) return false;
  const src = nodes.find((n) => n.id === c.source);
  const tgt = nodes.find((n) => n.id === c.target);
  if (!src || !tgt) return false;
  return isValidConnectionByDataType(src.type, tgt.type);
}, [nodes]);
```

- [ ] **Step 3: Pass to ReactFlow**

Find `<ReactFlow ...` (around line 1854) and add the prop:

```tsx
<ReactFlow
  ...
  onConnect={handleConnect}
  isValidConnection={isValidConnection}
  ...
>
```

### Task 6.5: Remove the legacy whitelist

**Files:**
- Modify: `src/features/canvas/Canvas.tsx`

- [ ] **Step 1: Delete `canNodeTypeBeManualConnectionSource`**

Find and delete at line ~196:

```ts
function canNodeTypeBeManualConnectionSource(type: CanvasNodeType): boolean {
  return type === CANVAS_NODE_TYPES.upload || type === CANVAS_NODE_TYPES.exportImage;
}

function canNodeBeManualConnectionSource(nodeId: string | null | undefined, nodes: CanvasNode[]): boolean {
  ...
}
```

Delete both functions.

- [ ] **Step 2: Replace call sites in handleConnect**

Find `handleConnect` (around line 674). Replace the guard:

```ts
const handleConnect = useCallback(
  (connection: Connection) => {
    if (!isValidConnection(connection)) return;
    connectNodes(connection);
    scheduleCanvasPersist(0);
  },
  [connectNodes, isValidConnection, scheduleCanvasPersist]
);
```

- [ ] **Step 3: Replace call sites in handleConnectEnd**

Find the `if (sourceNode && targetNode && canNodeTypeBeManualConnectionSource(sourceNode.type) && ...)` block (around line 1525). Replace condition with:

```ts
if (
  sourceNode &&
  targetNode &&
  isValidConnectionByDataType(sourceNode.type, targetNode.type)
) {
  connectNodes({ ... });
}
```

### Task 6.6: Update addEdge guard in canvasStore

**Files:**
- Modify: `src/stores/canvasStore.ts`

- [ ] **Step 1: Replace the source/target handle guards with data-type check**

Find `addEdge: (source, target) => {` (around line 781).

Current:

```ts
if (!nodeHasSourceHandle(sourceNode.type) || !nodeHasTargetHandle(targetNode.type)) {
  return null;
}
```

Replace with import + call:

```ts
import { isValidConnectionByDataType } from '@/features/canvas/domain/connectionValidator';
// ...
if (!isValidConnectionByDataType(sourceNode.type, targetNode.type)) {
  return null;
}
```

Same for the `onConnect` site at line ~178.

### Task 6.7: Verify + commit

- [ ] **Step 1: TS + lint + test**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: clean.

- [ ] **Step 2: Manual browser test**

Open canvas, verify:
1. Drag from `AI 图片` (imageEdit) — should now successfully connect to `AI 视频` (videoGen).
2. Drag from `AI 视频` (videoGen) to `AI 图片` — connection should be rejected (video → image input).
3. Drag from `小说输入` (novelInput) — only `分镜生成` and `AI 视频` should accept; `AI 图片` rejects.
4. Drag from `视频分析` (videoAnalysis) — `分镜生成` / `AI 图片` / `AI 视频` should all accept (image-set output).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(canvas): data-type-aware connection validation

Each node now declares its inputDataTypes and outputDataType in
nodeRegistry. The new isValidConnectionByDataType validator enforces
semantic correctness — fixing the long-standing bug where AI 图片
(imageEdit) couldn't connect to AI 视频 (videoGen) despite both having
the right handles, and tightening up nonsense connections like
video → image input.

Replaces the canNodeTypeBeManualConnectionSource whitelist (which only
allowed upload + exportImage as drag sources) with a general data-type
match. Wired into React Flow via isValidConnection prop so invalid
targets are highlighted as such during drag."
```

---

## Phase 7 — Update Connection Documentation

### Task 7.1: Document the new connection matrix

**Files:**
- Create: `docs/architecture/canvas-node-connections.md`

- [ ] **Step 1: Create the doc**

```markdown
# Canvas Node Connection Matrix

Each canvas node declares two fields in `nodeRegistry.ts`:

- `outputDataType`: what this node produces (`'image' | 'image-set' | 'video' | 'text' | null`)
- `inputDataTypes`: what data types this node accepts

A connection is valid iff `source.outputDataType ∈ target.inputDataTypes`, with one widening rule: `image-set` source is accepted wherever `image` is accepted.

## Connection Matrix

| Source ↓ \ Target → | imageEdit | storyboardSplit | storyboardGen | videoGen | videoAnalysis |
|---|:-:|:-:|:-:|:-:|:-:|
| upload | ✓ image | ✓ image | ✓ image | ✓ image | ✗ |
| imageEdit | ✓ image | ✓ image | ✓ image | ✓ image | ✗ |
| storyboardSplit | ✓ image-set→image | — | ✓ image-set→image | ✓ image-set→image | ✗ |
| storyboardGen | ✓ image-set→image | ✓ image-set→image | — | ✓ image-set→image | ✗ |
| novelInput | ✗ | ✗ | ✓ text | ✓ text | ✗ |
| videoGen | ✗ | ✗ | ✗ | ✗ | ✓ video |
| videoAnalysis | ✓ image-set→image | ✓ image-set→image | ✓ image-set→image | ✓ image-set→image | — |

## Why these rules

- **image → image flow**: chaining edits (upload → imageEdit → another imageEdit → ...) is the core image workflow.
- **image → image-set producers**: a single image can seed a storyboardSplit / storyboardGen / videoGen as reference / first frame.
- **text → generator**: novelInput's scene text feeds storyboardGen scenes or videoGen prompts.
- **video → analyzer only**: video is a terminal data type that can only loop back via videoAnalysis (which extracts frames + prompts, restarting as image-set).
- **textAnnotation / group**: deliberately have no data flow — pure organisational decoration.

## Adding a new node

1. Declare `outputDataType` and `inputDataTypes` in its `nodeRegistry` definition.
2. Set `sourceHandle` / `targetHandle` to match (must be true if the corresponding data array is non-empty).
3. No special cases — the validator generalises.
```

### Task 7.2: Commit docs

```bash
git add docs/architecture/canvas-node-connections.md
git commit -m "docs(canvas): document data-type-aware connection matrix"
```

---

## Self-Review Checklist (run after writing the whole plan)

- [x] **Spec coverage**: Phases 1-6 cover videoResult deletion, preview self-display, double-write, legacy migration, exportImage removal, and the new data-type-aware connection validator. Phase 7 adds documentation.
- [x] **Placeholder scan**: All code blocks contain literal code, not TBD/TODO. Variable names like `resultImageUrl` are flagged for "use the exact identifier from surrounding code" rather than left as placeholders.
- [x] **Type consistency**: `migrateLegacyExportImageNodes` signature is consistent across test + implementation + caller. `isValidConnectionByDataType` consistent across validator + Canvas + canvasStore. New `CanvasDataType` union introduced before use.
- [x] **Migration safety**: Phase 4 only folds an exportImage if exactly one upstream edge from a recognised generator; ambiguous cases keep the orphan node. Test covers all three branches.
