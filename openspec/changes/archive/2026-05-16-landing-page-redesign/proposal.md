## Why

Current landing page uses outdated "StoryboardCopilot" branding and a generic SaaS layout with static feature cards. It does not reflect the product's evolved identity as **IceZone Studio** — an AI-native creative canvas. The page lacks visual impact: no video/motion hero, no live product demonstration, and the design feels templated rather than premium.

Competitors like Vidu.com use full-screen video banners to create immediate visual impact, while TapNow.ai combines minimalist design with a "Live Canvas" concept that lets visitors interact with the product before signing up. We need to match this level of polish to compete for creative professionals.

## What Changes

- **Rebrand**: Replace all "StoryboardCopilot" references with "IceZone Studio"; use `public/LOGO.jpg` as the product logo icon
- **Video Hero Banner**: Full-viewport video background using `public/banner.mp4` at the top of the page, inspired by Vidu.com's immersive entry
- **Design System Overhaul**: Adopt a minimal, high-contrast aesthetic inspired by TapNow.ai — generous whitespace, refined typography, subtle animations, monochromatic base with selective accent colors
- **Live Canvas Section**: New interactive section embedding a real canvas template (using official templates) so visitors can see the product in action without signing up — inspired by TapNow.ai's live canvas concept
- **Layout Restructure**: Reorganize sections to follow Vidu.com's storytelling flow — Hero (video) → Product Showcase (live canvas) → Features → Social Proof → CTA
- **Remove/Simplify**: Remove Pricing section (premature for current stage), remove Stats strip (unverified numbers), simplify Use Cases into the feature showcase
- **Internationalization (i18n)**: All landing page text content must support Chinese/English switching, using the existing `useTranslation()` + `t()` i18n infrastructure; add a language switcher to the navigation bar
- **Navigation Update**: Redesign LandingNav with new branding, transparent-to-solid scroll behavior, and simplified link structure
- **Footer Redesign**: Update footer with IceZone Studio branding and streamlined link groups

## Capabilities

### New Capabilities
- `video-hero-banner`: Full-viewport video background section with overlay text, scroll-triggered transitions, and responsive fallback for mobile
- `live-canvas-showcase`: Interactive embedded canvas section displaying an official template, allowing visitors to see the node-based workflow in action
- `landing-design-system`: Minimalist design language with refined typography, motion system (scroll-reveal, parallax), and responsive breakpoints following TapNow.ai aesthetic
- `landing-i18n`: Chinese/English bilingual support with language switcher in navigation, leveraging existing i18n infrastructure (`src/i18n/`)

### Modified Capabilities
<!-- No existing specs require requirement-level changes -->

## Impact

- **Files Modified**: `src/app/page.tsx`, `src/components/landing/LandingNav.tsx`, `src/components/landing/CanvasDemo.tsx` (replaced by live canvas)
- **New Files**: New landing components under `src/components/landing/` (VideoHero, LiveCanvas, FeatureShowcase, etc.)
- **Assets**: `public/LOGO.jpg` (existing), `public/banner.mp4` (existing) — both already in repo
- **CSS**: Updates to `src/app/globals.css` landing palette design tokens
- **Dependencies**: May add `framer-motion` for scroll animations (evaluate if Tailwind CSS animations are sufficient first)
- **i18n Files**: Add `landing.*` keys to `src/i18n/locales/zh.json` and `src/i18n/locales/en.json`; add language switcher component to LandingNav
- **No API changes**: Landing page is fully static/client-side
- **No breaking changes**: Only affects the `/` route and landing-specific components
