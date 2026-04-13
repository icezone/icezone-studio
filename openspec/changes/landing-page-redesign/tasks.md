## 1. Design Tokens & Foundation

- [x] 1.1 Update `globals.css` — add new landing v2 palette tokens (`--color-hero-overlay`, `--color-glass`, `--color-glass-border`, `--color-text-hero`, `--color-text-secondary`) and any new keyframes needed for scroll-reveal animations
- [ ] 1.2 Generate a poster image frame from `public/banner.mp4` (first frame) and save as `public/banner-poster.jpg` for video fallback

## 2. Navigation Rebrand

- [x] 2.1 Update `LandingNav.tsx` — replace StoryboardCopilot logo/text with IceZone Studio branding using `public/LOGO.jpg` (`<Image>` component, ~32px height) + "IceZone Studio" text
- [x] 2.2 Update navigation links to match new section structure (Features, Canvas, etc.) and ensure transparent→solid scroll transition works with new branding

## 3. Video Hero Banner

- [x] 3.1 Create `src/components/landing/VideoHero.tsx` — full-viewport (100vh) section with `<video>` element playing `banner.mp4` (autoPlay, muted, loop, playsInline, poster)
- [x] 3.2 Add gradient overlay (dark-to-transparent top + bottom) ensuring 4.5:1 contrast ratio for overlay text
- [x] 3.3 Add hero overlay content — LOGO.jpg, headline, subtitle, primary CTA (→ /signup), secondary CTA (scroll anchor)
- [x] 3.4 Add animated scroll-down indicator at bottom edge that fades out after 100px scroll
- [x] 3.5 Ensure responsive behavior — stacked CTAs on mobile (<768px), scaled headline text, video covers full viewport on all sizes

## 4. Live Canvas Showcase

- [x] 4.1 Create `src/components/landing/LiveCanvasShowcase.tsx` — section with heading, subtitle, and canvas preview container with glassmorphism card styling
- [x] 4.2 Build canvas template preview — node cards arranged in "Novel-to-Storyboard" workflow pattern (input → processing → output nodes) with connection lines
- [x] 4.3 Add node animations — flowing dot animations on connection lines, cycling active node highlights, simulated AI processing indicators
- [x] 4.4 Add canvas chrome — toolbar bar, minimap, dot-grid background
- [x] 4.5 Ensure responsive sizing — scale down proportionally on mobile, hide minimap on <768px

## 5. Feature Showcase

- [x] 5.1 Create `src/components/landing/FeatureShowcase.tsx` — section with heading and 3-4 feature cards in responsive grid
- [x] 5.2 Design feature cards — icon, title, description, optional tags/badges; hover interaction with border brighten and subtle elevation
- [x] 5.3 Select and configure 3-4 key features to highlight (AI Image Gen, AI Video Gen, Node Canvas Workflow, Storyboard Tools)

## 6. CTA & Footer

- [x] 6.1 Create `src/components/landing/CallToAction.tsx` — visually distinct section with headline, description, primary button (→ /signup), secondary button (→ /login)
- [x] 6.2 Create `src/components/landing/LandingFooter.tsx` — IceZone Studio branding, link groups (Product/Company/Legal), copyright, social links
- [x] 6.3 Ensure footer responsive layout — link groups stack vertically on mobile

## 7. Page Assembly & Scroll Animations

- [x] 7.1 Rewrite `src/app/page.tsx` — thin shell composing VideoHero → LiveCanvasShowcase → FeatureShowcase → CallToAction → LandingFooter
- [x] 7.2 Implement scroll-reveal hook/utility using IntersectionObserver — sections fade-in + translate-up (500-700ms ease-out), one-time trigger, staggered children (80-120ms delay)
- [x] 7.3 Remove old `CanvasDemo.tsx` component (replaced by LiveCanvasShowcase)

## 8. Internationalization (i18n)

- [x] 8.1 Add `landing.*` translation keys to `src/i18n/locales/zh.json` — covering nav, hero, canvas showcase, features, CTA, and footer sections
- [x] 8.2 Add matching `landing.*` translation keys to `src/i18n/locales/en.json` — ensure key structure is identical to zh.json
- [x] 8.3 Update all landing components (VideoHero, LiveCanvasShowcase, FeatureShowcase, CallToAction, LandingFooter) to use `useTranslation()` + `t('landing.*')` instead of hardcoded text
- [x] 8.4 Update `LandingNav.tsx` to use `t()` for navigation link text
- [x] 8.5 Create language switcher toggle in `LandingNav.tsx` — compact 中/EN button calling `changeLanguage()` from `@/i18n`, positioned in nav bar
- [x] 8.6 Add browser language detection — default to `zh` if `navigator.language` starts with `zh`, otherwise default to `en` (only when no `localStorage` preference exists)
- [ ] 8.7 Verify language switching — toggle between Chinese and English, confirm all text updates without page reload and no raw keys are displayed
- [ ] 8.8 Verify responsive text — check both languages on mobile (<768px) for overflow/truncation issues

## 9. Cleanup & Verification

- [x] 9.1 Remove all "StoryboardCopilot" text references from landing components and page.tsx
- [x] 9.2 Remove old data arrays (features, steps, plans, stats, useCases) from page.tsx
- [x] 9.3 Run `npx tsc --noEmit` — fix any TypeScript errors
- [x] 9.4 Run `npm run lint` — fix any lint warnings in modified/new files
- [ ] 9.5 Visual verification — open landing page in browser, check all sections render correctly on desktop and mobile viewports, in both Chinese and English
