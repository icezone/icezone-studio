## Why

The landing page videos (banner and SceneShowcase) experience perceptible lag on initial playback due to eager loading and unoptimized resource delivery. General page performance is also degraded by undeferred non-critical resources, missing image optimizations, and layout work on the main thread during scroll — reducing perceived speed and Core Web Vitals scores.

## What Changes

- Add `preload="none"` + lazy initialization to SceneShowcase background videos (non-active slides)
- Add `preload="metadata"` to the VideoHero banner video so the first frame loads quickly without buffering the whole file
- Defer `IntersectionObserver`-based reveal animations to reduce main-thread work on initial paint
- Add `loading="lazy"` and explicit `sizes` to all below-the-fold `<Image>` components in landing sections
- Add `will-change: transform` hints only where CSS animations are active (marquee, float-card)
- Reduce `box-shadow` complexity on LiveCanvasShowcase nodes (compositing cost)
- Ensure `ModelMarquee` animation uses `translate3d` for GPU compositing

## Capabilities

### New Capabilities
- `video-performance`: Optimized video loading strategy — preload hints, lazy src assignment for off-screen videos

### Modified Capabilities
<!-- No spec-level behavioral changes — all changes are implementation optimizations -->

## Impact

- `src/components/landing/VideoHero.tsx` — add `preload="metadata"`
- `src/components/landing/SceneShowcase.tsx` — lazy-load non-active video srcs
- `src/components/landing/ModelMarquee.tsx` — GPU compositing hint
- `src/components/landing/LiveCanvasShowcase.tsx` — reduce shadow complexity
- `src/components/landing/WhyIceZone.tsx` — lazy image loading
- `src/components/landing/StartCreating.tsx` — lazy image loading
- `src/components/landing/TemplateShowcase.tsx` — lazy image loading
- No API changes, no behavioral changes, no breaking changes
