# Findings

## Codebase Observations
- StoryboardGenFrameItem is in `src/features/canvas/domain/canvasNodes.ts` (line 118-122)
- Current fields: id, description, referenceIndex
- StoryboardGenNode.tsx was ~1700 lines before changes, now ~1960 lines (exceeds 1000-line threshold)
- AiGateway.submitGenerateImageJob already exists in ports.ts
- The node already supports single image reference via @-tag system

## Design Decisions
- Extracted batch generate logic into `storyboardBatchGenerate.ts` (pure functions, testable)
- Frame editors (FrameReferenceEditor, FrameControlEditor) are separate components
- Batch progress auto-clears after 3 seconds
- Frame control/reference icons only appear when incoming images exist

## File Size Warning
- StoryboardGenNode.tsx is at 1960 lines, well above the 1000-line split threshold
- The file was already 1700 lines before N7 changes
- A future refactoring task should extract: grid rendering, frame editing, batch generation UI into sub-components
- This is a pre-existing issue, not introduced by N7

## Pre-existing Test Failures
- `__tests__/api/assets-upload.test.ts` has 2 failing tests (need running Supabase server)
- Unrelated to N7 changes
