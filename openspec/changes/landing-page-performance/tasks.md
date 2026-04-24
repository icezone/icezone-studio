## 1. Video Preload Optimization

- [x] 1.1 Add `preload="metadata"` to the `<video>` element in `src/components/landing/VideoHero.tsx`
- [x] 1.2 Add video refs array to `SceneShowcase` to track which slides have had `src` assigned
- [x] 1.3 Implement lazy src assignment in `SceneShowcase`: only assign `src` when a slide becomes active for the first time (track with a `Set` of loaded indices)
- [x] 1.4 Ensure `src` is assigned immediately on tab click (not deferred to next render) so playback starts without blank frame
- [x] 1.5 Verify inactive video elements have no `src` on initial load in browser DevTools Network tab

## 2. Animation GPU Compositing

- [x] 2.1 Update `@keyframes marquee-x` in `src/app/globals.css` to use `translate3d(X, 0, 0)` instead of `translateX(X)`
- [x] 2.2 Add `will-change: transform` to the marquee track element in `ModelMarquee.tsx` (already present — verify it's on the animated element, not a wrapper)
- [x] 2.3 Verify `float-card` keyframe in `globals.css` uses `translate3d` for GPU compositing

## 3. Image Lazy Loading

- [x] 3.1 Add `loading="lazy"` to all `<Image>` components in `src/components/landing/TemplateShowcase.tsx`
- [x] 3.2 Add `loading="lazy"` to all `<Image>` components in `src/components/landing/StartCreating.tsx`
- [x] 3.3 Add `loading="lazy"` to all `<Image>` components in `src/components/landing/WhyIceZone.tsx`
- [x] 3.4 Confirm above-fold images (VideoHero poster, LandingNav logo) are NOT set to lazy

## 4. Shadow Simplification

- [x] 4.1 In `src/components/landing/LiveCanvasShowcase.tsx`, simplify node `boxShadow` styles — replace multi-layer shadows with a single shadow value on `UploadDemoNode`, `ImageEditDemoNode`, `VideoGenDemoNode`

## 5. Code Cleanup — Landing Components

- [x] 5.1 Remove unused `Image` import from `src/components/landing/VideoHero.tsx` (line 5)
- [x] 5.2 Delete `src/components/landing/_archive/CallToAction.tsx`
- [x] 5.3 Delete `src/components/landing/_archive/FeatureShowcase.tsx`

## 6. Code Cleanup — Canvas & Features

- [x] 6.1 Remove unused `i18n` variable from `src/features/canvas/nodes/ImageEditNode.tsx` (line 226)
- [x] 6.2 Remove unused `generateFrameId` from `src/features/canvas/nodes/StoryboardGenNode.tsx` (line 456) — grep first to confirm no references
- [x] 6.3 Remove unused `i18n` variable from `src/features/canvas/nodes/StoryboardGenNode.tsx` (line 550)
- [x] 6.4 Remove unused `frameLayout` variable from `src/features/canvas/nodes/StoryboardGenNode.tsx` (line 759)
- [x] 6.5 Remove unused `resolveFileExtension` from `src/features/canvas/application/imageData.ts` (line 174) — grep first to confirm no references
- [x] 6.6 Remove unused `UiButton` import from `src/features/canvas/ui/NodeUI.tsx` (line 7)
- [x] 6.7 Remove unused `totalWidth` variable from `src/features/canvas/ui/tool-editors/AnnotateToolEditor.tsx` (line 71)
- [x] 6.8 Remove unused `totalHeight` variable from `src/features/canvas/ui/tool-editors/AnnotateToolEditor.tsx` (line 106)
- [x] 6.9 Remove unused `packRevealFilePath` from `src/features/canvas/utils/projectStructure.ts` (line 449)

## 7. Code Cleanup — Test Files

- [x] 7.1 Remove unused `afterEach` import from `__tests__/unit/ai/analysis/novelAnalysisService.test.ts` (line 1)
- [x] 7.2 Remove unused `beforeEach` import from `__tests__/unit/canvas/storyboardBatchGenerate.test.ts` (line 1)
- [x] 7.3 Remove unused `ApiKeyErrorType` import from `__tests__/unit/keyRotation.test.ts` (line 6)

## 8. Verification

- [x] 8.1 Run `npm run build` — confirm no TypeScript or build errors
- [x] 8.2 Run `npm run lint` — confirm zero unused-variable warnings in modified files
- [x] 8.3 Run `npx vitest run` — confirm all tests still pass
- [x] 8.4 Open landing page in Chrome DevTools → Network tab → confirm only 1 scene video loads on initial render
- [x] 8.5 Commit: `git commit -m "perf: optimize landing page performance and remove dead code"`
- [x] 8.6 Push and verify CI passes
