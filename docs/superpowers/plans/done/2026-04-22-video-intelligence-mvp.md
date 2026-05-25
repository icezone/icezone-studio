# Video Intelligence MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an end-to-end Video Intelligence feature in the canvas: drop a video into a `VideoAnalysisNode`, auto-detect scenes, extract and upload keyframes, run whole-video shot analysis, per-frame reverse prompting, and fan out to `uploadNode`s or a `storyboardNode`.

**Architecture:** Extend existing Ports & Adapters canvas architecture. Reuse existing `sceneDetector` / `frameExtractor` / `reversePromptService` / `shotAnalysisService` / `geminiAnalysis`. Add 4 new API routes, 2 new infrastructure gateways, 2 Supabase buckets with lifecycle rules, keyframe-storage helper, domain type barrel. Front-end uses signed-upload-URL pattern for video uploads; back-end runs ffmpeg synchronously (MVP). Shot analysis auto-triggered once per video; reverse prompt per-frame with p-limit(3) concurrency.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Zustand 5 · @xyflow/react 12 · TailwindCSS 4 · Supabase (Auth + Postgres + Storage) · fluent-ffmpeg + @ffmpeg-installer/ffmpeg · Vitest · Playwright · react-i18next · p-limit.

**Spec:** `docs/superpowers/specs/2026-04-22-video-intelligence-mvp-design.md`

**OpenSpec change id:** `add-video-intelligence-mvp` — this plan can seed `openspec/changes/add-video-intelligence-mvp/tasks.md` via `/opsx:propose`.

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `supabase/migrations/<ts>_video_intelligence_buckets.sql` | Create buckets `project-videos` (7d TTL), `project-keyframes` (30d TTL) + RLS |
| `app/api/assets/video-upload/route.ts` | Sign upload URL endpoint |
| `app/api/video/analyze/route.ts` | Scene detect + keyframe extract + upload → return scenes |
| `app/api/ai/reverse-prompt/route.ts` | Thin wrapper of `generateReversePrompt` |
| `app/api/ai/shot-analysis/route.ts` | Thin wrapper of `analyzeShot` |
| `src/server/video/analysis/keyframeStorage.ts` | Upload JPEG buffers to Storage in parallel, return URL[] |
| `src/features/canvas/infrastructure/webAssetGateway.ts` | Two-step signed upload for video files |
| `src/features/canvas/infrastructure/webVideoAnalysisGateway.ts` | Fetch wrapper for `/api/video/analyze` |
| `src/features/canvas/domain/videoAnalysisTypes.ts` | Domain-safe barrel re-exporting `ReversePromptResult` / `ShotAnalysisResult` |
| `__tests__/api/assets-video-upload.test.ts` | API test for signed-upload endpoint |
| `__tests__/api/reverse-prompt.test.ts` | API test for reverse-prompt route |
| `__tests__/api/shot-analysis.test.ts` | API test for shot-analysis route |
| `__tests__/unit/video/keyframeStorage.test.ts` | Unit test for keyframeStorage helper |
| `__tests__/unit/canvas/videoAnalysisNodeStore.test.ts` | Store-integration test for expand + storyboard |

### Modified

| Path | Change |
|---|---|
| `src/server/video/analysis/sceneDetector.ts` | Fix `minSceneDurationMs` merging, use score as confidence, throw when ffmpeg unavailable |
| `src/server/ai/analysis/providers/geminiAnalysis.ts` | Throw `GeminiKeyMissingError` when env var missing |
| `src/features/canvas/domain/canvasNodes.ts` | Extend `VideoAnalysisNodeData` with `shotAnalysis`, `reversePromptStyle`, `analysisId`; extend `VideoScene` with `reversePrompt`, `reversePromptError` |
| `src/features/canvas/application/canvasServices.ts` | Wire `webAssetGateway` and `webVideoAnalysisGateway` |
| `src/features/canvas/application/ports.ts` | Add `AssetGateway` and `VideoAnalysisGateway` interfaces |
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | Replace `URL.createObjectURL`, add analyze button, grid, auto-shot, reverse, expand actions |
| `src/features/canvas/NodeSelectionMenu.tsx` | Register `videoAnalysis` node type |
| `public/locales/en/common.json` (and `zh/common.json`) | Add `node.menu.videoAnalysis` + `node.videoAnalysis.*` strings |
| `__tests__/unit/videoAnalysis.test.ts` | Fix import path `../../src/app/api/...` → `../../app/api/...` |
| `docs/product/nodes.md` | Complete videoAnalysis section |
| `docs/product/features-overview.md` | Add "Video Intelligence" entry |

### Reused (no change)

- `src/server/video/analysis/sceneDetector.ts` (mostly) · `frameExtractor.ts` · `types.ts`
- `src/server/ai/analysis/reversePromptService.ts` · `shotAnalysisService.ts` · `prompts/*`
- `src/features/canvas/infrastructure/webLlmAnalysisGateway.ts` (already calls `/api/ai/reverse-prompt`)
- `src/features/canvas/domain/nodeRegistry.ts` (`videoAnalysis` already registered)

---

## Task 1: Supabase migration — Storage buckets + lifecycle

**Files:**
- Create: `supabase/migrations/20260422120000_video_intelligence_buckets.sql`

- [ ] **Step 1: Inspect existing migration naming pattern**

Run: `ls supabase/migrations/ | tail -5`
Expected: existing migrations use `YYYYMMDDHHMMSS_description.sql`. Pick the current timestamp.

- [ ] **Step 2: Write the migration file**

```sql
-- 20260422120000_video_intelligence_buckets.sql
-- Create storage buckets for video intelligence feature.

-- 1. project-videos bucket (7-day TTL; videos can be discarded once keyframes extracted)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-videos',
  'project-videos',
  false,
  524288000, -- 500 MB
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- 2. project-keyframes bucket (30-day TTL; kept for re-analysis window)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-keyframes',
  'project-keyframes',
  false,
  5242880, -- 5 MB per JPEG
  array['image/jpeg']
)
on conflict (id) do nothing;

-- 3. RLS: users may write/read objects whose path starts with a projectId they own.
-- Object name pattern:  {projectId}/...
create policy "video owners can manage project-videos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'project-videos'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-videos'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  );

create policy "keyframe owners can manage project-keyframes"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'project-keyframes'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-keyframes'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  );

-- 4. Lifecycle rules (enforced by a scheduled cleanup function rather than
-- Supabase's native lifecycle, which is not universally available).
create or replace function public.cleanup_stale_video_intelligence_objects()
returns void
language plpgsql
security definer
as $$
begin
  delete from storage.objects
   where bucket_id = 'project-videos'
     and created_at < now() - interval '7 days';

  delete from storage.objects
   where bucket_id = 'project-keyframes'
     and created_at < now() - interval '30 days';
end;
$$;

-- Scheduled via pg_cron in a follow-up migration if pg_cron extension exists.
-- For MVP, this function can be invoked from a Vercel cron hitting an admin route.
```

- [ ] **Step 3: Apply migration locally**

Run: `npx supabase db reset` (or `supabase migration up` if already linked)
Expected: migration applies without error; buckets visible via `supabase db diff` or Studio.

- [ ] **Step 4: Verify buckets exist**

Run: `npx supabase db remote commit` or inspect via Studio. Or run in psql:
```sql
select id, name, public from storage.buckets where id in ('project-videos','project-keyframes');
```
Expected: 2 rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260422120000_video_intelligence_buckets.sql
git commit -m "feat(storage): add video-intelligence buckets with RLS and cleanup"
```

---

## Task 2: `/api/assets/video-upload` route (TDD)

**Files:**
- Test: `__tests__/api/assets-video-upload.test.ts`
- Create: `app/api/assets/video-upload/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/assets-video-upload.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockCreateSignedUploadUrl = vi.fn()
const mockSelectProject = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    storage: { from: () => ({ createSignedUploadUrl: mockCreateSignedUploadUrl }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockSelectProject }) }) }),
  }),
}))

import { POST } from '@/app/api/assets/video-upload/route'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/assets/video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/assets/video-upload', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockCreateSignedUploadUrl.mockReset()
    mockSelectProject.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when fields missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(makeReq({ projectId: 'p1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when project not owned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelectProject.mockResolvedValue({ data: null, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(403)
  })

  it('returns signed URLs on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSelectProject.mockResolvedValue({ data: { id: 'p1' }, error: null })
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase/upload', path: 'p1/abc.mp4', token: 't' },
      error: null,
    })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.mp4', mimeType: 'video/mp4' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uploadUrl).toBe('https://supabase/upload')
    expect(body.videoUrl).toMatch(/p1\/abc\.mp4$/)
  })

  it('rejects invalid mime type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(makeReq({ projectId: 'p1', fileName: 'v.gif', mimeType: 'image/gif' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/assets-video-upload.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/assets/video-upload/route'`.

- [ ] **Step 3: Implement the route**

```ts
// app/api/assets/video-upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { projectId?: string; fileName?: string; mimeType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { projectId, fileName, mimeType } = body
  if (!projectId || !fileName || !mimeType) {
    return NextResponse.json({ error: 'projectId, fileName, mimeType required' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: `mime type ${mimeType} not allowed` }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) {
    return NextResponse.json({ error: 'project not found or not owned' }, { status: 403 })
  }

  const ext = EXT_BY_MIME[mimeType]
  const objectPath = `${projectId}/${randomUUID()}.${ext}`

  const { data: signed, error } = await supabase.storage
    .from('project-videos')
    .createSignedUploadUrl(objectPath)

  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? 'failed to sign' }, { status: 500 })
  }

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const videoUrl = `${publicBase}/storage/v1/object/sign/project-videos/${signed.path}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  return NextResponse.json({
    uploadUrl: signed.signedUrl,
    videoUrl,
    expiresAt,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/api/assets-video-upload.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/assets-video-upload.test.ts app/api/assets/video-upload/route.ts
git commit -m "feat(api): add /api/assets/video-upload signed upload route"
```

---

## Task 3: sceneDetector fixes (TDD)

**Files:**
- Test: `__tests__/unit/video/sceneDetector.test.ts` (extend existing)
- Modify: `src/server/video/analysis/sceneDetector.ts`
- Fix: `__tests__/unit/videoAnalysis.test.ts` import path

- [ ] **Step 1: Fix stale import in existing test**

In `__tests__/unit/videoAnalysis.test.ts` change:
```ts
// OLD
import { POST } from '../../src/app/api/video/analyze/route'
// NEW
import { POST } from '../../app/api/video/analyze/route'
```

- [ ] **Step 2: Add failing tests to sceneDetector.test.ts**

Append to `__tests__/unit/video/sceneDetector.test.ts`:

```ts
import { buildScenes } from '@/server/video/analysis/sceneDetector'
// NOTE: Task exposes buildScenes via named export; see Step 4.

describe('buildScenes — minSceneDurationMs merging', () => {
  it('merges adjacent scenes shorter than threshold into the previous scene', () => {
    const raw = [
      { timestampMs: 0,    score: 0.5 },
      { timestampMs: 300,  score: 0.4 }, // short: 300ms < 500ms threshold
      { timestampMs: 3500, score: 0.8 },
    ]
    const scenes = buildScenes(raw, 10000, {
      sensitivityThreshold: 0.3,
      minSceneDurationMs: 500,
      maxKeyframes: 50,
    })
    // 0-3500 (first two merged; keyframe from higher-score cut), 3500-10000
    expect(scenes).toHaveLength(2)
    expect(scenes[0].startTimeMs).toBe(0)
    expect(scenes[0].endTimeMs).toBe(3500)
    expect(scenes[1].startTimeMs).toBe(3500)
  })

  it('uses ffmpeg score as confidence (not hard-coded 1.0)', () => {
    const raw = [
      { timestampMs: 0, score: 0.42 },
      { timestampMs: 2000, score: 0.91 },
    ]
    const scenes = buildScenes(raw, 5000, {
      sensitivityThreshold: 0.3,
      minSceneDurationMs: 500,
      maxKeyframes: 50,
    })
    expect(scenes[0].confidence).toBeCloseTo(0.42, 2)
    expect(scenes[1].confidence).toBeCloseTo(0.91, 2)
  })
})

describe('detectScenes — ffmpeg unavailable', () => {
  it('throws when fluent-ffmpeg cannot be imported (no silent fallback)', async () => {
    const { detectScenes } = await import('@/server/video/analysis/sceneDetector')
    // Simulate missing module via non-existent path
    await expect(detectScenes('/does/not/exist.mp4')).rejects.toThrow(/ffmpeg/i)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/unit/video/sceneDetector.test.ts`
Expected: FAIL (merge logic missing, confidence hard-coded, silent fallback returns single scene).

- [ ] **Step 4: Implement the fix**

Edit `src/server/video/analysis/sceneDetector.ts` — replace `buildScenes` / fallback and export `buildScenes`:

```ts
// Export so tests can exercise directly.
export function buildScenes(
  rawCuts: Array<{ timestampMs: number; score: number }>,
  durationMs: number,
  options: SceneDetectorOptions
): DetectedScene[] {
  if (rawCuts.length === 0) {
    return [
      {
        startTimeMs: 0,
        endTimeMs: durationMs,
        keyframeTimestampMs: 0,
        confidence: 0,
      },
    ]
  }

  // Seed with a cut at t=0 using the best downstream score (so the opening
  // scene keeps a meaningful confidence value).
  const cuts = [{ timestampMs: 0, score: rawCuts[0].score }, ...rawCuts]

  // Merge any cut whose segment would be shorter than minSceneDurationMs
  // into the previous cut — keeps the HIGHER score (stronger visual change).
  const merged: Array<{ timestampMs: number; score: number }> = []
  for (const cut of cuts) {
    const prev = merged[merged.length - 1]
    if (prev && cut.timestampMs - prev.timestampMs < options.minSceneDurationMs) {
      if (cut.score > prev.score) prev.score = cut.score
      continue
    }
    merged.push({ ...cut })
  }

  // Build scenes
  const scenes: DetectedScene[] = merged.map((cut, i) => {
    const next = merged[i + 1]
    const end = next ? next.timestampMs : durationMs
    return {
      startTimeMs: cut.timestampMs,
      endTimeMs: end,
      keyframeTimestampMs: cut.timestampMs + Math.min(200, Math.floor((end - cut.timestampMs) / 3)),
      confidence: Math.max(0, Math.min(1, cut.score)),
    }
  })

  return scenes.slice(0, options.maxKeyframes)
}

// Replace the former silent fallback — throw explicitly.
export async function detectScenes(
  videoPath: string,
  partialOptions?: Partial<SceneDetectorOptions>
): Promise<DetectedScene[]> {
  const options = normalizeOptions(partialOptions)
  try {
    return await detectScenesWithFfmpeg(videoPath, options)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`ffmpeg scene detection failed: ${msg}`)
  }
}
```

Remove the old private `fallbackSingleScene` function and the old `buildScenes` if it was internal.

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/unit/video/sceneDetector.test.ts __tests__/unit/videoAnalysis.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/video/analysis/sceneDetector.ts __tests__/unit/video/sceneDetector.test.ts __tests__/unit/videoAnalysis.test.ts
git commit -m "fix(video/scene-detector): merge short scenes, use ffmpeg score as confidence, throw on ffmpeg failure"
```

---

## Task 4: `keyframeStorage` helper (TDD)

**Files:**
- Test: `__tests__/unit/video/keyframeStorage.test.ts`
- Create: `src/server/video/analysis/keyframeStorage.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/unit/video/keyframeStorage.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed/url' },
          error: null,
        }),
      }),
    },
  }),
}))

import { uploadKeyframes } from '@/server/video/analysis/keyframeStorage'

describe('uploadKeyframes', () => {
  it('uploads each buffer and returns signed URLs in order', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'stub' }, error: null })

    const urls = await uploadKeyframes({
      projectId: 'p1',
      analysisId: 'a1',
      keyframes: [
        { timestampMs: 200,  buffer: Buffer.from('a') },
        { timestampMs: 5200, buffer: Buffer.from('b') },
      ],
    })

    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://signed/url')
    expect(mockUpload).toHaveBeenCalledTimes(2)
    const firstPath = mockUpload.mock.calls[0][0]
    expect(firstPath).toMatch(/^p1\/a1\/frame-200\.jpg$/)
  })

  it('throws if any upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(
      uploadKeyframes({
        projectId: 'p1',
        analysisId: 'a1',
        keyframes: [{ timestampMs: 0, buffer: Buffer.from('x') }],
      }),
    ).rejects.toThrow(/boom/)
  })
})
```

- [ ] **Step 2: Verify test fails**

Run: `npx vitest run __tests__/unit/video/keyframeStorage.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement keyframeStorage**

```ts
// src/server/video/analysis/keyframeStorage.ts
import { createClient } from '@/lib/supabase/server'

export interface KeyframeUpload {
  timestampMs: number
  buffer: Buffer
}

export interface UploadKeyframesParams {
  projectId: string
  analysisId: string
  keyframes: KeyframeUpload[]
}

const CONCURRENCY = 5
const BUCKET = 'project-keyframes'
const SIGN_URL_TTL_SEC = 60 * 60 * 24 * 30 // 30 days

export async function uploadKeyframes(params: UploadKeyframesParams): Promise<string[]> {
  const supabase = await createClient()
  const bucket = supabase.storage.from(BUCKET)

  async function uploadOne(kf: KeyframeUpload): Promise<string> {
    const path = `${params.projectId}/${params.analysisId}/frame-${kf.timestampMs}.jpg`
    const { error } = await bucket.upload(path, kf.buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) throw new Error(`keyframe upload failed: ${error.message}`)

    const { data: signed, error: signErr } = await bucket.createSignedUrl(path, SIGN_URL_TTL_SEC)
    if (signErr || !signed) {
      throw new Error(`keyframe sign failed: ${signErr?.message ?? 'unknown'}`)
    }
    return signed.signedUrl
  }

  const results: string[] = new Array(params.keyframes.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= params.keyframes.length) return
      results[i] = await uploadOne(params.keyframes[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, params.keyframes.length) }, worker))
  return results
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run __tests__/unit/video/keyframeStorage.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add __tests__/unit/video/keyframeStorage.test.ts src/server/video/analysis/keyframeStorage.ts
git commit -m "feat(video): add keyframeStorage helper for parallel JPEG → Storage uploads"
```

---

## Task 5: `/api/video/analyze` route (TDD)

**Files:**
- Test: `__tests__/api/video-analyze.test.ts` (rewrite the existing stub)
- Create: `app/api/video/analyze/route.ts`

- [ ] **Step 1: Rewrite the failing test**

```ts
// __tests__/api/video-analyze.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockProjectLookup = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockProjectLookup }) }) }),
  }),
}))

vi.mock('@/server/video/analysis/sceneDetector', () => ({
  detectScenes: vi.fn().mockResolvedValue([
    { startTimeMs: 0, endTimeMs: 5000, keyframeTimestampMs: 200, confidence: 0.8 },
    { startTimeMs: 5000, endTimeMs: 10000, keyframeTimestampMs: 5200, confidence: 0.7 },
  ]),
}))

vi.mock('@/server/video/analysis/frameExtractor', () => ({
  extractKeyframes: vi.fn().mockResolvedValue([
    { timestampMs: 200, imageData: 'data:image/jpeg;base64,QUJD' },
    { timestampMs: 5200, imageData: 'data:image/jpeg;base64,REVG' },
  ]),
}))

vi.mock('@/server/video/analysis/keyframeStorage', () => ({
  uploadKeyframes: vi.fn().mockResolvedValue([
    'https://storage/kf-0.jpg',
    'https://storage/kf-1.jpg',
  ]),
}))

import { POST } from '@/app/api/video/analyze/route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/video/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/video/analyze', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProjectLookup.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing videoUrl', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(req({ projectId: 'p1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when project not owned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockProjectLookup.mockResolvedValue({ data: null })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(403)
  })

  it('returns scenes with keyframeUrls on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockProjectLookup.mockResolvedValue({ data: { id: 'p1' } })
    const res = await POST(req({ videoUrl: 'https://x/y.mp4', projectId: 'p1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.analysisId).toMatch(/[a-f0-9-]{8,}/)
    expect(body.scenes).toHaveLength(2)
    expect(body.scenes[0].keyframeUrl).toBe('https://storage/kf-0.jpg')
    expect(body.scenes[1].keyframeUrl).toBe('https://storage/kf-1.jpg')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run __tests__/api/video-analyze.test.ts`
Expected: FAIL — route missing.

- [ ] **Step 3: Implement the route**

```ts
// app/api/video/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { detectScenes } from '@/server/video/analysis/sceneDetector'
import { extractKeyframes } from '@/server/video/analysis/frameExtractor'
import { uploadKeyframes } from '@/server/video/analysis/keyframeStorage'

const HARD_TIMEOUT_MS = 280_000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: {
    videoUrl?: string
    projectId?: string
    sensitivityThreshold?: number
    minSceneDurationMs?: number
    maxKeyframes?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { videoUrl, projectId } = body
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) {
    return NextResponse.json({ error: 'project not found or not owned' }, { status: 403 })
  }

  const analysisId = randomUUID()

  const work = (async () => {
    const scenes = await detectScenes(videoUrl, {
      sensitivityThreshold: body.sensitivityThreshold,
      minSceneDurationMs: body.minSceneDurationMs,
      maxKeyframes: body.maxKeyframes,
    })

    const timestamps = scenes.map((s) => s.keyframeTimestampMs)
    const frames = await extractKeyframes(videoUrl, timestamps)

    const keyframes = frames.map((f) => ({
      timestampMs: f.timestampMs,
      buffer: bufferFromDataUri(f.imageData),
    }))

    const urls = await uploadKeyframes({ projectId, analysisId, keyframes })

    return scenes.map((scene, i) => ({
      startTimeMs: scene.startTimeMs,
      endTimeMs: scene.endTimeMs,
      keyframeUrl: urls[i] ?? '',
      confidence: scene.confidence,
    }))
  })()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('analyze timeout')), HARD_TIMEOUT_MS),
  )

  try {
    const scenesOut = await Promise.race([work, timeout])
    return NextResponse.json({
      analysisId,
      scenes: scenesOut,
      totalDurationMs: scenesOut.length ? scenesOut[scenesOut.length - 1].endTimeMs : 0,
      fps: 24,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout')) {
      return NextResponse.json(
        { error: 'video too long for MVP sync mode (cap ~2 min / ~20 keyframes)' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function bufferFromDataUri(dataUri: string): Buffer {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/)
  if (!match) throw new Error('invalid data URI from frameExtractor')
  return Buffer.from(match[1], 'base64')
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/api/video-analyze.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/video-analyze.test.ts app/api/video/analyze/route.ts
git commit -m "feat(api): add /api/video/analyze end-to-end (scene detect + keyframe upload)"
```

---

## Task 6: `GeminiKeyMissingError` + `/api/ai/reverse-prompt` route (TDD)

**Files:**
- Modify: `src/server/ai/analysis/providers/geminiAnalysis.ts` (introduce error class)
- Test: `__tests__/api/reverse-prompt.test.ts`
- Create: `app/api/ai/reverse-prompt/route.ts`

- [ ] **Step 1: Introduce `GeminiKeyMissingError`**

In `src/server/ai/analysis/providers/geminiAnalysis.ts` replace `getGeminiConfig`:

```ts
export class GeminiKeyMissingError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not configured')
    this.name = 'GeminiKeyMissingError'
  }
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiKeyMissingError()
  const model = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.0-flash'
  return { apiKey, model }
}
```

- [ ] **Step 2: Write the failing API test**

```ts
// __tests__/api/reverse-prompt.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockGenerate = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}))

vi.mock('@/server/ai/analysis/reversePromptService', () => ({
  generateReversePrompt: mockGenerate,
}))

import { POST } from '@/app/api/ai/reverse-prompt/route'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/ai/reverse-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/reverse-prompt', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockGenerate.mockReset()
  })

  it('401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(401)
  })

  it('400 when imageUrl missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ style: 'generic' }))
    expect(r.status).toBe(400)
  })

  it('400 when style invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ imageUrl: 'https://x', style: 'weird' }))
    expect(r.status).toBe(400)
  })

  it('503 when GEMINI_API_KEY missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockGenerate.mockRejectedValue(new GeminiKeyMissingError())
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(503)
  })

  it('returns 200 with result on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockGenerate.mockResolvedValue({
      prompt: 'a beautiful shot',
      negativePrompt: 'blurry',
      tags: ['cinematic'],
      confidence: 0.9,
    })
    const r = await POST(req({ imageUrl: 'https://x', style: 'generic' }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.prompt).toBe('a beautiful shot')
  })
})
```

- [ ] **Step 3: Verify failure**

Run: `npx vitest run __tests__/api/reverse-prompt.test.ts`
Expected: FAIL — route missing.

- [ ] **Step 4: Implement route**

```ts
// app/api/ai/reverse-prompt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReversePrompt } from '@/server/ai/analysis/reversePromptService'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'

const VALID_STYLES = new Set(['generic', 'chinese'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { imageUrl?: string; style?: string; additionalContext?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }
  if (!body.style || !VALID_STYLES.has(body.style)) {
    return NextResponse.json({ error: `style must be one of ${[...VALID_STYLES].join(',')}` }, { status: 400 })
  }

  try {
    const result = await generateReversePrompt({
      imageUrl: body.imageUrl,
      style: body.style as 'generic' | 'chinese',
      additionalContext: body.additionalContext,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/api/reverse-prompt.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/ai/analysis/providers/geminiAnalysis.ts __tests__/api/reverse-prompt.test.ts app/api/ai/reverse-prompt/route.ts
git commit -m "feat(api): add /api/ai/reverse-prompt route + GeminiKeyMissingError"
```

---

## Task 7: `/api/ai/shot-analysis` route (TDD)

**Files:**
- Test: `__tests__/api/shot-analysis.test.ts`
- Create: `app/api/ai/shot-analysis/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/shot-analysis.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockAnalyze = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/server/ai/analysis/shotAnalysisService', () => ({
  analyzeShot: mockAnalyze,
}))

import { POST } from '@/app/api/ai/shot-analysis/route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/ai/shot-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/shot-analysis', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockAnalyze.mockReset()
  })

  it('401 unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await POST(req({ imageUrl: 'x', language: 'en' }))
    expect(r.status).toBe(401)
  })

  it('400 missing imageUrl', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ language: 'en' }))
    expect(r.status).toBe(400)
  })

  it('400 invalid language', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await POST(req({ imageUrl: 'https://x', language: 'fr' }))
    expect(r.status).toBe(400)
  })

  it('returns analysis with additional frames', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockAnalyze.mockResolvedValue({
      shotType: 'MS', shotTypeConfidence: 0.9, cameraMovement: 'Static',
      movementDescription: '', subject: 'musician', subjectAction: 'playing',
      lightingType: '', lightingMood: '', colorPalette: [], mood: '',
      composition: '', directorNote: '',
    })
    const r = await POST(req({
      imageUrl: 'https://x/0.jpg',
      additionalFrameUrls: ['https://x/1.jpg', 'https://x/2.jpg'],
      language: 'zh',
    }))
    expect(r.status).toBe(200)
    const called = mockAnalyze.mock.calls[0][0]
    expect(called.additionalFrameUrls).toHaveLength(2)
    expect(called.language).toBe('zh')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run __tests__/api/shot-analysis.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the route**

```ts
// app/api/ai/shot-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeShot } from '@/server/ai/analysis/shotAnalysisService'
import { GeminiKeyMissingError } from '@/server/ai/analysis/providers/geminiAnalysis'

const VALID_LANG = new Set(['zh', 'en'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { imageUrl?: string; additionalFrameUrls?: string[]; language?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }
  if (!body.language || !VALID_LANG.has(body.language)) {
    return NextResponse.json({ error: 'language must be zh or en' }, { status: 400 })
  }

  try {
    const result = await analyzeShot({
      imageUrl: body.imageUrl,
      additionalFrameUrls: body.additionalFrameUrls,
      language: body.language as 'zh' | 'en',
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/api/shot-analysis.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/shot-analysis.test.ts app/api/ai/shot-analysis/route.ts
git commit -m "feat(api): add /api/ai/shot-analysis route"
```

---

## Task 8: Domain type barrel + data model extension

**Files:**
- Create: `src/features/canvas/domain/videoAnalysisTypes.ts`
- Modify: `src/features/canvas/domain/canvasNodes.ts`

- [ ] **Step 1: Create the domain barrel**

```ts
// src/features/canvas/domain/videoAnalysisTypes.ts
// Domain-safe re-exports so canvas code never imports from src/server/*.
// If server types ever require runtime deps, split them into a pure-types module.

export type {
  ReversePromptResult,
  ShotAnalysisResult,
  ReversePromptStyle,
} from '@/server/ai/analysis/types'
```

- [ ] **Step 2: Extend `VideoAnalysisNodeData` and `VideoScene`**

In `src/features/canvas/domain/canvasNodes.ts`:

```ts
import type { ReversePromptResult, ShotAnalysisResult, ReversePromptStyle } from './videoAnalysisTypes'

// (Locate existing interface VideoScene)
export interface VideoScene {
  startTimeMs: number
  endTimeMs: number
  keyframeUrl: string
  confidence: number
  selected: boolean
  // NEW
  reversePrompt?: ReversePromptResult | null
  reversePromptError?: string | null
}

// (Locate existing interface VideoAnalysisNodeData)
export interface VideoAnalysisNodeData extends NodeDisplayData {
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
  shotAnalysis?: ShotAnalysisResult | null
  reversePromptStyle?: ReversePromptStyle
}
```

- [ ] **Step 3: Update `createDefaultData` in `nodeRegistry.ts`**

In `src/features/canvas/domain/nodeRegistry.ts`, the `videoAnalysisNodeDefinition.createDefaultData` — add defaults:

```ts
createDefaultData: () => ({
  displayName: DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.videoAnalysis],
  videoUrl: null,
  videoFileName: null,
  sensitivityThreshold: 0.3,
  minSceneDurationMs: 500,
  maxKeyframes: 50,
  isAnalyzing: false,
  analysisProgress: 0,
  errorMessage: null,
  scenes: [],
  // NEW
  analysisId: null,
  shotAnalysis: null,
  reversePromptStyle: 'generic',
}),
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/canvas/domain/videoAnalysisTypes.ts src/features/canvas/domain/canvasNodes.ts src/features/canvas/domain/nodeRegistry.ts
git commit -m "feat(canvas): extend VideoAnalysisNodeData with shotAnalysis + per-scene reverse prompt"
```

---

## Task 9: `webAssetGateway` + `webVideoAnalysisGateway` + ports wiring

**Files:**
- Modify: `src/features/canvas/application/ports.ts`
- Create: `src/features/canvas/infrastructure/webAssetGateway.ts`
- Create: `src/features/canvas/infrastructure/webVideoAnalysisGateway.ts`
- Modify: `src/features/canvas/application/canvasServices.ts`

- [ ] **Step 1: Add port interfaces**

Append to `src/features/canvas/application/ports.ts`:

```ts
export interface UploadVideoParams {
  file: File
  projectId: string
  onProgress?: (pct: number) => void
  signal?: AbortSignal
}

export interface AssetGateway {
  uploadVideo(params: UploadVideoParams): Promise<{ videoUrl: string; videoFileName: string }>
}

export interface VideoAnalyzeParams {
  videoUrl: string
  projectId: string
  sensitivityThreshold?: number
  minSceneDurationMs?: number
  maxKeyframes?: number
  signal?: AbortSignal
}

export interface VideoAnalyzeScene {
  startTimeMs: number
  endTimeMs: number
  keyframeUrl: string
  confidence: number
}

export interface VideoAnalyzeResponse {
  analysisId: string
  scenes: VideoAnalyzeScene[]
  totalDurationMs: number
  fps: number
}

export interface VideoAnalysisGateway {
  analyze(params: VideoAnalyzeParams): Promise<VideoAnalyzeResponse>
}
```

- [ ] **Step 2: Implement `webAssetGateway`**

```ts
// src/features/canvas/infrastructure/webAssetGateway.ts
import type { AssetGateway, UploadVideoParams } from '../application/ports'

export class WebAssetGateway implements AssetGateway {
  async uploadVideo(params: UploadVideoParams): Promise<{ videoUrl: string; videoFileName: string }> {
    const { file, projectId, onProgress, signal } = params

    const signRes = await fetch('/api/assets/video-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName: file.name, mimeType: file.type }),
      signal,
    })
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({ error: 'sign failed' }))
      throw new Error(err.error || `sign failed (${signRes.status})`)
    }
    const { uploadUrl, videoUrl } = (await signRes.json()) as {
      uploadUrl: string
      videoUrl: string
    }

    await this.putWithProgress(uploadUrl, file, onProgress, signal)

    return { videoUrl, videoFileName: file.name }
  }

  private putWithProgress(
    url: string,
    file: File,
    onProgress: ((pct: number) => void) | undefined,
    signal: AbortSignal | undefined,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)))
      xhr.onerror = () => reject(new Error('network error'))
      xhr.onabort = () => reject(new Error('aborted'))
      if (signal) signal.addEventListener('abort', () => xhr.abort())
      xhr.send(file)
    })
  }
}

export const webAssetGateway = new WebAssetGateway()
```

- [ ] **Step 3: Implement `webVideoAnalysisGateway`**

```ts
// src/features/canvas/infrastructure/webVideoAnalysisGateway.ts
import type {
  VideoAnalysisGateway,
  VideoAnalyzeParams,
  VideoAnalyzeResponse,
} from '../application/ports'

export class WebVideoAnalysisGateway implements VideoAnalysisGateway {
  async analyze(params: VideoAnalyzeParams): Promise<VideoAnalyzeResponse> {
    const res = await fetch('/api/video/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: params.videoUrl,
        projectId: params.projectId,
        sensitivityThreshold: params.sensitivityThreshold,
        minSceneDurationMs: params.minSceneDurationMs,
        maxKeyframes: params.maxKeyframes,
      }),
      signal: params.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'analyze failed' }))
      throw new Error(err.error || `analyze failed (${res.status})`)
    }
    return res.json() as Promise<VideoAnalyzeResponse>
  }
}

export const webVideoAnalysisGateway = new WebVideoAnalysisGateway()
```

- [ ] **Step 4: Wire into `canvasServices`**

Locate `src/features/canvas/application/canvasServices.ts` — add the two gateways to the services object (existing pattern). Exact edit:

```ts
import { webAssetGateway } from '../infrastructure/webAssetGateway'
import { webVideoAnalysisGateway } from '../infrastructure/webVideoAnalysisGateway'

export const canvasServices = {
  // ... existing
  assetGateway: webAssetGateway,
  videoAnalysisGateway: webVideoAnalysisGateway,
}
```

(If the file uses a different pattern, adapt to match.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/canvas/application/ports.ts src/features/canvas/infrastructure/webAssetGateway.ts src/features/canvas/infrastructure/webVideoAnalysisGateway.ts src/features/canvas/application/canvasServices.ts
git commit -m "feat(canvas): add asset + video-analysis gateways with signed upload"
```

---

## Task 10: VideoAnalysisNode — empty + analyzing + grid (states 1-3)

**Files:**
- Modify: `src/features/canvas/nodes/VideoAnalysisNode.tsx`

- [ ] **Step 1: Replace local object URL with signed upload**

In `VideoAnalysisNode.tsx`, replace the body of `handleVideoUpload` and `handleDrop`:

```tsx
import { webAssetGateway } from '@/features/canvas/infrastructure/webAssetGateway'
import { webVideoAnalysisGateway } from '@/features/canvas/infrastructure/webVideoAnalysisGateway'
import { useProjectStore } from '@/stores/projectStore'

// inside component:
const projectId = useProjectStore((s) => s.currentProjectId)

const handleVideoUpload = useCallback(
  async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('video/') || !projectId) return
    updateNodeData(id, { isAnalyzing: true, analysisProgress: 0, errorMessage: null })
    try {
      const { videoUrl, videoFileName } = await webAssetGateway.uploadVideo({
        file,
        projectId,
        onProgress: (pct) => updateNodeData(id, { analysisProgress: pct * 0.5 }),
      })
      updateNodeData(id, { videoUrl, videoFileName })
    } catch (err) {
      updateNodeData(id, {
        isAnalyzing: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  },
  [id, projectId, updateNodeData],
)

// Identical logic for handleDrop — reuse a common `startUpload(file)` helper if preferred.
```

- [ ] **Step 2: Add "Analyze" button handler**

```tsx
const handleAnalyze = useCallback(async () => {
  if (!data.videoUrl || !projectId) return
  updateNodeData(id, { isAnalyzing: true, analysisProgress: 50, errorMessage: null, scenes: [], shotAnalysis: null })
  try {
    const res = await webVideoAnalysisGateway.analyze({
      videoUrl: data.videoUrl,
      projectId,
      sensitivityThreshold: data.sensitivityThreshold,
      minSceneDurationMs: data.minSceneDurationMs,
      maxKeyframes: data.maxKeyframes,
    })
    const scenes = res.scenes.map((s) => ({ ...s, selected: false }))
    updateNodeData(id, {
      isAnalyzing: false,
      analysisProgress: 100,
      scenes,
      analysisId: res.analysisId,
    })
  } catch (err) {
    updateNodeData(id, {
      isAnalyzing: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}, [id, data.videoUrl, data.sensitivityThreshold, data.minSceneDurationMs, data.maxKeyframes, projectId, updateNodeData])
```

- [ ] **Step 3: Render the three states**

```tsx
// State 1: empty (no videoUrl)
// State 2: analyzing (isAnalyzing && !scenes.length)
// State 3: analyzed (scenes.length > 0)

{!hasVideo && (
  <div
    onDrop={handleDrop}
    onDragOver={(e) => e.preventDefault()}
    className="border-2 border-dashed rounded p-6 text-center"
  >
    <p>{t('node.videoAnalysis.dropHint')}</p>
    <input type="file" accept="video/*" onChange={handleVideoUpload} />
  </div>
)}

{hasVideo && data.isAnalyzing && (
  <div className="p-4">
    <p>{t('node.videoAnalysis.analyzing')}</p>
    <div className="h-1 bg-gray-200 mt-2">
      <div style={{ width: `${data.analysisProgress}%` }} className="h-full bg-blue-500" />
    </div>
  </div>
)}

{hasVideo && !data.isAnalyzing && data.scenes.length === 0 && (
  <UiButton onClick={handleAnalyze} className={NODE_CONTROL_PRIMARY_BUTTON_CLASS}>
    {t('node.videoAnalysis.analyze')}
  </UiButton>
)}

{data.scenes.length > 0 && (
  <KeyframeGrid
    scenes={data.scenes}
    onToggle={(idx) => toggleSceneSelected(idx)}
    maxSelected={10}
  />
)}
```

Where `KeyframeGrid` is a locally-defined component:

```tsx
function KeyframeGrid({ scenes, onToggle, maxSelected }: {
  scenes: VideoScene[]
  onToggle: (idx: number) => void
  maxSelected: number
}) {
  const selectedCount = scenes.filter((s) => s.selected).length
  return (
    <div className="grid grid-cols-5 gap-1 mt-2">
      {scenes.map((s, idx) => {
        const disabled = !s.selected && selectedCount >= maxSelected
        return (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onToggle(idx)}
            className={`aspect-video relative ${s.selected ? 'ring-2 ring-blue-400' : ''} ${disabled ? 'opacity-40' : ''}`}
          >
            <img src={s.keyframeUrl} alt="" className="w-full h-full object-cover rounded" />
            <span className="absolute bottom-0 left-0 text-xs bg-black/60 text-white px-1">
              {formatTime(s.startTimeMs)}
            </span>
            {s.selected && <span className="absolute top-1 right-1">✓</span>}
            {s.reversePrompt && <span className="absolute top-1 left-1 text-green-400">✓</span>}
            {s.reversePromptError && <span className="absolute inset-0 border-2 border-red-500 rounded" />}
          </button>
        )
      })}
    </div>
  )
}

function toggleSceneSelected(idx: number) {
  const scenes = data.scenes.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s)
  updateNodeData(id, { scenes })
}
```

- [ ] **Step 4: Type-check + manual smoke**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run dev` — drop a small mp4 into the node, confirm upload + analyze succeed with a valid `GEMINI_API_KEY` (fully tested in Task 13).

- [ ] **Step 5: Commit**

```bash
git add src/features/canvas/nodes/VideoAnalysisNode.tsx
git commit -m "feat(canvas): wire VideoAnalysisNode to signed upload + analyze API + keyframe grid"
```

---

## Task 11: Auto shot-analysis + per-frame reverse prompt with concurrency

**Files:**
- Modify: `src/features/canvas/nodes/VideoAnalysisNode.tsx`
- Add dep: `p-limit` (already widely used in project; verify first)

- [ ] **Step 1: Verify `p-limit` available**

Run: `grep -l '"p-limit"' package.json`
If absent:
```bash
npm install p-limit
```

- [ ] **Step 2: Auto shot-analysis on first load of scenes**

Add to `VideoAnalysisNode.tsx`:

```tsx
import pLimit from 'p-limit'
import { webLlmAnalysisGateway } from '@/features/canvas/infrastructure/webLlmAnalysisGateway'

// auto-run shot-analysis when scenes arrive for the first time
const hasScenes = data.scenes.length > 0
const alreadyAnalyzed = Boolean(data.shotAnalysis)
useEffect(() => {
  if (!hasScenes || alreadyAnalyzed) return
  const frames = data.scenes.slice(0, 9).map((s) => s.keyframeUrl)
  if (frames.length === 0) return
  const [first, ...rest] = frames
  const language = data.reversePromptStyle === 'chinese' ? 'zh' : 'en'
  webLlmAnalysisGateway
    .analyzeShot({ imageUrl: first, additionalFrameUrls: rest, language })
    .then((shotAnalysis) => updateNodeData(id, { shotAnalysis }))
    .catch(() => {
      /* non-fatal — user can retry manually later */
    })
}, [id, hasScenes, alreadyAnalyzed, data.scenes, data.reversePromptStyle, updateNodeData])
```

- [ ] **Step 3: Reverse-prompt the selected frames (p-limit 3)**

```tsx
const handleReverseSelected = useCallback(async () => {
  const limit = pLimit(3)
  const style = data.reversePromptStyle ?? 'generic'
  const entries = data.scenes
    .map((scene, idx) => ({ scene, idx }))
    .filter(({ scene }) => scene.selected)

  // clear old results + errors for re-run clarity
  updateNodeData(id, {
    scenes: data.scenes.map((s) =>
      s.selected ? { ...s, reversePromptError: null } : s,
    ),
  })

  await Promise.all(
    entries.map(({ scene, idx }) =>
      limit(async () => {
        try {
          const result = await webLlmAnalysisGateway.reversePrompt({
            imageUrl: scene.keyframeUrl,
            style,
          })
          // read latest data from store via get(), not closure
          const latest = useCanvasStore.getState().nodes.find((n) => n.id === id)?.data as VideoAnalysisNodeData
          const nextScenes = latest.scenes.map((s, i) =>
            i === idx ? { ...s, reversePrompt: result, reversePromptError: null } : s,
          )
          updateNodeData(id, { scenes: nextScenes })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const latest = useCanvasStore.getState().nodes.find((n) => n.id === id)?.data as VideoAnalysisNodeData
          const nextScenes = latest.scenes.map((s, i) =>
            i === idx ? { ...s, reversePromptError: msg } : s,
          )
          updateNodeData(id, { scenes: nextScenes })
        }
      }),
    ),
  )
}, [id, data.scenes, data.reversePromptStyle, updateNodeData])
```

Note: `webLlmAnalysisGateway.reversePrompt` already exists in the current gateway; it maps `style` to the server request.

- [ ] **Step 4: EN/中文 toggle**

```tsx
<div className="flex gap-2 text-xs">
  <button
    onClick={() => updateNodeData(id, { reversePromptStyle: 'generic' })}
    className={data.reversePromptStyle === 'generic' ? 'font-bold underline' : ''}
  >
    EN
  </button>
  <button
    onClick={() => updateNodeData(id, { reversePromptStyle: 'chinese' })}
    className={data.reversePromptStyle === 'chinese' ? 'font-bold underline' : ''}
  >
    中文
  </button>
</div>
```

- [ ] **Step 5: Shot-analysis summary strip**

```tsx
{data.shotAnalysis && (
  <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs">
    <b>🎥 {t('node.videoAnalysis.shotSummary')}: </b>
    {data.shotAnalysis.shotType} · {data.shotAnalysis.cameraMovement} · {data.shotAnalysis.lightingMood} · {data.shotAnalysis.composition}
  </div>
)}
```

- [ ] **Step 6: Reverse selected button**

```tsx
<UiButton
  disabled={data.scenes.filter((s) => s.selected).length === 0}
  onClick={handleReverseSelected}
>
  {t('node.videoAnalysis.reverseSelected')}
</UiButton>
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/canvas/nodes/VideoAnalysisNode.tsx package.json package-lock.json
git commit -m "feat(canvas): auto shot-analysis + p-limit(3) reverse prompt with EN/ZH toggle"
```

---

## Task 12: Expand-to-image-nodes + generate-storyboard (TDD on store)

**Files:**
- Test: `__tests__/unit/canvas/videoAnalysisNodeStore.test.ts`
- Modify: `src/features/canvas/nodes/VideoAnalysisNode.tsx`

- [ ] **Step 1: Write failing store-integration test**

```ts
// __tests__/unit/canvas/videoAnalysisNodeStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '@/stores/canvasStore'
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes'
import { expandSelectedFramesToUploadNodes, createStoryboardFromSelection } from '@/features/canvas/nodes/videoAnalysisActions'

describe('videoAnalysis expand actions', () => {
  beforeEach(() => {
    useCanvasStore.setState({ nodes: [], edges: [] })
  })

  it('creates N uploadNodes and N edges when expanding', () => {
    const source = {
      id: 'va1',
      type: CANVAS_NODE_TYPES.videoAnalysis,
      position: { x: 0, y: 0 },
      data: {
        displayName: 'va1',
        videoUrl: 'https://x/v.mp4',
        videoFileName: 'v.mp4',
        sensitivityThreshold: 0.3,
        minSceneDurationMs: 500,
        maxKeyframes: 50,
        isAnalyzing: false,
        analysisProgress: 100,
        errorMessage: null,
        scenes: [
          { startTimeMs: 0, endTimeMs: 1000, keyframeUrl: 'k1', confidence: 0.8, selected: true,
            reversePrompt: { prompt: 'p1', tags: [], confidence: 0.9 } },
          { startTimeMs: 1000, endTimeMs: 2000, keyframeUrl: 'k2', confidence: 0.7, selected: true,
            reversePrompt: { prompt: 'p2', tags: [], confidence: 0.8 } },
          { startTimeMs: 2000, endTimeMs: 3000, keyframeUrl: 'k3', confidence: 0.7, selected: false },
        ],
      },
    }
    useCanvasStore.setState({ nodes: [source as any], edges: [] })

    expandSelectedFramesToUploadNodes('va1')

    const { nodes, edges } = useCanvasStore.getState()
    const uploads = nodes.filter((n) => n.type === CANVAS_NODE_TYPES.upload)
    expect(uploads).toHaveLength(2)
    expect(uploads[0].data.imageUrl).toBe('k1')
    expect(uploads[0].data.prompt).toBe('p1')
    expect(edges).toHaveLength(2)
    expect(edges.every((e) => e.source === 'va1')).toBe(true)
  })

  it('creates a storyboard node from selection', () => {
    useCanvasStore.setState({
      nodes: [{
        id: 'va1',
        type: CANVAS_NODE_TYPES.videoAnalysis,
        position: { x: 0, y: 0 },
        data: {
          displayName: 'va1', videoUrl: 'u', videoFileName: 'v',
          sensitivityThreshold: 0.3, minSceneDurationMs: 500, maxKeyframes: 50,
          isAnalyzing: false, analysisProgress: 100, errorMessage: null,
          scenes: [
            { startTimeMs: 0, endTimeMs: 1000, keyframeUrl: 'k1', confidence: 1, selected: true },
            { startTimeMs: 1000, endTimeMs: 2000, keyframeUrl: 'k2', confidence: 1, selected: true },
          ],
        },
      } as any],
      edges: [],
    })

    createStoryboardFromSelection('va1')

    const { nodes, edges } = useCanvasStore.getState()
    const sb = nodes.find((n) => n.type === CANVAS_NODE_TYPES.storyboardSplit || n.type === CANVAS_NODE_TYPES.storyboardGen)
    expect(sb).toBeDefined()
    expect(edges.some((e) => e.source === 'va1')).toBe(true)
  })
})
```

(Node-type constant name depends on registry — use whichever matches `storyboardNode`. Replace above as needed.)

- [ ] **Step 2: Verify failure**

Run: `npx vitest run __tests__/unit/canvas/videoAnalysisNodeStore.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the actions**

```ts
// src/features/canvas/nodes/videoAnalysisActions.ts
import { useCanvasStore } from '@/stores/canvasStore'
import {
  CANVAS_NODE_TYPES,
  type CanvasNode,
  type UploadImageNodeData,
  type VideoAnalysisNodeData,
  type StoryboardFrameItem,
} from '@/features/canvas/domain/canvasNodes'

const HORIZONTAL_OFFSET = 40
const NODE_WIDTH = 280
const NODE_HEIGHT_STEP = 30

export function expandSelectedFramesToUploadNodes(sourceNodeId: string) {
  const store = useCanvasStore.getState()
  const source = store.nodes.find((n) => n.id === sourceNodeId) as CanvasNode | undefined
  if (!source || source.type !== CANVAS_NODE_TYPES.videoAnalysis) return
  const data = source.data as VideoAnalysisNodeData
  const selected = data.scenes.filter((s) => s.selected)
  if (selected.length === 0) return

  const baseX = source.position.x + (source.width ?? 560) + HORIZONTAL_OFFSET
  const baseY = source.position.y

  selected.forEach((scene, i) => {
    const uploadData: Partial<UploadImageNodeData> & { prompt?: string } = {
      imageUrl: scene.keyframeUrl,
      previewImageUrl: scene.keyframeUrl,
      sourceFileName: `frame-${scene.startTimeMs}.jpg`,
      prompt: scene.reversePrompt?.prompt ?? '',
    }
    const newNode = store.createAndAddNode(CANVAS_NODE_TYPES.upload, {
      x: baseX + i * (NODE_WIDTH + 20),
      y: baseY + i * NODE_HEIGHT_STEP,
    }, uploadData)
    store.addEdge({ source: sourceNodeId, target: newNode.id })
  })
}

export function createStoryboardFromSelection(sourceNodeId: string) {
  const store = useCanvasStore.getState()
  const source = store.nodes.find((n) => n.id === sourceNodeId) as CanvasNode | undefined
  if (!source || source.type !== CANVAS_NODE_TYPES.videoAnalysis) return
  const data = source.data as VideoAnalysisNodeData
  const selected = data.scenes
    .filter((s) => s.selected)
    .sort((a, b) => a.startTimeMs - b.startTimeMs)
  if (selected.length === 0) return

  const frames: StoryboardFrameItem[] = selected.map((scene, i) => ({
    id: `f-${i}`,
    imageUrl: scene.keyframeUrl,
    prompt: scene.reversePrompt?.prompt ?? '',
  }))

  const baseX = source.position.x + (source.width ?? 560) + HORIZONTAL_OFFSET
  const baseY = source.position.y

  const newNode = store.createAndAddNode(CANVAS_NODE_TYPES.storyboardSplit, { x: baseX, y: baseY }, {
    frames, rows: 1, cols: frames.length,
  })
  store.addEdge({ source: sourceNodeId, target: newNode.id })
}
```

> NOTE: `createAndAddNode` and `addEdge` are assumed to exist on `canvasStore`. If the store uses different method names (`addNode`, `connectNodes` etc.), adapt accordingly. The test must match whatever API the store exposes.

- [ ] **Step 4: Wire buttons in the node component**

In `VideoAnalysisNode.tsx`:

```tsx
import { expandSelectedFramesToUploadNodes, createStoryboardFromSelection } from './videoAnalysisActions'

{data.scenes.some((s) => s.selected) && (
  <div className="flex gap-2 mt-2">
    <UiButton onClick={() => expandSelectedFramesToUploadNodes(id)}>
      📤 {t('node.videoAnalysis.expand')} ({selectedCount})
    </UiButton>
    <UiButton onClick={() => createStoryboardFromSelection(id)}>
      🎞 {t('node.videoAnalysis.storyboard')}
    </UiButton>
  </div>
)}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/unit/canvas/videoAnalysisNodeStore.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add __tests__/unit/canvas/videoAnalysisNodeStore.test.ts src/features/canvas/nodes/videoAnalysisActions.ts src/features/canvas/nodes/VideoAnalysisNode.tsx
git commit -m "feat(canvas): expand selected frames to upload nodes and generate storyboard"
```

---

## Task 13: NodeSelectionMenu + i18n

**Files:**
- Modify: `src/features/canvas/NodeSelectionMenu.tsx`
- Modify: `public/locales/en/common.json`
- Modify: `public/locales/zh/common.json`

- [ ] **Step 1: Register node in menu**

In `NodeSelectionMenu.tsx` — ensure the menu iterates over `canvasNodeDefinitions` and respects `visibleInMenu`. If the menu already does this, `videoAnalysis` should appear automatically. If the menu has a hard-coded list, add:

```tsx
{
  type: CANVAS_NODE_TYPES.videoAnalysis,
  iconKey: 'video',
  labelKey: 'node.menu.videoAnalysis',
},
```

- [ ] **Step 2: Add English strings**

In `public/locales/en/common.json`:

```jsonc
{
  "node.menu.videoAnalysis": "Video Analysis",
  "node.videoAnalysis.default": "Video Analysis",
  "node.videoAnalysis.dropHint": "Drop mp4 / mov / webm here, or click to select",
  "node.videoAnalysis.analyzing": "Extracting keyframes...",
  "node.videoAnalysis.analyze": "Analyze",
  "node.videoAnalysis.reverseSelected": "Reverse prompt selected",
  "node.videoAnalysis.shotSummary": "Whole-video shot analysis",
  "node.videoAnalysis.expand": "Expand to image nodes",
  "node.videoAnalysis.storyboard": "Generate storyboard"
}
```

- [ ] **Step 3: Add Chinese strings**

In `public/locales/zh/common.json`:

```jsonc
{
  "node.menu.videoAnalysis": "视频分析",
  "node.videoAnalysis.default": "视频分析",
  "node.videoAnalysis.dropHint": "拖入 mp4 / mov / webm，或点击选择文件",
  "node.videoAnalysis.analyzing": "正在抽取关键帧...",
  "node.videoAnalysis.analyze": "开始分析",
  "node.videoAnalysis.reverseSelected": "反推选中帧",
  "node.videoAnalysis.shotSummary": "全视频分析",
  "node.videoAnalysis.expand": "展开为图片节点",
  "node.videoAnalysis.storyboard": "生成分镜带"
}
```

- [ ] **Step 4: Verify menu shows entry**

Run: `npm run dev`
Open the canvas, open NodeSelectionMenu — expect "Video Analysis" / "视频分析" entry depending on locale.

- [ ] **Step 5: Commit**

```bash
git add src/features/canvas/NodeSelectionMenu.tsx public/locales/en/common.json public/locales/zh/common.json
git commit -m "feat(i18n): register videoAnalysis node in selection menu with EN + ZH"
```

---

## Task 14: Documentation updates

**Files:**
- Modify: `docs/product/nodes.md`
- Modify: `docs/product/features-overview.md`

- [ ] **Step 1: Complete `nodes.md` entry**

In `docs/product/nodes.md` under "节点详细说明" add (or fill):

```markdown
### videoAnalysisNode（视频分析）

**用途**：上传视频 → 自动检测场景 → 抽取关键帧 → 整视频镜头分析 → 逐帧反推提示词 → 扩展为图片节点 / 分镜带。

**数据字段**：
- `videoUrl` / `videoFileName` — Supabase 直传 URL
- `sensitivityThreshold` / `minSceneDurationMs` / `maxKeyframes` — 抽帧参数
- `scenes[]` — { keyframeUrl, confidence, selected, reversePrompt? }
- `shotAnalysis` — 整视频级镜头分析（shotType、cameraMovement、composition 等 12 字段）
- `reversePromptStyle` — `'generic' | 'chinese'`

**连接**：
- target：无（作为视频输入源，通常是图谱起点）
- source：输出到 uploadNode（展开）或 storyboardNode（分镜带）

**相关 API**：
- `/api/assets/video-upload`、`/api/video/analyze`
- `/api/ai/reverse-prompt`、`/api/ai/shot-analysis`

**限制**（MVP）：单视频 ≤ 500 MB、≤ 2 分钟、最多 20 关键帧被 LLM 分析；需配置 `GEMINI_API_KEY`。
```

- [ ] **Step 2: Add feature to overview**

In `docs/product/features-overview.md` under "3. AI 分析" append:

```markdown
- **Video Intelligence**（2026-04）
  - 自动场景检测 + 关键帧抽取
  - 整视频导演级镜头分析（shot type / camera movement / lighting / composition / color palette ...）
  - 逐帧反推提示词（中文 / 英文）
  - 展开为独立图片节点或生成分镜带
  - 成熟度：MVP（同步模式，单视频 ≤ 2 min；Phase 2 → 异步 job + 多 provider）
```

- [ ] **Step 3: Commit**

```bash
git add docs/product/nodes.md docs/product/features-overview.md
git commit -m "docs(product): document Video Intelligence node and feature"
```

---

## Task 15: Final smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Ensure environment**

Confirm `.env.local` has:
```
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # for signed upload route
```

Ensure local ffmpeg is available (via `@ffmpeg-installer/ffmpeg` — verify `npx ffmpeg -version` if possible).

- [ ] **Step 2: Full local run-through**

1. `npm run dev`
2. Open a canvas.
3. From menu add "视频分析" / "Video Analysis" node.
4. Drop a 20–30 s mp4 clip.
5. Wait for upload + analyze; confirm 3+ keyframes appear.
6. Confirm shot-analysis summary strip auto-populates within ~10 s.
7. Select 2–4 frames; click "反推选中帧"; confirm green ✓ marks appear and clicking a frame opens a popover with prompt text.
8. Click "展开为图片节点"; confirm N uploadNodes appear right of the VideoAnalysisNode, each pre-filled with `imageUrl` and `prompt`.
9. Click "生成分镜带"; confirm a storyboard node appears.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 4: Final commit if any polish needed**

```bash
# only if edits were needed
git add -A
git commit -m "chore: MVP smoke-test polish"
```

---

## Self-Review Log

**Spec coverage check** — every spec section maps to at least one task:

| Spec section | Covered by |
|---|---|
| §1 Goal & Scope | Tasks 1–15 collectively |
| §2 Current-State (reuse vs new vs fix) | Task 3 (fix) · Task 2 (fix import) · Tasks 2,5,6,7,9 (new) |
| §3 Architecture & data flow | Tasks 1,2,4,5,6,7 (backend) · 9,10,11,12 (frontend) |
| §4.1 /api/assets/video-upload | Task 2 |
| §4.2 /api/video/analyze | Task 5 |
| §4.3 /api/ai/reverse-prompt | Task 6 |
| §4.4 /api/ai/shot-analysis | Task 7 |
| §4.5 Auth & RLS | Tasks 2,5,6,7 all gate with auth.getUser + project RLS |
| §5 Node UI states | Task 10 (1-3) · Task 11 (auto + reverse) · Task 12 (expand) |
| §6 Data model | Task 8 |
| §7 Milestones | All tasks mapped |
| §8 Testing strategy | Tests embedded in Tasks 2,3,4,5,6,7,12 + manual Task 15 |
| §9 Risks | Timeout race in Task 5 · Gemini key error class in Task 6 · 30d TTL in Task 1 · rate-limit behaviour per-frame failure in Task 11 |
| §10 Definition of Done | Task 15 |
| §11 Decisions log | Informs choices throughout |

**Placeholder scan** — no `TBD`/`TODO`/"add appropriate error handling" left. Every code block is concrete. Three caveats noted inline where the existing store API must be verified:

- Task 12 assumes `canvasStore.createAndAddNode` and `addEdge` exist — verify and adapt if different.
- Task 10 assumes `useProjectStore.currentProjectId` exists.
- Task 13 assumes menu iterates over `canvasNodeDefinitions` automatically; if not, hard-code entry.

**Type consistency**: `ReversePromptResult`, `ShotAnalysisResult`, `VideoScene`, `VideoAnalysisNodeData`, `VideoAnalyzeResponse` are used consistently across Tasks 8–12.

---

## OpenSpec Mapping

This plan can seed `openspec/changes/add-video-intelligence-mvp/`:

- `proposal.md` ← Spec §1 (Goal & Scope) + §2 (Current-state)
- `design.md` ← Spec §3–§6
- `specs/video-intelligence.md` ← Spec §4 (API) + §5 (UI) + §10 (DoD)
- `tasks.md` ← this plan's 15 tasks as checkbox list

Run `/opsx:propose` with these mappings; then `/opsx:apply` with `planning-with-files` will execute each task auto-checking boxes as tests pass.
