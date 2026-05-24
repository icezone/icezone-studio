# Canvas Node Connection Matrix

Connection validity in the canvas is determined by per-node data-type declarations
in [`nodeRegistry.ts`](../../src/features/canvas/domain/nodeRegistry.ts):

- `outputDataType` — what this node produces on its source handle
  (`'image' | 'image-set' | 'video' | 'text' | null`)
- `inputDataTypes[]` — what data types this node's target handle accepts

A connection is valid iff `source.outputDataType` ∈ `target.inputDataTypes`,
with one widening rule: an `'image-set'` source is accepted wherever
`'image'` is accepted.

Validation lives in
[`domain/connectionValidator.ts`](../../src/features/canvas/domain/connectionValidator.ts)
and is wired into React Flow via the `isValidConnection` prop on
`<ReactFlow>`. The same validator gates `canvasStore.addEdge`,
`Canvas.tsx#handleConnect`, and `Canvas.tsx#handleConnectEnd`.

## Per-node Declarations

| Node | `outputDataType` | `inputDataTypes` |
|---|---|---|
| `upload` 上传图片 | `'image'` | `[]` |
| `imageEdit` AI 图片 | `'image'` | `['image']` |
| `storyboardSplit` 切割结果 | `'image-set'` | `['image']` |
| `storyboardGen` 分镜生成 | `'image-set'` | `['text', 'image']` |
| `videoGen` AI 视频 | `'video'` | `['image', 'text']` |
| `videoAnalysis` 视频分析 | `'image-set'` | `['video']` |
| `novelInput` 小说输入 | `'text'` | `[]` |
| `textAnnotation` 文本注释 | `null` | `[]` |
| `group` 分组 | `null` | `[]` |

## Connection Matrix

✓ = valid (matches by data type); ✗ = rejected.

| **Source → \ Target →** | imageEdit | storyboardSplit | storyboardGen | videoGen | videoAnalysis |
|---|:-:|:-:|:-:|:-:|:-:|
| **upload** (image) | ✓ | ✓ | ✓ | ✓ | ✗ (video only) |
| **imageEdit** (image) | ✓ (chain) | ✓ | ✓ | ✓ | ✗ |
| **storyboardSplit** (image-set) | ✓ (widening) | — | ✓ (widening) | ✓ (widening) | ✗ |
| **storyboardGen** (image-set) | ✓ (widening) | ✓ (widening) | — | ✓ (widening) | ✗ |
| **videoAnalysis** (image-set) | ✓ (widening) | ✓ (widening) | ✓ (widening) | ✓ (widening) | — |
| **novelInput** (text) | ✗ | ✗ | ✓ | ✓ | ✗ |
| **videoGen** (video) | ✗ | ✗ | ✗ | ✗ | ✓ |

## Design Notes

- **image → image flow**: chaining edits (upload → imageEdit → another imageEdit → …)
  is the core image workflow.
- **text → generator**: `novelInput`'s scene text feeds `storyboardGen` scenes
  or `videoGen` prompts. It can not feed `imageEdit` (which is image-only).
- **video → analyzer only**: video is a terminal data type that can only
  re-enter the graph via `videoAnalysis` (which extracts frames + reverse
  prompts, restarting the chain as `'image-set'`).
- **image-set widening**: A multi-frame producer feeds downstream consumers
  that expect a single image. The consumer treats each frame independently.
- **textAnnotation / group**: deliberately have no data flow — pure
  organisational decoration on the canvas.

## Adding a New Node Type

1. Declare `outputDataType` and `inputDataTypes` in its `nodeRegistry` definition.
2. Set `sourceHandle` / `targetHandle` to match (must be `true` when the
   corresponding data array / output type is non-null).
3. No special cases needed — the validator generalises automatically.
4. Add a row to the matrix above (and verify the matrix still reads correctly).
