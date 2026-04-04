# N7: Storyboard Batch Generation Enhancement

## Goal
Upgrade StoryboardGenNode with batch generation, first/last frame control, and multi-reference support.

## Tasks

### N7.1 Data Structure Extension
- [ ] TDD: Write tests for StoryboardGenFrameItem extensions
- [ ] Extend StoryboardGenFrameItem with startFrame/endFrame/referenceImageUrls/referenceWeights
- [ ] Verify: tsc --noEmit + vitest run

### N7.2 Batch Generate Logic
- [ ] TDD: Write tests for batch generation
- [ ] Implement batchGenerate() in StoryboardGenNode
- [ ] Add batch progress tracking
- [ ] Add batch UI (button + progress bar)
- [ ] Verify: tsc --noEmit + vitest run

### N7.3 Frame Reference Editor
- [ ] Create FrameReferenceEditor.tsx (multi-image upload + weight sliders)
- [ ] Create FrameControlEditor.tsx (start/end frame controls)
- [ ] Integrate into StoryboardGenNode grid cells
- [ ] Add i18n keys (zh + en)
- [ ] Verify: tsc --noEmit + vitest run
