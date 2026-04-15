## Why

The current landing page lower half has a plain `FeatureShowcase` (basic grid cards) and a simple `CallToAction` that lack visual impact and fail to showcase IceZone Studio's AI model ecosystem, template library, and creative scene capabilities. The upper half (VideoHero + LiveCanvasShowcase) successfully establishes brand identity, but the lower sections feel generic compared to premium competitors like vidu.com, which uses scroll-driven layouts with image walls, tab-video carousels, and immersive CTAs that have proven conversion power.

## What Changes

- **Replace FeatureShowcase**: New `WhyIceZone` component with 3-column feature cards + auto-scrolling 3D image wall (parallax effect)
- **Replace CallToAction**: New `StartCreating` component with animated gradient background + floating product thumbnails
- **Add AI Model Divider**: New `ModelMarquee` component — frosted-glass ticker strip showing supported AI model logos (Flux, Luma, Kling, etc.)
- **Add Scene Showcase**: New `SceneShowcase` component — horizontal tab row (marketing angles) + full-viewport video player for each scene type
- **Add Template Showcase**: New `TemplateShowcase` component — scattered, absolute-positioned template cards with hover preview effects; clicking any card opens a full-screen template browser modal displaying all official and public templates, leading to login page for template selection
- **Update Page Assembly**: Modify `src/app/page.tsx` to wire new component sequence (keep upper half unchanged)
- **Add Animations**: New CSS keyframes in `globals.css` for marquee scrolling and floating card animations
- **Internationalization**: Add `landing.why.*`, `landing.scenes.*`, `landing.templates.*`, `landing.startCreating.*` keys to zh.json/en.json
- **Remove Old Components**: Delete `FeatureShowcase.tsx` and `CallToAction.tsx` (fully replaced)

## Capabilities

### New Capabilities
- `landing-model-marquee`: Infinite-scroll marquee strip displaying AI model provider logos with frosted-glass styling
- `landing-why-icezone`: Feature showcase section combining 3-column benefit cards with auto-scrolling 3D image wall background
- `landing-scene-showcase`: Tab-based video carousel showing different creative scene types (ads, novels, concepts) with full-viewport video players
- `landing-template-showcase`: Scattered template card gallery with absolute positioning, hover animations, and clickable modal for browsing all official/public templates leading to login
- `landing-start-creating-cta`: Immersive call-to-action section with animated gradient backgrounds and floating product thumbnails

### Modified Capabilities
<!-- No existing specs require requirement-level changes -->

## Impact

- **Files Modified**: `src/app/page.tsx` (component sequence), `src/app/globals.css` (new keyframes)
- **Files Created**: 
  - `src/components/landing/ModelMarquee.tsx`
  - `src/components/landing/WhyIceZone.tsx`
  - `src/components/landing/SceneShowcase.tsx`
  - `src/components/landing/TemplateShowcase.tsx`
  - `src/components/landing/StartCreating.tsx`
- **Files Deleted**: 
  - `src/components/landing/FeatureShowcase.tsx`
  - `src/components/landing/CallToAction.tsx`
- **i18n Files**: Add keys to `src/i18n/locales/zh.json` and `src/i18n/locales/en.json` (`landing.why.*`, `landing.scenes.*`, `landing.templates.*` including `landing.templates.modal.*`, `landing.startCreating.*`, `landing.models.*`)
- **Assets**: Placeholder assets used initially; real assets to be dropped in `/public/gallery/`, `/public/scenes/`, `/public/templates/` later (`/public/gallery/` is shared between WhyIceZone image wall and StartCreating floating decorations)
- **Dependencies**: No new npm packages required — uses existing Tailwind CSS v4, react-i18next, Next.js Image
- **No API changes**: All components are client-side only
- **No breaking changes**: Only affects the `/` route landing page; does not impact authenticated app routes
