## Context

IceZone Studio's landing page (`src/app/page.tsx`) currently uses "StoryboardCopilot" branding with a static feature-card layout. It imports two components: `LandingNav` and `CanvasDemo` from `src/components/landing/`. The page is a single-file React Server Component with embedded data arrays (features, steps, plans, stats, useCases).

The project uses Next.js App Router with Tailwind CSS v4 (`@theme inline` design tokens in `globals.css`). Existing landing palette tokens (`--color-ink`, `--color-surface`, `--color-frame`, `--color-amber`, `--color-electric`, etc.) are defined and available. The page is served at the root `/` route.

Assets `public/LOGO.jpg` (gold IZ monogram on transparent background) and `public/banner.mp4` (product demo video) are already in the repository.

## Goals / Non-Goals

**Goals:**
- Replace all StoryboardCopilot branding with IceZone Studio + LOGO.jpg
- Create an immersive video hero banner using banner.mp4 as the full-viewport background
- Build a Live Canvas showcase section embedding a real (or realistic) canvas template preview
- Establish a minimal, premium design language inspired by TapNow.ai's aesthetic
- Restructure page sections: Hero → Live Canvas → Features → CTA → Footer
- Ensure responsive design (mobile-first) with smooth scroll animations
- Keep the page fully static (no API calls, SSR-friendly)

**Non-Goals:**
- No interactive canvas that runs actual AI generation (demo only, not functional)
- No pricing section (premature for current product stage)
- No authentication integration on the landing page
- No backend API changes
- No SEO/Open Graph optimization (can be a follow-up change)

## Decisions

### D1: Component Architecture

**Decision**: Break the landing page into isolated client components under `src/components/landing/`:

```
src/components/landing/
├── LandingNav.tsx        (modified — rebrand + new links)
├── VideoHero.tsx          (new — video banner + overlay)
├── LiveCanvasShowcase.tsx (new — embedded canvas preview)
├── FeatureShowcase.tsx    (new — replaces old feature cards)
├── CallToAction.tsx       (new — final CTA section)
└── LandingFooter.tsx      (new — redesigned footer)
```

The root `page.tsx` becomes a thin shell importing and composing these components.

**Rationale**: Each section is independently scrollable and can lazy-load. Isolating components makes future A/B testing and maintenance easier. `CanvasDemo.tsx` will be removed and replaced by `LiveCanvasShowcase.tsx`.

**Alternative considered**: Single-file page with sections — rejected because it leads to 600+ line files that are hard to maintain (current page is already 670 lines).

### D2: Video Hero Implementation

**Decision**: Use a native HTML `<video>` element with `autoPlay`, `muted`, `loop`, `playsInline` attributes. Apply a dark gradient overlay for text readability. No third-party video player library.

```
┌─────────────────────────────────────────┐
│  <video> (100vh, object-fit: cover)     │
│  ┌───────────────────────────────────┐  │
│  │ Gradient overlay (black → transp) │  │
│  │                                   │  │
│  │   [LOGO]  IceZone Studio          │  │
│  │                                   │  │
│  │   "AI-Native Creative Canvas"     │  │
│  │                                   │  │
│  │   [Start Creating] [Learn More]   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│  ↓ Scroll indicator                     │
└─────────────────────────────────────────┘
```

**Rationale**: Native `<video>` has zero dependencies, works across all modern browsers, and provides the best performance for background video. The `muted` attribute is required for autoplay on mobile.

**Alternative considered**: Using a GIF or animated WebP — rejected because banner.mp4 already exists and video provides better quality-to-size ratio.

### D3: Live Canvas Showcase

**Decision**: Create a visually rich, non-interactive canvas preview that shows a real template layout with simulated node interactions (animated edges, pulsing nodes). Use a screenshot/mockup approach with CSS animations rather than embedding the actual ReactFlow canvas.

**Rationale**: Embedding the real canvas would require loading ReactFlow + all node components on the landing page, adding ~200KB to the bundle. A visual mockup with CSS animations achieves the same "wow" effect at a fraction of the cost. The current `CanvasDemo.tsx` already uses this approach successfully — we'll evolve it with better visuals and the new design language.

**Alternative considered**: Embedding actual ReactFlow — rejected due to bundle size impact on landing page load time.

### D4: Animation Strategy

**Decision**: Use CSS animations + Intersection Observer for scroll-triggered reveals. No framer-motion dependency.

Animations:
- **Scroll reveal**: `@keyframes reveal-up` (translate + opacity) triggered by `IntersectionObserver`
- **Video parallax**: Subtle `transform: translateY()` on scroll via CSS `scroll-timeline` or a lightweight scroll handler
- **Node pulse**: CSS `@keyframes` for the live canvas showcase nodes
- **Nav transition**: CSS transition for `background` and `backdrop-filter` on scroll

**Rationale**: Tailwind CSS v4 + vanilla CSS animations handle everything needed. Adding framer-motion (~30KB gzipped) is not justified for scroll reveals and simple transitions. The existing codebase already uses CSS keyframes (`animate-reveal-up`, `animate-reveal-in`, `flow-path`).

**Alternative considered**: framer-motion for complex orchestration — deferred to future if needed.

### D5: Design Token Updates

**Decision**: Extend existing landing palette in `globals.css` with refined tokens:

```css
/* Landing v2 palette additions */
--color-hero-overlay: rgba(7, 10, 16, 0.65);
--color-glass: rgba(255, 255, 255, 0.04);
--color-glass-border: rgba(255, 255, 255, 0.08);
--color-text-hero: #ffffff;
--color-text-secondary: #94a3b8;
```

Reuse existing tokens (`--color-ink`, `--color-surface`, `--color-amber`, etc.) where possible.

**Rationale**: Builds on the established design token system without breaking canvas or app theme. Landing-specific tokens are scoped by naming convention (`hero-`, `glass-`).

### D6: Section Order

**Decision**: Restructure the page flow:

1. **VideoHero** — Full-viewport video + headline + CTA buttons
2. **LiveCanvasShowcase** — "See it in action" interactive preview
3. **FeatureShowcase** — 3-4 key features with visual demonstrations
4. **CallToAction** — Final conversion section
5. **LandingFooter** — Branding + links

**Removed sections**: Stats strip (unverified numbers), Pricing (premature), Use Cases (merged into features), Workflow steps (replaced by live canvas).

**Rationale**: Follows Vidu.com's proven flow: immersive entry → product demo → details → conversion. The live canvas replaces both the old CanvasDemo and the workflow section, serving as the primary product demonstration.

### D7: Internationalization (i18n)

**Decision**: Use the existing i18n infrastructure (`src/i18n/`) to support Chinese/English bilingual landing page. All hardcoded text in landing components will be replaced with `t('landing.*')` calls. A language switcher toggle will be added to `LandingNav`.

Implementation approach:
- Add `landing.*` namespace keys to both `src/i18n/locales/zh.json` and `src/i18n/locales/en.json`
- All landing components use `useTranslation()` hook + `t()` function
- Language switcher in LandingNav: compact toggle button (中/EN), calls `changeLanguage()` from `@/i18n`
- Language preference persisted to `localStorage` (existing mechanism)
- Default language: detect from `navigator.language` — if starts with `zh`, default to Chinese; otherwise English

Key structure:
```json
{
  "landing": {
    "nav": { "features": "...", "canvas": "...", "start": "..." },
    "hero": { "headline": "...", "subtitle": "...", "cta": "...", "ctaSecondary": "..." },
    "canvas": { "heading": "...", "subtitle": "..." },
    "features": { "heading": "...", "ai_image": { "title": "...", "desc": "..." }, ... },
    "cta": { "heading": "...", "desc": "...", "signup": "...", "login": "..." },
    "footer": { "product": "...", "company": "...", "legal": "...", "copyright": "..." }
  }
}
```

**Rationale**: The project already has a mature i18n setup with `useTranslation()`, `changeLanguage()`, and `localStorage` persistence. Reusing this avoids adding any new dependencies. The `landing.*` namespace keeps landing page keys organized and separate from app keys.

**Alternative considered**: next-intl with URL-based locale routing (`/en`, `/zh`) — rejected because the existing i18n system uses client-side switching without URL prefixes, and introducing route-based i18n only for the landing page would be inconsistent with the rest of the app.

## Risks / Trade-offs

- **[Video autoplay on mobile]** → Some mobile browsers block autoplay even when muted. Mitigation: Provide a poster frame (first frame of banner.mp4) as fallback; use the `poster` attribute on `<video>`.
- **[Large video file]** → banner.mp4 may be large and slow to load. Mitigation: Lazy-load the video; show a static poster immediately; consider compressing to WebM for smaller size.
- **[No pricing section]** → Users looking for pricing info won't find it. Mitigation: Add a "Contact us" link in the CTA section; pricing can be added as a follow-up change.
- **[i18n key maintenance]** → Bilingual support doubles text maintenance. Mitigation: All keys use `landing.*` namespace; CI can validate key parity between zh.json and en.json. Key structure mirrors component hierarchy for easy lookup.
- **[Template content TBD]** → The live canvas showcase needs specific template content that is "to be determined." Mitigation: Use the "小说转分镜" (Novel-to-Storyboard) template as the default showcase since it demonstrates the most features (novel input → storyboard generation → image editing).
