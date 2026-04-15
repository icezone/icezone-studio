## Context

IceZone Studio's landing page currently has a complete upper half (VideoHero + LiveCanvasShowcase) that successfully establishes brand identity and product demonstration. However, the lower half uses basic components (`FeatureShowcase` and `CallToAction`) that don't match the premium aesthetic of the upper sections or competitive landing pages like vidu.com.

**Current State:**
- Upper half: VideoHero (banner.mp4) + LiveCanvasShowcase (interactive canvas preview) — retained as-is
- Lower half: FeatureShowcase (4-card grid) + CallToAction (simple gradient CTA) — to be replaced
- Tech stack: Next.js 15 App Router, React 18, Tailwind CSS v4, TypeScript, react-i18next
- Design system: Existing tokens in `DESIGN.md` and `globals.css` (glass-morphism, dark theme, hero overlays)
- i18n: Existing `useTranslation()` + `t()` infrastructure with zh/en locales

**Constraints:**
- Cannot change upper half components (VideoHero, LiveCanvasShowcase, LandingNav)
- Must use existing design tokens (no new color variables)
- Must support zh/en language switching
- Must work with placeholder assets initially (real assets added later)
- No new npm dependencies (use existing Tailwind CSS v4, react-i18next, Next.js Image)

**Stakeholders:**
- Marketing team: wants scroll-driven storytelling like vidu.com
- Product team: wants template/scene showcases to drive signups
- Design team: wants consistent visual language with existing upper half

## Goals / Non-Goals

**Goals:**
- Replace lower half with five new vidu-style components (ModelMarquee, WhyIceZone, SceneShowcase, TemplateShowcase, StartCreating)
- Implement scroll-driven animations using CSS keyframes + IntersectionObserver (no heavy animation libraries)
- Support bilingual content (zh/en) via react-i18next with new `landing.*` namespace keys
- Use placeholder assets initially; support easy asset drop-in later
- Maintain visual consistency with existing upper half design system
- Ensure responsive behavior (desktop + mobile breakpoints)

**Non-Goals:**
- Not changing upper half components (VideoHero, LiveCanvasShowcase, LandingNav, LandingFooter)
- Not adding new npm dependencies (no framer-motion, no GSAP)
- Not implementing real template/scene data fetching (placeholder content only)
- Not implementing user interaction beyond hover effects (no template preview modals, no video playback controls beyond browser defaults)
- Not implementing analytics tracking (out of scope for this change)

## Decisions

### 1. Component Architecture: Five Independent Client Components

**Decision:** Create five new `'use client'` components in `src/components/landing/`, each self-contained with its own styling and animations.

**Rationale:**
- Each section has distinct visual behavior (marquee scroll, 3D wall, tab carousel, scattered cards, gradient CTA)
- Self-contained components are easier to test and replace individually
- Client components required for IntersectionObserver and CSS animations
- Follows existing pattern established by VideoHero and LiveCanvasShowcase

**Alternatives Considered:**
- Server components with client wrappers → rejected because all sections need animations
- Single monolithic component → rejected because sections have no shared state
- Composition pattern with shared layout → rejected because each section has unique layout

### 2. Animation Strategy: CSS Keyframes + IntersectionObserver

**Decision:** Use CSS `@keyframes` for animations (`marquee-x`, `float-card`), trigger via IntersectionObserver adding/removing classes.

**Rationale:**
- No new dependencies (avoids framer-motion, GSAP)
- CSS animations are GPU-accelerated and performant
- IntersectionObserver is native browser API (no polyfill needed for modern browsers)
- Matches existing approach used in VideoHero scroll-reveal

**Alternatives Considered:**
- framer-motion → rejected to avoid new dependency
- Tailwind CSS arbitrary animations → rejected because complex multi-step keyframes need explicit `@keyframes` definitions
- No animations → rejected because animations are core to vidu-style aesthetic

### 3. Asset Strategy: Placeholder-First with Organized Directories

**Decision:** Use placeholder content (CSS gradients, data URIs, `/placeholder.svg`) initially. Real assets dropped into organized directories later:
- `/public/gallery/` — 3D image wall photos
- `/public/scenes/` — scene showcase videos
- `/public/templates/` — template thumbnails
- `/public/screenshots/` — feature screenshots
- `/public/models/` — AI model provider logos

**Rationale:**
- Unblocks development (no dependency on design team asset delivery)
- Clear asset organization prevents `/public/` clutter
- Easy to swap placeholders with real assets (just update `src` paths)
- Follows Next.js Image optimization best practices

**Alternatives Considered:**
- Block implementation until all assets ready → rejected because delays implementation
- Use random Unsplash URLs → rejected because requires external network calls
- Generate assets programmatically → rejected because too time-consuming

### 4. i18n Strategy: Flat Namespace Keys with Section Prefixes

**Decision:** Add new keys to existing `zh.json` / `en.json` under `landing.*` namespace:
- `landing.why.*` — WhyIceZone section
- `landing.scenes.*` — SceneShowcase section
- `landing.templates.*` — TemplateShowcase section
- `landing.startCreating.*` — StartCreating section
- `landing.models.*` — ModelMarquee section

**Rationale:**
- Consistent with existing `landing.nav.*`, `landing.hero.*` keys
- Flat structure easier to manage than nested objects
- Section prefixes provide clear namespace separation
- No changes needed to i18n configuration

**Alternatives Considered:**
- Nested object structure (`landing: { why: { ... } }`) → rejected because inconsistent with existing flat structure
- Separate namespace files (`landing-why.json`) → rejected because adds complexity to i18n config

### 5. Template Browser Modal: Full-Screen Overlay with Login Flow

**Decision:** TemplateShowcase component includes a full-screen modal overlay that displays all official and public templates in a browsable grid. Clicking a template redirects to `/login?template=<id>` for unauthenticated users.

**Rationale:**
- Full-screen modal maximizes template browsing space (better UX than drawer or inline expansion)
- Modal state managed within TemplateShowcase component (useState) keeps state localized
- Login redirect with template ID query parameter allows post-login redirect back to template
- Modal uses same design tokens as existing landing components (glassmorphism, backdrop blur)
- Supports close via button, overlay click, and Escape key (standard modal UX)

**Alternatives Considered:**
- Drawer from side → rejected because limited browsing space for template grid
- Inline expansion in section → rejected because disrupts scroll flow
- Separate `/templates` route → rejected because adds navigation friction and loses landing page context
- Modal as separate component → rejected because modal state is tightly coupled to TemplateShowcase

**Modal Architecture:**
- Component structure: TemplateShowcase wraps both scattered cards and modal overlay
- Modal visibility: `useState<boolean>` toggle, opens on card click
- Template data: Placeholder array initially (12+ templates), easy to swap with API call later
- Category filtering: Local state filtering, no API calls needed for MVP
- Close handlers: onClick (close button + overlay), onKeyDown (Escape), all set `isOpen(false)`
- Navigation: Next.js `useRouter().push('/login?template=' + id)` on template click

### 6. Component Composition in page.tsx: Direct Import Sequence

**Decision:** Update `src/app/page.tsx` to directly import and render new components in sequence:
```tsx
<VideoHero />
<LiveCanvasShowcase />
<ModelMarquee />
<WhyIceZone />
<SceneShowcase />
<TemplateShowcase />
<StartCreating />
<LandingFooter />
```

**Rationale:**
- Simple, explicit, easy to reorder
- No abstraction needed (sections don't share state)
- Matches existing pattern in current page.tsx
- Easy to comment out sections for A/B testing later

**Alternatives Considered:**
- Section registry with config-driven rendering → rejected as premature abstraction
- Layout component wrapper → rejected because sections have no shared layout props

## Risks / Trade-offs

### Risk: Placeholder Content May Not Match Final Asset Dimensions
**Mitigation:** Use `aspect-ratio` CSS property and `object-fit: cover` on all images/videos. Document expected aspect ratios in component comments (e.g., `// Gallery images: 4:3 aspect ratio recommended`).

### Risk: IntersectionObserver Animation Triggers May Feel Janky on Slow Devices
**Mitigation:** Use `threshold: 0.2` and `rootMargin: "0px 0px -100px 0px"` to trigger animations before sections fully enter viewport. Add `prefers-reduced-motion` media query support to disable animations for users who prefer reduced motion.

### Risk: Marquee Animation May Cause Layout Shift on Load
**Mitigation:** Set explicit `height` on marquee container and use `overflow: hidden`. Use `will-change: transform` to hint GPU acceleration. Test on slow 3G throttling.

### Risk: Scene Showcase Videos May Be Large File Sizes
**Mitigation:** Document recommended video specs in component comments (H.264, 1080p max, <5MB per video). Use `preload="metadata"` instead of `preload="auto"` to avoid loading full videos upfront. Consider adding poster images later.

### Risk: Template Cards Absolute Positioning May Overlap on Small Screens
**Mitigation:** Switch to CSS Grid layout on mobile breakpoints (<768px) with `position: relative` instead of `absolute`. Add responsive position calculations in component.

### Risk: Template Browser Modal May Display Too Many Templates Without Pagination
**Mitigation:** For MVP, limit placeholder template array to 12-24 templates (fits 2-3 viewport scrolls). Add scroll behavior with `overflow-y: auto` on modal content area. When real API integration is added, implement infinite scroll or pagination if template count exceeds 50.

### Risk: Template ID May Be Lost After Login Redirect
**Mitigation:** Pass template ID as URL query parameter (`/login?template=<id>`). Login page should read query params and redirect to `/canvas?template=<id>` after successful authentication. Test redirect flow to ensure template context is preserved.

### Trade-off: No Real Template/Scene Data Fetching
**Impact:** Components use hardcoded placeholder data arrays. When real API integration is needed, will require refactoring to async data fetching. **Decision:** Acceptable for MVP landing page; data integration is a separate future change.

### Trade-off: Deleted Components (FeatureShowcase, CallToAction) Cannot Be Easily Reverted
**Impact:** If new design doesn't perform well, reverting requires git history or rewriting. **Mitigation:** Archive old components to `src/components/landing/_archive/` instead of deleting (allows quick rollback if needed).
