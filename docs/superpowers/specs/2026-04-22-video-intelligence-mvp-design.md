# Video Intelligence MVP — Design Spec

**Change ID:** `add-video-intelligence-mvp`
**Date:** 2026-04-22
**Status:** Draft — awaiting user review before implementation plan
**Related repo paths:** `src/features/canvas/nodes/VideoAnalysisNode.tsx`, `src/server/video/analysis/*`, `src/server/ai/analysis/*`, `app/api/video/*`, `app/api/ai/*`, `app/api/assets/*`

---

## 1. Goal & Scope

Deliver an end-to-end **Video Intelligence** feature on the canvas so users can:

1. Drop a video into a `VideoAnalysisNode`.
2. Automatically detect scenes and extract keyframes via ffmpeg.
3. See a one-shot whole-video cinematographic analysis (shot type, camera movement, lighting, composition, etc.).
4. Select keyframes and generate reverse prompts (Chinese / English) per frame.
5. Fan out results to either (a) a set of `uploadNode`s with image + prompt pre-filled, or (b) a `storyboardNode`.

### Why now

- Project already carries ~60% of the scaffolding (scene detector, frame extractor, reverse-prompt / shot-analysis services, Gemini provider, node UI, node type registered) but was never wired end-to-end because key API routes and storage glue are missing and no API key was configured during scaffolding.
- A single focused change unblocks the existing N2 (image reverse prompt) and N3 (shot analysis) dialogs as a side effect — all three share the same new routes.

### Out of scope (Phase 2, not this change)

- Multi-provider vision backends (OpenAI GPT-4.1/4o, Claude Sonnet 4.6/4.7, 豆包, Qwen-VL).
- Async job orchestration + Supabase Realtime progress push.
- BYOK user-supplied API key flow.
- In-node video preview player, timeline-style frame scrubbing.
- Chunked upload for > 500MB videos.
- Separate `video_analysis_results` table (current change piggybacks on canvas draft persistence).

---

## 2. Current-State Assessment

### Keep as-is (reuse)

| Path | Status |
|---|---|
| `src/server/video/analysis/sceneDetector.ts` | Good. ffmpeg `select='gt(scene,T)'` + showinfo. (Minor fixes in M2.) |
| `src/server/video/analysis/frameExtractor.ts` | Good. Per-timestamp seek + mjpeg pipe. |
| `src/server/video/analysis/types.ts` | Complete. |
| `src/server/ai/analysis/reversePromptService.ts` | Complete. Supports generic/chinese styles. |
| `src/server/ai/analysis/shotAnalysisService.ts` | Complete. Supports multi-frame for camera-movement inference. |
| `src/server/ai/analysis/prompts/*` | Complete; director-grade shot-analysis prompt template already written. |
| `src/server/ai/analysis/providers/geminiAnalysis.ts` | Complete (text / multimodal / vision entry points). |
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | ~16KB scaffold. Needs the URL.createObjectURL → upload swap. |
| `src/features/canvas/domain/canvasNodes.ts` (`VideoAnalysisNodeData`) | Complete. Needs an added `shotAnalysis` node-level field. |
| `src/features/canvas/domain/nodeRegistry.ts` | Registered. |
| Unit tests `sceneDetector.test.ts`, `frameExtractor.test.ts`, `reversePromptService.test.ts` | Pass (mocks used). |

### Bug fixes (M2)

| File | Issue |
|---|---|
| `sceneDetector.ts` (`buildScenes`) | `minSceneDurationMs` is not applied. Fix: merge any adjacent scene whose duration is below the threshold into the previous scene (keeps higher-confidence keyframe). |
| `sceneDetector.ts` | `confidence` is hard-coded 1.0; should be the ffmpeg scene score. |
| `sceneDetector.ts` | ffmpeg-unavailable path silently returns a single-scene stub, masking real failures. Should throw with a clear message. |
| `__tests__/unit/videoAnalysis.test.ts` | Import path has extra `src/` segment and will not resolve. |

### Missing (new)

| Item |
|---|
| `app/api/assets/video-upload/route.ts` (signed-upload URL endpoint) |
| `app/api/video/analyze/route.ts` |
| `app/api/ai/reverse-prompt/route.ts` |
| `app/api/ai/shot-analysis/route.ts` |
| Supabase buckets: `project-videos` (7d TTL), `project-keyframes` (30d TTL) |
| `src/features/canvas/infrastructure/webAssetGateway.ts` (video signed upload) |
| `src/features/canvas/infrastructure/webVideoAnalysisGateway.ts` |
| `src/server/video/analysis/keyframeStorage.ts` (buffer[] → Storage URL[]) |
| `NodeSelectionMenu` registration + i18n entries for `node.menu.videoAnalysis` and node strings |

---

## 3. Architecture & Data Flow

```
User drops video in VideoAnalysisNode
  │
  ├─ (0) POST /api/assets/video-upload  ────────→ returns { uploadUrl, videoUrl }
  │      browser PUTs file directly to Supabase Storage (project-videos)
  │
  ├─ (1) POST /api/video/analyze  { videoUrl, projectId, ... }  (sync)
  │      └─ server: detectScenes → extractKeyframes (JPEG buffers)
  │                → keyframeStorage.upload (project-keyframes)
  │                → returns { scenes: [{ startTimeMs, endTimeMs, keyframeUrl, confidence }] }
  │
  ├─ (2) Node renders keyframe grid. useEffect auto-triggers:
  │      POST /api/ai/shot-analysis { imageUrl: frames[0], additionalFrameUrls: frames[1..8], language }
  │      → result stored node-level at data.shotAnalysis (one per video, not per scene)
  │
  ├─ (3) User selects ≤10 frames, clicks "反推选中帧"
  │      Front-end loops with p-limit(3):
  │      POST /api/ai/reverse-prompt { imageUrl, style } per frame
  │      → result stored at scene.reversePrompt on each
  │
  └─ (4) User picks output action:
         - "展开为图片节点": each selected frame → new uploadNode
           (imageUrl=keyframeUrl, prompt=reversePrompt.prompt), edges connect
         - "生成分镜带": one storyboardNode with selected frames in time order
```

### Ports & Adapters wiring

```
VideoAnalysisNode  →  webAssetGateway (NEW)          → /api/assets/video-upload
                   →  webVideoAnalysisGateway (NEW)  → /api/video/analyze
                   →  webLlmAnalysisGateway (EXISTS)
                        ├→ /api/ai/reverse-prompt   (route NEW, service exists)
                        └→ /api/ai/shot-analysis    (route NEW, service exists)
```

### Storage layout

| Bucket | Path | TTL |
|---|---|---|
| `project-videos` | `{projectId}/{uuid}.{ext}` | 7 days (lifecycle rule) |
| `project-keyframes` | `{projectId}/{analysisId}/frame-{tsMs}.jpg` | 30 days (lifecycle rule) |

---

## 4. API Contracts

### 4.1 POST `/api/assets/video-upload`

Signed-upload-URL endpoint. Route signs a URL; browser `PUT`s the file directly to Supabase Storage.

**Request** (JSON):

```json
{ "projectId": "proj-uuid", "fileName": "scene.mp4", "mimeType": "video/mp4" }
```

**Response 200**:

```json
{
  "uploadUrl": "https://<project>.supabase.co/storage/v1/upload/sign/project-videos/...",
  "videoUrl":  "https://<project>.supabase.co/storage/v1/object/sign/project-videos/...",
  "expiresAt": "2026-04-22T12:00:00Z"
}
```

**Errors**: 401 unauth · 400 missing fields · 403 projectId not owned.

**Notes**: TTL on signed upload URL is 1 hour. Accepted MIME: `video/mp4`, `video/quicktime`, `video/webm`. Bucket max object size 500MB.

### 4.2 POST `/api/video/analyze`

Sync (for MVP). Internally races against 280s to leave 20s of Vercel budget for the response.

**Request**:

```json
{
  "videoUrl": "https://...",
  "projectId": "proj-uuid",
  "sensitivityThreshold": 0.3,
  "minSceneDurationMs": 500,
  "maxKeyframes": 50
}
```

**Response 200**:

```json
{
  "analysisId": "analysis-uuid",
  "scenes": [
    { "startTimeMs": 0, "endTimeMs": 5400, "keyframeUrl": "https://...", "confidence": 0.92 }
  ],
  "totalDurationMs": 127500,
  "fps": 24
}
```

**Errors**: 400 bad fields · 401 unauth · 422 unreachable videoUrl · 500 ffmpeg failed · 504 internal timeout (>280s).

### 4.3 POST `/api/ai/reverse-prompt`

Thin wrapper around `generateReversePrompt(params)`.

**Request**:

```json
{ "imageUrl": "https://...", "style": "generic" | "chinese", "additionalContext": "optional" }
```

**Response 200**:

```json
{ "prompt": "...", "negativePrompt": "...", "tags": ["..."], "confidence": 0.88 }
```

**Errors**: 400 bad fields · 401 unauth · 500 Gemini error · 503 `GEMINI_API_KEY` not configured.

### 4.4 POST `/api/ai/shot-analysis`

Thin wrapper around `analyzeShot(params)`. Called **once per video** from the node (not per-frame).

**Request**:

```json
{
  "imageUrl": "https://...keyframe-0.jpg",
  "additionalFrameUrls": ["https://...keyframe-1.jpg", "..."],
  "language": "zh" | "en"
}
```

**Response 200**: full shot-analysis JSON (12 fields: shotType, shotTypeConfidence, cameraMovement, movementDescription, subject, subjectAction, lightingType, lightingMood, colorPalette, mood, composition, directorNote).

**Errors**: 400 · 401 · 500 · 503.

### 4.5 Auth & RLS (all routes)

Supabase server client from cookie → `auth.getUser()` → 401 if missing. `projectId` checked against `projects` table RLS.

---

## 5. Node UI States

### State 1 — Empty
Drop zone for mp4/mov/webm; sensitivity slider (0.1–1.0, default 0.3); max-keyframes input (1–200, default 50).

### State 2 — Analyzing
Progress bar while signed upload + server analyze is in flight; Cancel button (AbortSignal into gateway).

### State 3 — Analyzed
- Keyframe grid (5 cols, aspect 16:9) with per-frame checkbox and timestamp label.
- Selected count indicator with 10-frame hard cap.
- Shot-analysis summary strip (auto-filled): `shotType · cameraMovement · lightingMood · composition`.
- Primary button "反推选中帧".
- EN / 中文 style toggle.

### State 4 — Reversed + Expanded
- Successfully reversed frames show ✓; failed ones show red border with hover-reason.
- Two output buttons:
  - **展开为图片节点 (N)**: creates N uploadNodes tiled horizontally to the right of the VideoAnalysisNode; each carries `{ imageUrl: keyframeUrl, prompt: reversePrompt.prompt }`; edges `VideoAnalysisNode.source → uploadNode.target`.
  - **生成分镜带**: creates one storyboardNode with selected frames in time order.

### Interaction details

- Clicking an already-reversed frame shows a lightweight popover with full `prompt`, `negativePrompt`, `tags`, `confidence` (can reuse `ReversePromptDialog`).
- Per-frame reverse-prompt failures do not block other frames (p-limit(3), exponential backoff retry once).
- If `videoUrl` changes, clear `scenes` and `shotAnalysis`.
- Auto-triggered shot analysis uses up to 9 keyframes (first + up to 8 additional).

---

## 6. Data Model

### `VideoAnalysisNodeData` additions

```ts
interface VideoAnalysisNodeData extends NodeDisplayData {
  // existing fields (unchanged)
  videoUrl: string | null
  videoFileName?: string | null
  sensitivityThreshold: number
  minSceneDurationMs: number
  maxKeyframes: number
  isAnalyzing: boolean
  analysisProgress: number
  errorMessage: string | null
  scenes: VideoScene[]

  // NEW
  analysisId?: string | null
  shotAnalysis?: ShotAnalysisResult | null   // node-level, whole-video
  reversePromptStyle?: 'generic' | 'chinese' // persisted user preference
}

interface VideoScene {
  startTimeMs: number
  endTimeMs: number
  keyframeUrl: string
  confidence: number
  selected: boolean
  // NEW
  reversePrompt?: ReversePromptResult | null
  reversePromptError?: string | null
}
```

Results persist via canvas draft (existing IndexedDB + Supabase pipeline). No new DB table in MVP.

**Type sharing**: `ReversePromptResult` and `ShotAnalysisResult` currently live in `src/server/ai/analysis/types.ts`. Since the canvas domain needs them, re-export both from a new domain-safe barrel `src/features/canvas/domain/videoAnalysisTypes.ts` (pure types, no runtime deps on server modules). Canvas code imports from the domain barrel, server code continues to import from `server/ai/analysis/types.ts`.

---

## 7. Milestones & Tasks

Single OpenSpec change `add-video-intelligence-mvp`; 8 milestones; ~4.6 days; TDD throughout.

| # | Milestone | Est | Depends |
|---|---|---|---|
| M1 | Supabase buckets + signed-upload route | 0.5d | — |
| M2 | sceneDetector bug fixes + test import fix | 0.3d | — |
| M3 | `/api/video/analyze` end-to-end (with keyframeStorage helper) | 1.0d | M1, M2 |
| M4 | `/api/ai/reverse-prompt` + `/api/ai/shot-analysis` routes | 0.5d | — |
| M5 | VideoAnalysisNode UI: upload + analyze + keyframe grid | 1.0d | M3 |
| M6 | Auto shot-analysis + reverse-prompt concurrency + popover | 0.5d | M4, M5 |
| M7 | Expand-to-image-nodes + generate-storyboard actions | 0.5d | M6 |
| M8 | NodeSelectionMenu registration + i18n + docs update | 0.3d | M1–M7 |

M1, M2, M4 can be committed in parallel (independent of each other).

### Key implementation points

- **M1**: `createSignedUploadUrl` via Supabase admin client; migration adds bucket + lifecycle rule. Verify Supabase Storage lifecycle rules are supported in hosted plan.
- **M3**: Wrap in `Promise.race` against a 280000ms timeout; keyframeStorage.upload uses `p-limit(5)`.
- **M5**: Drop `URL.createObjectURL` entirely — always upload first to get a server-reachable URL.
- **M7**: Node placement = current node position + `{ x: width + 40 + i * 300, y: i * 30 }` for the nth uploadNode (simple staircase). Reuse `addNode` + `addEdge` from canvasStore.

---

## 8. Testing Strategy

| Layer | Coverage | Files |
|---|---|---|
| Unit | sceneDetector fixes, keyframeStorage, gemini error mapping | 3 new/edited |
| API | 4 route files (401/400/422/503/success/timeout) | 4 new |
| Component | VideoAnalysisNode 4 states + store integration | 2 new |
| E2E (optional) | Full flow: drop → analyze → reverse → expand | 1 Playwright spec (requires live GEMINI_API_KEY; skip in CI) |

### TDD order (Red → Green)

1. sceneDetector minSceneDurationMs test → fix code.
2. `/api/video/analyze` test with mocked ffmpeg + Storage → write route.
3. `/api/ai/reverse-prompt` route test → write route.
4. `/api/ai/shot-analysis` route test → write route.
5. VideoAnalysisNode render + interaction tests → write UI.
6. Expand-to-image-nodes store test → write handler.

Coverage target: ≥80% line coverage on new/modified files (project standard).

---

## 9. Risks

| Severity | Risk | Mitigation |
|---|---|---|
| High | Vercel Functions 300s timeout on long videos | 280s internal race → 504 with "video too long for MVP sync mode"; docs cap MVP at ≤2 min / ≤20 keyframes |
| High | Gemini rate limits (15 RPM free) with p-limit(3) × 10 frames | Require paid tier; single retry with exponential backoff; per-frame failure does not block others |
| Medium | Supabase Storage cost for videos and keyframes | 7d / 30d lifecycle rules hard-coded in migration |
| Medium | ffmpeg availability on Vercel serverless runtime | Verify with a preview deploy after M3; fallback to Vercel Fluid Compute (Node 24) if needed |
| Medium | Signed upload URL TTL (1h) expires for large uploads | Clear UI error on expiry; user retries |
| Low | IndexedDB size from many reverse-prompt results | Accept in MVP; Phase 2 can move to dedicated table if needed |
| Low | User drops multiple video files | Take `files[0]`, toast the rest are ignored |
| Low | videoUrl signed-URL expires after analysis | Keep keyframeUrl + analysisId; re-upload on re-analyze |

---

## 10. Definition of Done

- All new/updated unit, API, and component tests pass (`npx vitest run`).
- `npx tsc --noEmit` returns 0 errors.
- `npm run lint` returns 0 warnings.
- Local end-to-end manual check: drop a 30s video → see 3+ keyframes → select 4 → reverse-prompt → expand to 4 uploadNodes with prompts pre-filled; edges connect correctly.
- Shot-analysis summary auto-appears.
- `node.menu.videoAnalysis` visible in NodeSelectionMenu with EN + ZH labels.
- `docs/product/nodes.md` and `docs/product/features-overview.md` updated.
- OpenSpec `add-video-intelligence-mvp/tasks.md` all checkboxes ticked.

---

## 11. Decisions Log

| # | Decision | Why |
|---|---|---|
| Q1 | Path C — incremental extension, not rewrite | ~60% scaffolding already high-quality; rewrite wastes prior work |
| Q2 | Video uploaded to Supabase Storage first | Server ffmpeg needs a reachable URL; avoids wasm constraints |
| Q3 | Hybrid: sync keyframe extract + front-end-concurrent LLM calls | Keeps each request short; avoids job-queue work in MVP |
| Q4 | Both: expand-as-imageNodes AND generate-storyboard | Users want both fan-out patterns |
| Q5 | env-var API key for MVP; BYOK deferred | Keeps change scope tight |
| Q6 | User manually selects up to 10 frames | Cost-predictable; rate-limit-friendly |
| Q7 | Reverse prompt per-frame; shot-analysis whole-video (1 call) | Matches cinematographic reality; saves cost |
| Q8 | Server extracts and uploads keyframes, returns URLs | Keeps payloads small; reusable cache |
| M1 (follow-up) | Shot analysis auto-triggered after keyframe extraction | Free-ish (1 call), better UX than manual button |
| M2 | Keyframe TTL = 30 days, video TTL = 7 days | Cost control; 30d covers re-analysis window, video no longer needed after keyframes extracted |
| M3 | Expanded image nodes tile horizontally right of VideoAnalysisNode | Natural dataflow direction left → right on canvas |
| API ① | Signed direct upload (not server multipart relay) | Avoids Vercel 4.5MB request-body hard limit |
