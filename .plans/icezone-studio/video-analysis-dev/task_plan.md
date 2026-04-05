# N1 Video Intelligence Analysis — Backend Task Plan

## Scope
Implement server-side scene detection and keyframe extraction for the `videoAnalysisNode`.

## Tasks

### N1.1 — Scene Detection Service
- [x] Define types in `src/server/video/analysis/types.ts`
- [x] Write unit tests `__tests__/unit/video/sceneDetector.test.ts`
- [x] Implement `src/server/video/analysis/sceneDetector.ts`
- [x] Write unit tests `__tests__/unit/video/frameExtractor.test.ts`
- [x] Implement `src/server/video/analysis/frameExtractor.ts`
- [x] Install `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg`

### N1.2 — API Route
- [x] Write API tests `__tests__/api/video-analyze.test.ts`
- [x] Implement `src/app/api/video/analyze/route.ts`
- [x] Extend `src/app/api/jobs/[id]/route.ts` to support `video_analysis` job type

## Acceptance Criteria
- All unit tests pass
- POST /api/video/analyze returns jobId for valid requests
- 401 for unauthenticated, 400 for invalid input
- Job polling returns scene detection results when complete
- `npx tsc --noEmit` passes
- `npx vitest run` passes
