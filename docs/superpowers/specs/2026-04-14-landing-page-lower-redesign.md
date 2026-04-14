# Landing Page Lower Half Redesign — Design Spec

**Date:** 2026-04-14  
**Status:** Draft  
**Reference:** vidu.com design patterns, DESIGN.md existing token system

---

## Context

IceZone Studio's landing page lower half currently has a plain `FeatureShowcase` (grid cards) and a basic `CallToAction`. The upper half (VideoHero + LiveCanvasShowcase) is being kept as-is. This spec redesigns the lower half to match the cinematic, premium aesthetic of vidu.com while staying consistent with the existing design token system defined in `DESIGN.md` and `globals.css`.

**Motivation:** The current lower half lacks visual impact, doesn't showcase the product's AI model ecosystem, and has no template/community angle. Vidu.com's scroll-driven layout with image walls, tab-video carousels, and immersive CTA sections has proven conversion power.

---

## New Page Structure

```
LandingNav              ← unchanged
VideoHero               ← unchanged
LiveCanvasShowcase      ← unchanged
═══════════════════════ ← redesigned below this line
ModelMarquee            ← NEW: AI model logos divider strip
WhyIceZone              ← REPLACE: FeatureShowcase → 3D image wall
SceneShowcase           ← NEW: tab-video carousel (marketing angle)
TemplateShowcase        ← NEW: scattered floating template cards
StartCreating           ← REPLACE: CallToAction → dynamic gradient CTA
LandingFooter           ← unchanged
```

Files to create/modify:
- `src/components/landing/ModelMarquee.tsx` — new
- `src/components/landing/WhyIceZone.tsx` — new (replaces FeatureShowcase.tsx)
- `src/components/landing/SceneShowcase.tsx` — new
- `src/components/landing/TemplateShowcase.tsx` — new
- `src/components/landing/StartCreating.tsx` — new (replaces CallToAction.tsx)
- `src/app/page.tsx` — update imports
- `src/app/globals.css` — add marquee + parallax keyframes
- `src/i18n/locales/zh.json` — add new i18n keys
- `src/i18n/locales/en.json` — add new i18n keys

Old files to remove: `FeatureShowcase.tsx`, `CallToAction.tsx`

---

## Module 1: ModelMarquee

**Purpose:** Visual divider between sections. Showcases the AI models integrated in IceZone Studio. Creates a "powered by best-in-class AI" impression.

**Visual design:**
- Full-width horizontal band, ~64px tall
- Background: `backdrop-filter: blur(12px)` + `background: rgba(255,255,255,0.04)` (existing `--color-glass` token)
- Top/bottom border: `rgba(255,255,255,0.08)` (existing `--color-glass-border`)
- Content: continuous auto-scrolling marquee (CSS `@keyframes marquee-x`) — two copies of the list concatenated for seamless loop
- Each item: model logo SVG/PNG (16×16) + model name in `--color-text-secondary` (#94a3b8), `text-sm font-medium`
- Separator between items: `·` dot in muted color

**AI models to display (image models first, then video):**
```
Nano Banana · OpenAI · Midjourney · Grok
Kling · Wan · Sora · Seedance · ElevenLabs
```

**Animation:** `@keyframes marquee-x { from { transform: translateX(0) } to { transform: translateX(-50%) } }` — 30s linear infinite. Pauses on hover (`animation-play-state: paused`).

**Placement:** Used twice — between LiveCanvasShowcase and WhyIceZone, and between SceneShowcase and TemplateShowcase.

**i18n:** No text translation needed (model names are proper nouns).

---

## Module 2: WhyIceZone

**Purpose:** Replace FeatureShowcase. Answers "why IceZone?" with 3 key differentiators + a cinematic 3D image wall of AI-generated outputs.

**Visual design (vidu "Why Vidu" clone):**

```
[ Title: "为什么选择 IceZone Studio？" ]
[ Subtitle: 1 line description ]

[ ⚡ Instant ]  [ 🎨 Canvas ]  [ 🔗 Share ]
[  feature  ]  [  feature  ]  [ feature ]
[ separator ]  [ separator ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← 3D image wall
│ perspective(800px) rotateX(30deg) │
│   [ img ] [ img ] [ img ] [ img ] │  ← flex-wrap, auto-scroll up
│   [ img ] [ img ] [ img ] [ img ] │
│   [ img ] [ img ] [ img ] [ img ] │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**3 Feature columns:**
1. **即时生成** (Instant Generation) — 蓝色圆形图标 `#3b82f6` — "文字/图片秒级生成高质量输出"
2. **节点画布** (Node Canvas) — 琥珀色 `#f59631` — "可视化工作流，任意组合AI节点"
3. **工作流共享** (Workflow Sharing) — 青色 `#22d3ee` — "一键导出并分享你的创作流程"

Columns separated by thin vertical dividers (`h-[120px] w-px bg-white/10`).

**3D Image Wall implementation:**
- Outer wrapper: `width: 120%; transform: perspective(800px) rotateX(28deg)` — same values as vidu
- Inner scroll container: `max-h-[500px] overflow-y-auto scrollbar-hide`
- Auto-scroll: `useEffect` + `requestAnimationFrame` that increments `scrollTop` by 0.5px/frame, resets when reaching bottom
- Image grid: `flex flex-wrap justify-center gap-3 px-4` with 24–36 images
- Each image: `rounded-lg object-cover` with `aspect-video` or `aspect-square`
- Top/bottom fade masks on the container using `::before`/`::after` pseudoelements with gradient

**Assets required:** 24–36 AI-generated sample images in `/public/gallery/` (user to provide).  
**Placeholder fallback:** Colored gradient blocks with aspect-video ratio, labeled with generation type.

**i18n keys:** `landing.why.heading`, `landing.why.subtitle`, `landing.why.instant.*`, `landing.why.canvas.*`, `landing.why.share.*`

**Animation:** Section fades in with `scroll-reveal` IntersectionObserver (existing pattern).

---

## Module 3: SceneShowcase

**Purpose:** "IceZone Studio 适用于..." — shows product value across 5 real-world creative contexts. Marketing angle.

**Visual design (vidu "Use Vidu for" clone):**

```
[ Title: "IceZone Studio 适用于..." ]

[ 影视创作 · 广告营销 · 内容创作 · 动漫制作 · 商业摄影 ]
           ↑ active tab: sliding underline indicator

┌─────────────────────────────────────────────────────┐
│                                                     │
│          [ Large video / image centered ]           │
│                                                     │
│  gradient fade bottom →                             │
└─────────────────────────────────────────────────────┘
```

**Tab row:**
- Horizontal flex row, `overflow-x-auto scrollbar-hide`
- Each tab: `cursor-pointer text-lg font-medium px-6 py-3 text-white/60 hover:text-white transition-colors`
- Active tab: `text-white`
- Sliding underline: absolutely-positioned `div` that translates to active tab via JS — `transition: transform 300ms ease`
- Right edge: gradient fade `bg-gradient-to-l from-black to-transparent w-[15%]`

**5 Scenes:**
| Tab | 中文 | Video/Image src |
|-----|------|-----------------|
| 影视创作 | Film & TV | `/public/scenes/film.mp4` |
| 广告营销 | Advertising | `/public/scenes/ads.mp4` |
| 内容创作 | Content Creation | `/public/scenes/content.mp4` |
| 动漫制作 | Animation | `/public/scenes/anime.mp4` |
| 商业摄影 | Commercial Photo | `/public/scenes/photo.mp4` |

**Video display:** `max-w-4xl mx-auto rounded-2xl overflow-hidden` with `aspect-video`. Switching between tabs: fade out (200ms) → swap source → fade in (200ms). Bottom gradient fade: `bg-gradient-to-b from-transparent to-[--color-ink] h-[200px]`.

**Auto-play behavior:**
- Every 5 seconds, automatically advance to the next tab (wraps from last back to first)
- Timer resets when user manually clicks a tab
- Timer pauses when section is not in viewport (IntersectionObserver)
- Progress indicator: thin progress bar under the active tab's underline that fills over 5s, resets on tab change

**Assets required:** 5 short videos (10–30s) per scene in `/public/scenes/` (user to provide).  
**Placeholder fallback:** Static colored card with scene name overlay.

**i18n keys:** `landing.scenes.heading`, `landing.scenes.tabs.*` (5 tabs)

---

## Module 4: TemplateShowcase

**Purpose:** "人人可用的模板" — highlight IceZone's template library. Shows official and community-shared workflow templates. Encourages reuse.

**Visual design (vidu "Templates for Everyone" clone):**

```
[ Icon badge ]
[ Title: "人人可用的模板" ]
[ Subtitle: "发现、使用、分享 AI 工作流模板..." ]
[ Button: "浏览模板库 →" ]

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   [card]              [card large]           [card]           │
│        [card]                     [card]                      │
│                  [card]                [card]                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Scattered card layout:**
- Container: `relative h-[650px] overflow-hidden` (matches vidu's `h-[700px]`)
- 5–7 cards, each `absolute` positioned with hardcoded `top/left/right` percentages
- Each card slightly rotated: `rotate-[-2deg]`, `rotate-[3deg]`, `rotate-[-1deg]` etc.
- Card content: `rounded-xl overflow-hidden shadow-2xl` with `aspect-video w-[25%]` (varies per card)
- On hover: `scale-105 z-10 shadow-[0_0_40px_rgba(59,130,246,0.3)]` smooth transition

**Card anatomy:**
```
┌──────────────────────┐
│  [ video/image ]     │
├──────────────────────┤
│ 🔴 官方  template-name │
│ ★ 1.2k uses          │
└──────────────────────┘
```
- Badge: `官方` in `--color-amber` / `社区` in `--color-electric` / username in white
- Uses count: small gray text

**Cards to display (6 total):**
| Template | Source | Type |
|----------|--------|------|
| 小说转分镜 | 官方 | workflow |
| 图生视频 | 官方 | workflow |
| 广告脚本生成 | 官方 | workflow |
| 动漫风格转换 | 社区 @user1 | style |
| 批量商品图 | 社区 @user2 | batch |
| 人像写真 | 社区 @user3 | portrait |

**Assets required:** 6 video/image thumbnails in `/public/templates/` (user to provide).  
**Placeholder fallback:** Gradient blocks with template name.

**CTA button:** Links to `/templates` (in-app template library page, display public templates in UI panel in landing page).

**i18n keys:** `landing.templates.heading`, `landing.templates.subtitle`, `landing.templates.cta`, `landing.templates.official`, `landing.templates.community`

---

## Module 5: StartCreating

**Purpose:** Final conversion section. Dynamic background that shifts on scroll. Floating product thumbnails. Register + Login CTAs.

**Visual design:**

```
┌─────────────────────────────────────────────────────────────┐
│  [float] [float]    CSS animated gradient BG    [float] [f] │
│                                                             │
│               "开始你的 AI 创作之旅"                         │
│          "免费注册，立即体验 IceZone Studio"                 │
│                                                             │
│          [免费注册 →]    [已有账号？登录]                    │
│                                                             │
│  [f]          [float]              [float]      [float]     │
└─────────────────────────────────────────────────────────────┘
```

**Dynamic background implementation:**
- Base: `--color-surface` (`#0d1525`)
- On scroll into view (IntersectionObserver `intersectionRatio`): CSS custom property `--cta-hue` transitions from `220` (blue) → `270` (purple) → `200` (cyan) as scroll progress increases
- Background: `background: radial-gradient(ellipse at 30% 50%, hsl(var(--cta-hue) 70% 15% / 0.6), transparent 60%), radial-gradient(ellipse at 70% 50%, hsl(calc(var(--cta-hue) + 40) 60% 10% / 0.4), transparent 60%), var(--color-surface)`
- Smooth JS update: `element.style.setProperty('--cta-hue', interpolatedValue)`

**Floating thumbnails:**
- 4–6 product screenshots, absolutely positioned at corners/edges
- CSS animation: each card uses `animate-float` (existing `@keyframes float-y`) with different durations (4s, 5s, 6s) and delays
- Cards: `rounded-xl shadow-2xl rotate-[-6deg]`, `rotate-[4deg]` etc., `w-[160px]` or `w-[120px]`

**CTA buttons:** Same as existing CallToAction — keep exact same button styles:
- Primary: amber glow button → `/signup`
- Secondary: ghost button → `/login`

**Assets required:** 4–6 product screenshot thumbnails in `/public/screenshots/` (user to provide).  
**Placeholder fallback:** Gradient cards.

**i18n keys:** Reuse existing `landing.cta.*` keys (heading, desc, signup, login).

---

## Design System Alignment

All new components must follow these rules from `DESIGN.md`:

| Rule | Implementation |
|------|---------------|
| No framer-motion | CSS keyframes + IntersectionObserver only |
| Existing tokens | Use `--color-ink`, `--color-surface`, `--color-amber`, `--color-electric`, `--color-glass`, `--color-glass-border` |
| 'use client' | All landing components are client components |
| i18n | All strings via `useTranslation()` + `t('landing.*')` |
| Responsive | Mobile-first, breakpoints at `md:` (768px) |
| Animation pattern | `scroll-reveal` + `revealed` classes via IntersectionObserver |

**New CSS keyframes to add in `globals.css`:**
```css
@keyframes marquee-x {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes float-card {
  0%, 100% { transform: translateY(0px) rotate(var(--card-rotate, 0deg)); }
  50%       { transform: translateY(-12px) rotate(var(--card-rotate, 0deg)); }
}
```

---

## New i18n Keys Summary

```json
{
  "landing": {
    "why": {
      "heading": "为什么选择 IceZone Studio？",
      "subtitle": "专为 AI 创作者打造的节点式画布平台",
      "instant": { "title": "即时生成", "desc": "文字或图片输入，秒级生成高质量图片与视频" },
      "canvas":  { "title": "节点画布", "desc": "可视化工作流，自由组合任意 AI 模型与工具" },
      "share":   { "title": "工作流共享", "desc": "一键导出并分享你的 AI 创作流程" }
    },
    "scenes": {
      "heading": "IceZone Studio 适用于...",
      "tabs": {
        "film":    "影视创作",
        "ads":     "广告营销",
        "content": "内容创作",
        "anime":   "动漫制作",
        "photo":   "商业摄影"
      }
    },
    "templates": {
      "heading":   "人人可用的模板",
      "subtitle":  "发现、使用、分享 AI 工作流模板。官方精选与社区创作，一键复用立即开始",
      "cta":       "浏览模板库 →",
      "official":  "官方",
      "community": "社区"
    }
  }
}
```

---

## Assets Checklist

Before implementation, user needs to provide:

- [ ] `/public/gallery/*.{jpg,webp}` — 24–36 AI output sample images for WhyIceZone wall
- [ ] `/public/scenes/film.mp4` + 4 others — scene demo videos for SceneShowcase
- [ ] `/public/templates/*.{mp4,jpg}` — 6 template thumbnails for TemplateShowcase
- [ ] `/public/screenshots/*.{jpg,webp}` — 4–6 product screenshots for StartCreating floats
- [ ] AI model logo PNGs (optional) — for ModelMarquee (can use text-only fallback)

All placeholder fallbacks are implemented so development can proceed without assets.

---

## Verification

1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run lint` — no ESLint warnings
3. `npx next build` — build succeeds
4. Visual check: scroll through page in browser, verify all 4 new sections render
5. Verify `ModelMarquee` scrolls continuously without gaps
6. Verify `SceneShowcase` tab switching with underline animation
7. Verify `WhyIceZone` image wall 3D tilt + auto-scroll
8. Verify `StartCreating` background color shifts on scroll
9. Language toggle: switch zh↔en, verify all new keys translate correctly
10. Mobile (375px): all sections responsive, no horizontal overflow
