## Context

The landing page loads multiple videos (banner, 5 scene videos) and many images. Currently all videos are loaded eagerly and all images use default Next.js loading. On slower connections this causes visible lag on first playback and slow initial paint. No architectural changes are needed — this is a targeted set of browser hint and loading strategy improvements.

## Goals / Non-Goals

**Goals:**
- Reduce video playback lag on banner and SceneShowcase
- Improve LCP (Largest Contentful Paint) and FID by deferring non-critical resources
- GPU-accelerate marquee and float animations to avoid main-thread jank
- Add lazy loading to below-the-fold images

**Non-Goals:**
- Transcoding or re-encoding video files
- CDN configuration changes
- Changing any UI layout, behavior, or visual appearance
- Adding a service worker or caching layer

## Decisions

### D1: `preload="metadata"` for VideoHero, `preload="none"` for SceneShowcase inactive slides

**Why**: VideoHero banner should show first frame immediately (`metadata` fetches enough to display poster + duration). SceneShowcase has 5 videos — loading all eagerly wastes bandwidth. Only the active slide's video needs `src`; inactive slides get `src` assigned lazily when they become active.

**Alternative considered**: `preload="auto"` — rejected, causes full video buffering on page load.

**Implementation**: SceneShowcase tracks `activeIndex` already. A `useEffect` on `activeIndex` assigns the `src` to video refs only when a slide becomes active. Each video ref is set once and not reset (browser caches it).

### D2: GPU compositing via `translate3d` for marquee

**Why**: `marquee-x` animation uses `translateX` which may not always be GPU-composited. Switching the keyframe to `translate3d(X, 0, 0)` forces a compositing layer, eliminating main-thread layout work during scroll.

**Alternative**: `will-change: transform` on the element — also valid, used as fallback.

### D3: `loading="lazy"` on all below-the-fold `<Image>` components

**Why**: Next.js `<Image>` defaults to `eager` loading. Gallery images in TemplateShowcase, StartCreating, WhyIceZone are below the fold and should not block initial paint.

**Exception**: VideoHero poster and LandingNav logo (above fold) keep default eager loading.

### D4: Simplify `box-shadow` on LiveCanvasShowcase nodes

**Why**: Complex multi-layer box-shadows on absolutely-positioned elements trigger composite layer promotion. Simplifying to a single shadow reduces GPU memory pressure on mobile.

## Risks / Trade-offs

- **Lazy video src assignment**: If a user rapidly clicks scene tabs before the video src is assigned, there may be a brief blank frame. Mitigation: assign src immediately on tab click, not just on render.
- **translate3d on marquee**: Promotes to a new compositing layer — slightly higher GPU memory. Acceptable trade-off for animation smoothness.
- **lazy images**: May cause layout shift if image dimensions aren't explicit. All `<Image>` usages already have explicit `width`/`height` or `fill`, so no CLS risk.
