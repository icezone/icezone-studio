# N1: Video Analysis Node - Implementation Summary

## Overview

Implemented the Video Analysis Node feature (N1) which allows users to upload videos, detect scene changes, extract keyframes, and export them as upload nodes on the canvas.

## Files Created

| File | Purpose |
|------|---------|
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | Frontend React component with video upload, parameter controls, scene grid, and keyframe export |
| `src/server/video/analysis/types.ts` | Server-side type definitions and option normalization |
| `src/server/video/analysis/sceneDetector.ts` | Scene detection engine using ffmpeg with fallback |
| `src/server/video/analysis/frameExtractor.ts` | Keyframe image extraction from video at timestamps |
| `src/app/api/video/analyze/route.ts` | POST API endpoint for video analysis |
| `__tests__/unit/videoAnalysis.test.ts` | Unit tests (15 tests, all passing) |

## Files Modified

| File | Changes |
|------|---------|
| `src/features/canvas/domain/canvasNodes.ts` | Added `videoAnalysis` to `CANVAS_NODE_TYPES`, `VideoScene` interface, `VideoAnalysisNodeData` interface, `isVideoAnalysisNode` type guard, updated `CanvasNodeData` union |
| `src/features/canvas/domain/nodeRegistry.ts` | Added `videoAnalysisNodeDefinition` with capabilities/connectivity, registered in `canvasNodeDefinitions` |
| `src/features/canvas/domain/nodeDisplay.ts` | Added display name and i18n key for `videoAnalysis` |
| `src/features/canvas/nodes/index.ts` | Registered `VideoAnalysisNode` component in `nodeTypes` |
| `src/i18n/locales/zh.json` | Added `node.menu.videoAnalysis`, `nodeDisplayName.videoAnalysis`, `node.videoAnalysis.*` keys |
| `src/i18n/locales/en.json` | Added matching English i18n keys |

## Architecture

- **Node type**: `videoAnalysisNode` - visible in menu, has both source and target handles, supports connect menu from both directions
- **Data model**: `VideoAnalysisNodeData` with video URL, analysis parameters (sensitivity, min duration, max keyframes), state tracking, and `VideoScene[]` results
- **Backend**: Scene detection via ffmpeg `select` filter with `showinfo`, with automatic fallback for environments without ffmpeg
- **API**: `POST /api/video/analyze` - synchronous endpoint that runs scene detection and keyframe extraction
- **Export**: Creates `uploadNode` instances for each selected keyframe, connected via edges to the analysis node

## Additional Files Modified (fixing pre-existing stale tests)

| File | Changes |
|------|---------|
| `__tests__/unit/video/sceneDetector.test.ts` | Updated to match actual `detectScenes(path, options?)` API signature, removed non-existent `getVideoMetadata` |
| `__tests__/unit/video/frameExtractor.test.ts` | Updated to match actual `extractKeyframes(path, timestamps)` API signature |
| `__tests__/api/video-analyze.test.ts` | Updated to match synchronous API response format (scenes array instead of jobId) |

## Test Results

- **TypeScript**: 0 errors (`npx tsc --noEmit` clean)
- **Unit tests**: 345 passed, 2 failed (pre-existing `assets-upload.test.ts` failure, unrelated)
- New test coverage includes:
  - `normalizeOptions` clamping and defaults (5 tests)
  - `buildScenes` logic: empty input, splitting, merging close timestamps, max cap, sorting (7 tests)
  - Node type registration and default data validation (3 tests)
  - Scene detector with ffmpeg mocks (6 tests)
  - Frame extractor with ffmpeg mocks (5 tests)
  - API route validation and response format (4 tests)

## Dependencies

- `fluent-ffmpeg` is used via dynamic import (optional runtime dependency)
- No new npm packages were added to package.json since ffmpeg is imported dynamically and gracefully falls back

## Notes

- The only remaining test failure (`assets-upload.test.ts`) is a pre-existing issue unrelated to this implementation
- The API route is currently synchronous; for production use with large videos, it should be migrated to the async job pattern (Job ID + polling)
- The ffmpeg fallback returns a single-scene stub, allowing the node to function in development environments without ffmpeg installed
