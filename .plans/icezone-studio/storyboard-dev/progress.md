# Progress

## N7.1 Data Structure Extension
- Status: COMPLETE
- StoryboardGenFrameItem extended with startFrameUrl, endFrameUrl, startFrameMode, endFrameMode, referenceImageUrls, referenceWeights
- createDefaultStoryboardGenFrame() factory function added
- 7 unit tests pass

## N7.2 Batch Generate Logic
- Status: COMPLETE
- storyboardBatchGenerate.ts created with submitBatchJobs() and pollBatchJobs()
- Batch generate UI added to StoryboardGenNode (Zap button + progress bar)
- 6 unit tests pass
- handleBatchGenerate integrated in StoryboardGenNode

## N7.3 Frame Reference Editor
- Status: COMPLETE
- FrameReferenceEditor.tsx created (multi-image, weight sliders, add/remove)
- FrameControlEditor.tsx created (start/end frame, mode selector)
- Integrated into StoryboardGenNode grid cells (Film + Images icons)
- i18n keys added for zh.json and en.json
- i18n parity test passes

## Verification
- npx tsc --noEmit: PASS
- npx vitest run (canvas tests): 13/13 PASS
- npx vitest run (i18n parity): 3/3 PASS
- Full test suite: 225/227 pass (2 pre-existing API test failures unrelated to our changes)
