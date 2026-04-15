## 1. Foundation Setup

- [x] 1.1 Add new CSS keyframes to `src/app/globals.css` — `@keyframes marquee-x` (translateX infinite loop) and `@keyframes float-card` (translateY up-down oscillation with 3s duration)
- [x] 1.2 Add i18n keys to `src/i18n/locales/zh.json` — `landing.models.*`, `landing.why.*`, `landing.scenes.*`, `landing.templates.*` (including `landing.templates.modal.*` for template browser modal), `landing.startCreating.*` with Chinese translations
- [x] 1.3 Add i18n keys to `src/i18n/locales/en.json` — matching keys from zh.json with English translations, ensure key structure is identical
- [ ] 1.4 **REVIEWER AGENT**: Verify foundation setup — check CSS keyframes syntax is valid, confirm all i18n keys have matching structure in both locale files, verify no duplicate keys exist

## 2. ModelMarquee Component

- [x] 2.1 Create `src/components/landing/ModelMarquee.tsx` — `'use client'` component with frosted-glass container (backdrop-blur, semi-transparent background), horizontal scrolling strip using `marquee-x` animation
- [x] 2.2 Add model logo data array — at least 6 AI model entries (Nano Banana, Sora, Kling, Grok, Veo, ElevenLabs) with logo placeholder paths and `t('landing.models.<id>')` for names
- [x] 2.3 Implement infinite scroll effect — duplicate logo array to create seamless loop, set `animation-duration: 30s`, ensure no visible gap when loop restarts
- [x] 2.4 Add responsive styling — scale logos down on mobile (<768px), add `prefers-reduced-motion` media query to pause animation
- [ ] 2.5 **REVIEWER AGENT**: Verify ModelMarquee component — test infinite scroll is seamless, confirm frosted-glass effect is visible, verify i18n keys render correctly in both languages, test responsive behavior on mobile viewport, confirm reduced motion support works

## 3. WhyIceZone Component

- [x] 3.1 Create `src/components/landing/WhyIceZone.tsx` — `'use client'` component with section heading using `t('landing.why.title')`
- [x] 3.2 Implement feature cards grid — three feature cards in responsive grid (3 columns desktop, 1 column mobile), each with icon, title from `t('landing.why.features[n].title')`, description from `t('landing.why.features[n].description')`
- [x] 3.3 Add hover effects to feature cards — border brighten and subtle elevation shadow on `:hover` with smooth transition
- [x] 3.4 Implement 3D image wall background — absolutely positioned behind feature cards, uses placeholder images from `/public/gallery/` (or placeholder gradients if not available), vertical auto-scroll with CSS animation
- [x] 3.5 Add parallax effect to image wall — use different scroll rate than foreground (0.5x speed) via CSS `transform` or IntersectionObserver
- [x] 3.6 Add scroll-reveal animation — use IntersectionObserver with `threshold: 0.2`, add fade-in + translateY(-20px → 0) with 600ms ease-out, respect `prefers-reduced-motion`
- [ ] 3.7 **REVIEWER AGENT**: Verify WhyIceZone component — test feature cards render in correct grid layout, confirm hover effects work smoothly, verify 3D image wall scrolls automatically, test parallax effect creates depth, confirm scroll-reveal animation triggers correctly, verify i18n content displays in both languages, test responsive mobile layout, confirm reduced motion support

## 4. SceneShowcase Component

- [x] 4.1 Create `src/components/landing/SceneShowcase.tsx` — `'use client'` component with section heading and horizontal tab row
- [x] 4.2 Implement tab state management — use `useState` to track active tab, initialize with first scene
- [x] 4.3 Create tab buttons — map over scene data array, render buttons with `t('landing.scenes.tabs[n].label')`, apply active styling (different background/border) to active tab
- [x] 4.4 Implement video player — full-viewport `<video>` element with `controls`, `src` dynamically set based on active tab, placeholder videos from `/public/scenes/` or placeholder video URL
- [x] 4.5 Add tab click handler — update active tab state, swap video source, ensure video reloads when tab changes
- [x] 4.6 Add responsive styling — horizontal scrollable tab row on mobile (<768px), full-width video player on mobile
- [x] 4.7 Add scroll-reveal animation — fade-in with 600ms ease-out when section enters viewport, respect `prefers-reduced-motion`
- [ ] 4.8 **REVIEWER AGENT**: Verify SceneShowcase component — test tab switching updates video correctly, confirm active tab has distinct styling, verify video controls work (play/pause/seek), test horizontal scroll on mobile tabs, confirm i18n tab labels display in both languages, verify scroll-reveal animation, test reduced motion support

## 5. TemplateShowcase Component

- [x] 5.1 Create `src/components/landing/TemplateShowcase.tsx` — `'use client'` component with section heading from `t('landing.templates.title')`
- [x] 5.2 Create template card data array — at least 6 templates with thumbnail placeholder paths, `t('landing.templates.items[n].title')`, `t('landing.templates.items[n].category')`
- [x] 5.3 Implement scattered layout on desktop — use absolute positioning with calculated top/left percentages to create organic scattered effect, ensure cards don't overlap
- [x] 5.4 Render template cards — each card shows thumbnail image (Next.js `<Image>`), title overlay, category badge
- [x] 5.5 Add hover animations — scale(1.05) transform and elevated shadow on `:hover` with smooth transition
- [x] 5.6 Implement responsive grid on mobile — switch to CSS grid layout on <768px, use `position: relative` instead of `absolute`
- [x] 5.7 Add staggered scroll-reveal animation — use IntersectionObserver, fade in cards sequentially with 100ms delay between each, respect `prefers-reduced-motion`
- [x] 5.8 Add click handler to template cards — use `useState` to track modal open state, trigger modal open on card click
- [x] 5.9 Create template browser modal component — full-screen modal overlay with close button, backdrop blur effect, centered content panel
- [x] 5.10 Implement modal template data fetching — fetch or load official and public templates (use placeholder data array initially with at least 12 templates)
- [x] 5.11 Render template grid in modal — responsive grid layout showing all templates with thumbnails, titles, categories, use `t('landing.templates.modal.*')` for UI text
- [x] 5.12 Add category filter to modal — tab or dropdown filter for template categories, update displayed templates based on selected category
- [x] 5.13 Implement template selection handler — on template click, navigate to `/login` route with template ID as query parameter (e.g., `/login?template=<id>`) or state for post-login redirect
- [x] 5.14 Add modal close handlers — close button click, overlay click (outside content area), and Escape key press all dismiss modal
- [x] 5.15 Add modal i18n support — use `t('landing.templates.modal.*')` for modal header, category labels, close button, ensure language switching updates modal content without closing
- [x] 5.16 Add i18n keys for modal — add `landing.templates.modal.*` keys to zh.json and en.json (header, categories, closeButton, noTemplates placeholder text)
- [ ] 5.17 **REVIEWER AGENT**: Verify TemplateShowcase component and modal — test cards are scattered across section without overlap on desktop, confirm hover animations work smoothly, verify mobile switches to grid layout, test staggered animation timing, confirm i18n content displays correctly, **verify card click opens modal**, **test modal displays all templates in grid**, **verify category filtering works**, **test template click navigates to /login with template ID**, **verify modal close functionality (close button, overlay click, Escape key)**, **test modal i18n content updates on language switch**, confirm reduced motion support

## 6. StartCreating CTA Component

- [x] 6.1 Create `src/components/landing/StartCreating.tsx` — `'use client'` component with animated gradient background
- [x] 6.2 Implement animated gradient — use CSS gradient with multiple color stops, animate via `@keyframes` shifting `background-position`, respect `prefers-reduced-motion`
- [x] 6.3 Add floating image decorations — randomly select 4-6 images from `/public/gallery/` (use a static import list or `require.context` equivalent), position absolutely around content area, use `float-card` animation for subtle up-down motion with staggered delays per card, respect `prefers-reduced-motion`
- [x] 6.4 Add CTA content — headline from `t('landing.startCreating.headline')`, description from `t('landing.startCreating.description')`
- [x] 6.5 Add CTA buttons — primary button (→ `/signup`) with `t('landing.startCreating.primaryButton')`, secondary button (→ `/login`) with `t('landing.startCreating.secondaryButton')`, use Next.js `<Link>` component
- [x] 6.6 Add responsive styling — stack buttons vertically on mobile (<768px), scale headline text for mobile screen width
- [x] 6.7 Add scroll-reveal animation — fade-in with 600ms ease-out when section enters viewport, respect `prefers-reduced-motion`
- [ ] 6.8 **REVIEWER AGENT**: Verify StartCreating component — test gradient animation runs smoothly, **confirm floating gallery images render from `/public/gallery/` with random selection**, confirm float animations run continuously with staggered delays, verify buttons navigate to correct routes, test responsive mobile layout (stacked buttons, scaled headline), confirm i18n content displays in both languages, verify scroll-reveal animation, test reduced motion support disables all animations

## 7. Page Assembly

- [x] 7.1 Update `src/app/page.tsx` imports — add new component imports (ModelMarquee, WhyIceZone, SceneShowcase, TemplateShowcase, StartCreating), remove old imports (FeatureShowcase, CallToAction)
- [x] 7.2 Update page component sequence — render components in order: VideoHero → LiveCanvasShowcase → ModelMarquee → WhyIceZone → SceneShowcase → TemplateShowcase → StartCreating → LandingFooter
- [x] 7.3 Remove old component references — delete `<FeatureShowcase />` and `<CallToAction />` from JSX, remove any related props or state
- [ ] 7.4 **REVIEWER AGENT**: Verify page assembly — test all sections render in correct order, confirm no TypeScript errors in page.tsx, verify old components are completely removed, test full page scroll flow from top to bottom, confirm no layout shifts or gaps between sections

## 8. Cleanup and Verification

- [x] 8.1 Move old components to archive — rename `src/components/landing/FeatureShowcase.tsx` to `src/components/landing/_archive/FeatureShowcase.tsx`, rename `src/components/landing/CallToAction.tsx` to `src/components/landing/_archive/CallToAction.tsx` (creates `_archive/` directory if needed)
- [x] 8.2 Run TypeScript check — execute `npx tsc --noEmit`, fix any type errors in new components
- [x] 8.3 Run linter — execute `npm run lint`, fix any ESLint warnings in modified/new files
- [ ] 8.4 **REVIEWER AGENT FINAL**: Complete end-to-end verification — open landing page in browser, test full scroll experience from top to bottom, verify all animations trigger correctly, test language switching updates all new sections, test on mobile viewport (<768px) for responsive behavior, verify all hover effects work, confirm no console errors, test reduced motion preference disables all animations, verify all i18n keys render (no missing translation warnings), confirm no layout issues or visual regressions
