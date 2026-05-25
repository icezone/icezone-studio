# Landing Page Lower Half Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `FeatureShowcase` and `CallToAction` with five new vidu-style components: `ModelMarquee`, `WhyIceZone`, `SceneShowcase`, `TemplateShowcase`, and `StartCreating`.

**Architecture:** Five new `'use client'` components in `src/components/landing/`. All animations via CSS keyframes + IntersectionObserver. All text via `react-i18next` using `landing.*` namespace. Placeholder assets used throughout; real assets dropped in `/public/gallery/`, `/public/scenes/`, `/public/templates/`, `/public/screenshots/` later.

**Tech Stack:** Next.js App Router, React 18, Tailwind CSS v4, TypeScript, react-i18next

**Spec:** `docs/superpowers/specs/2026-04-14-landing-page-lower-redesign.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/landing/ModelMarquee.tsx` | Frosted-glass AI model ticker strip |
| Create | `src/components/landing/WhyIceZone.tsx` | 3-col features + 3D auto-scroll image wall |
| Create | `src/components/landing/SceneShowcase.tsx` | Tab row + video display, marketing angle |
| Create | `src/components/landing/TemplateShowcase.tsx` | Scattered absolute-positioned template cards |
| Create | `src/components/landing/StartCreating.tsx` | Gradient-shift CTA + floating thumbnails |
| Modify | `src/app/page.tsx` | Wire new components, remove old imports |
| Modify | `src/app/globals.css` | Add `marquee-x` + `float-card` keyframes |
| Modify | `src/i18n/locales/zh.json` | Add `landing.why/scenes/templates` keys |
| Modify | `src/i18n/locales/en.json` | Add `landing.why/scenes/templates` keys |
| Delete | `src/components/landing/FeatureShowcase.tsx` | Replaced by WhyIceZone |
| Delete | `src/components/landing/CallToAction.tsx` | Replaced by StartCreating |

---

## Task 0: CSS Keyframes + i18n Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add new keyframes to globals.css**

  Find the last `@keyframes` block in `src/app/globals.css` (currently `@keyframes blink-cursor`) and add after it:

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

  Also add the utility class after existing `.animate-*` classes:

  ```css
  .animate-marquee {
    animation: marquee-x 30s linear infinite;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }
  .animate-float-card {
    animation: float-card 5s ease-in-out infinite;
  }
  ```

- [ ] **Step 2: Add i18n keys to zh.json**

  In `src/i18n/locales/zh.json`, find the `"landing"` object and add the following keys alongside the existing ones (`nav`, `hero`, `canvas`, `features`, `cta`, `footer`):

  ```json
  "why": {
    "heading": "为什么选择 IceZone Studio？",
    "subtitle": "专为 AI 创作者打造的节点式画布平台，汇聚顶级图像与视频模型",
    "instant": {
      "title": "即时生成",
      "desc": "文字或图片输入，秒级生成高质量图片与视频，无需等待"
    },
    "canvas": {
      "title": "节点画布",
      "desc": "可视化工作流，自由组合任意 AI 模型，所见即所得"
    },
    "share": {
      "title": "工作流共享",
      "desc": "一键导出并分享你的 AI 创作流程，让社区复用你的智慧"
    }
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
    "community": "社区",
    "uses":      "次使用"
  }
  ```

- [ ] **Step 3: Add i18n keys to en.json**

  In `src/i18n/locales/en.json`, add the same structure under `"landing"`:

  ```json
  "why": {
    "heading": "Why IceZone Studio?",
    "subtitle": "A node-based creative canvas built for AI creators, powered by best-in-class models",
    "instant": {
      "title": "Instant Generation",
      "desc": "Text or image input — generate high-quality images and videos in seconds"
    },
    "canvas": {
      "title": "Node Canvas",
      "desc": "Visual workflow editor — combine any AI models freely, what you see is what you get"
    },
    "share": {
      "title": "Workflow Sharing",
      "desc": "Export and share your AI creative workflows — let the community build on your ideas"
    }
  },
  "scenes": {
    "heading": "IceZone Studio is built for...",
    "tabs": {
      "film":    "Film & TV",
      "ads":     "Advertising",
      "content": "Content Creation",
      "anime":   "Animation",
      "photo":   "Commercial Photo"
    }
  },
  "templates": {
    "heading":   "Templates for Everyone",
    "subtitle":  "Discover, use, and share AI workflow templates. Official picks and community creations — one click to start",
    "cta":       "Browse Template Library →",
    "official":  "Official",
    "community": "Community",
    "uses":      "uses"
  }
  ```

- [ ] **Step 4: Verify TypeScript + lint**

  ```bash
  npx tsc --noEmit
  npm run lint
  ```

  Expected: No errors. (No components use the keys yet so unused-key warnings won't fire.)

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/app/globals.css src/i18n/locales/zh.json src/i18n/locales/en.json
  rtk git commit -m "feat: add marquee/float-card keyframes and landing why/scenes/templates i18n keys"
  ```

---

## Task 1: ModelMarquee Component

**Files:**
- Create: `src/components/landing/ModelMarquee.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/landing/ModelMarquee.tsx`:

  ```tsx
  'use client';

  const MODELS = [
    { name: 'Nano Banana' },
    { name: 'OpenAI' },
    { name: 'Midjourney' },
    { name: 'Grok' },
    { name: 'Kling' },
    { name: 'Wan' },
    { name: 'Sora' },
    { name: 'Seedance' },
    { name: 'ElevenLabs' },
  ];

  export function ModelMarquee() {
    return (
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: '64px',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Two copies concatenated for seamless loop */}
        <div
          className="animate-marquee flex h-full items-center gap-10 whitespace-nowrap"
          style={{ width: 'max-content' }}
        >
          {[...MODELS, ...MODELS].map((model, i) => (
            <span
              key={i}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: '#94a3b8' }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                ✦
              </span>
              {model.name}
              {i < [...MODELS, ...MODELS].length - 1 && (
                <span className="ml-6 opacity-20">·</span>
              )}
            </span>
          ))}
        </div>
        {/* Left fade */}
        <div
          className="pointer-events-none absolute top-0 left-0 h-full w-24"
          style={{ background: 'linear-gradient(to right, var(--color-surface), transparent)' }}
        />
        {/* Right fade */}
        <div
          className="pointer-events-none absolute top-0 right-0 h-full w-24"
          style={{ background: 'linear-gradient(to left, var(--color-surface), transparent)' }}
        />
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Temporarily wire into page.tsx to visually verify**

  In `src/app/page.tsx`, add import and render temporarily after `<LiveCanvasShowcase />`:

  ```tsx
  import { ModelMarquee } from '@/components/landing/ModelMarquee';
  // ...
  <LiveCanvasShowcase />
  <ModelMarquee />
  ```

  Run `npm run dev`, open browser at `http://localhost:3000`. Verify:
  - Frosted glass band appears
  - Model names scroll continuously from right to left
  - Scrolling pauses on hover

- [ ] **Step 4: Commit (keep temporary wire — will be cleaned up in Task 6)**

  ```bash
  rtk git add src/components/landing/ModelMarquee.tsx src/app/page.tsx
  rtk git commit -m "feat: add ModelMarquee component with frosted glass AI model ticker"
  ```

---

## Task 2: WhyIceZone Component

**Files:**
- Create: `src/components/landing/WhyIceZone.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/landing/WhyIceZone.tsx`:

  ```tsx
  'use client';

  import { useEffect, useRef } from 'react';
  import { useTranslation } from 'react-i18next';

  const FEATURES = [
    { key: 'instant', icon: '⚡', color: '#3b82f6' },
    { key: 'canvas',  icon: '🎨', color: '#f59631' },
    { key: 'share',   icon: '🔗', color: '#22d3ee' },
  ] as const;

  // 24 placeholder tiles — replace src values with real /public/gallery/*.jpg later
  const GALLERY = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    bg: `hsl(${200 + i * 12}deg, 35%, ${15 + (i % 4) * 3}%)`,
  }));

  export function WhyIceZone() {
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);
    const sectionRef = useRef<HTMLElement>(null);

    // Auto-scroll the image wall upward, reset at bottom
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const tick = () => {
        if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 0.6;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, []);

    // Scroll-reveal
    useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
        { threshold: 0.1 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    return (
      <section
        ref={sectionRef}
        className="scroll-reveal relative w-full overflow-hidden"
        style={{ background: 'var(--color-ink)' }}
      >
        <div className="flex w-full flex-col items-center overflow-hidden pt-[120px]">
          {/* Title */}
          <h2 className="text-center text-[48px] font-medium text-white md:text-[32px]">
            {t('landing.why.heading')}
          </h2>
          <p
            className="mt-4 text-center text-base"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {t('landing.why.subtitle')}
          </p>

          {/* Feature columns */}
          <div className="mt-16 flex items-center gap-[74px] md:flex-col md:gap-8">
            {FEATURES.map((f, i) => (
              <>
                {i > 0 && (
                  <div
                    key={`sep-${i}`}
                    className="h-[120px] w-px md:hidden"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                  />
                )}
                <div key={f.key} className="flex w-[280px] flex-col gap-4 md:w-full md:items-center md:text-center">
                  <div
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl"
                    style={{
                      background: `${f.color}22`,
                      border: `2px solid ${f.color}`,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t(`landing.why.${f.key}.title`)}
                    </h3>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                    >
                      {t(`landing.why.${f.key}.desc`)}
                    </p>
                  </div>
                </div>
              </>
            ))}
          </div>

          {/* 3D Image Wall */}
          <div
            className="relative mt-20 w-[120%] md:w-[140%]"
            style={{
              transform: 'perspective(800px) rotateX(28deg)',
              transformOrigin: 'center top',
            }}
          >
            {/* Top fade mask */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-20"
              style={{ background: 'linear-gradient(to bottom, var(--color-ink), transparent)' }}
            />
            {/* Auto-scroll container */}
            <div
              ref={scrollRef}
              className="scrollbar-hide overflow-y-auto"
              style={{ maxHeight: '500px', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex flex-wrap justify-center gap-3 px-4 py-4">
                {GALLERY.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-lg flex-shrink-0"
                    style={{
                      width: '160px',
                      aspectRatio: '16/9',
                      background: item.bg,
                      // Replace with: <img src={`/gallery/sample-${item.id+1}.jpg`} ... />
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Bottom fade mask */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32"
              style={{ background: 'linear-gradient(to top, var(--color-ink), transparent)' }}
            />
          </div>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Add to page.tsx after ModelMarquee and visually verify**

  In `src/app/page.tsx`:
  ```tsx
  import { WhyIceZone } from '@/components/landing/WhyIceZone';
  // ...
  <ModelMarquee />
  <WhyIceZone />
  ```

  Run `npm run dev`. Verify:
  - 3 feature columns appear with icon badges and text
  - Image wall renders below with 3D tilt perspective
  - Wall auto-scrolls upward, resets seamlessly
  - Top/bottom fade masks hide tile edges cleanly

- [ ] **Step 4: Commit**

  ```bash
  rtk git add src/components/landing/WhyIceZone.tsx src/app/page.tsx
  rtk git commit -m "feat: add WhyIceZone component with 3D perspective auto-scroll image wall"
  ```

---

## Task 3: SceneShowcase Component

**Files:**
- Create: `src/components/landing/SceneShowcase.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/landing/SceneShowcase.tsx`:

  ```tsx
  'use client';

  import { useState, useRef, useEffect, useCallback } from 'react';
  import { useTranslation } from 'react-i18next';

  const SCENES = [
    { key: 'film',    src: '/scenes/film.mp4',    hue: 210 },
    { key: 'ads',     src: '/scenes/ads.mp4',     hue: 30  },
    { key: 'content', src: '/scenes/content.mp4', hue: 160 },
    { key: 'anime',   src: '/scenes/anime.mp4',   hue: 270 },
    { key: 'photo',   src: '/scenes/photo.mp4',   hue: 340 },
  ] as const;

  const AUTO_ADVANCE_MS = 5000;

  export function SceneShowcase() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);
    const [visible, setVisible] = useState(true);
    // progress: 0–100, drives the progress bar width
    const [progress, setProgress] = useState(0);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const inViewRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRafRef = useRef<number>(0);
    const progressStartRef = useRef<number>(0);

    // Slide indicator to active tab
    const updateIndicator = useCallback((index: number) => {
      const el = tabRefs.current[index];
      const ind = indicatorRef.current;
      if (!el || !ind) return;
      ind.style.width = `${el.offsetWidth}px`;
      ind.style.transform = `translateX(${el.offsetLeft}px)`;
    }, []);

    useEffect(() => { updateIndicator(activeTab); }, [activeTab, updateIndicator]);

    // Animate progress bar from 0→100 over AUTO_ADVANCE_MS
    const startProgressBar = useCallback(() => {
      cancelAnimationFrame(progressRafRef.current);
      setProgress(0);
      progressStartRef.current = performance.now();
      const tick = (now: number) => {
        const elapsed = now - progressStartRef.current;
        const pct = Math.min((elapsed / AUTO_ADVANCE_MS) * 100, 100);
        setProgress(pct);
        if (pct < 100) {
          progressRafRef.current = requestAnimationFrame(tick);
        }
      };
      progressRafRef.current = requestAnimationFrame(tick);
    }, []);

    const stopProgressBar = useCallback(() => {
      cancelAnimationFrame(progressRafRef.current);
      setProgress(0);
    }, []);

    // Fade-switch to a specific tab index
    const switchTab = useCallback((i: number) => {
      setVisible(false);
      setTimeout(() => {
        setActiveTab(i);
        setVisible(true);
      }, 200);
    }, []);

    // Manual tab click: reset timer + progress
    const handleTabClick = useCallback((i: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopProgressBar();
      switchTab(i);
      if (inViewRef.current) {
        startProgressBar();
        timerRef.current = setInterval(() => {
          setActiveTab((prev) => {
            const next = (prev + 1) % SCENES.length;
            switchTab(next);
            startProgressBar();
            return next;
          });
        }, AUTO_ADVANCE_MS);
      }
    }, [switchTab, startProgressBar, stopProgressBar]);

    // Start/stop auto-advance based on in-viewport state
    const startAutoAdvance = useCallback(() => {
      if (timerRef.current) return;
      startProgressBar();
      timerRef.current = setInterval(() => {
        setActiveTab((prev) => {
          const next = (prev + 1) % SCENES.length;
          switchTab(next);
          startProgressBar();
          return next;
        });
      }, AUTO_ADVANCE_MS);
    }, [switchTab, startProgressBar]);

    const stopAutoAdvance = useCallback(() => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      stopProgressBar();
    }, [stopProgressBar]);

    // IntersectionObserver: scroll-reveal + pause when off-screen
    useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('revealed');
            inViewRef.current = true;
            startAutoAdvance();
          } else {
            inViewRef.current = false;
            stopAutoAdvance();
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      return () => { observer.disconnect(); stopAutoAdvance(); };
    }, [startAutoAdvance, stopAutoAdvance]);

    const scene = SCENES[activeTab];

    return (
      <section
        ref={sectionRef}
        className="scroll-reveal relative w-full"
        style={{ background: 'var(--color-ink)', paddingBottom: '0' }}
      >
        <div className="flex flex-col items-center pt-[120px]">
          {/* Title */}
          <h2 className="text-[42px] font-medium text-white md:mx-12 md:text-center md:text-[32px]">
            {t('landing.scenes.heading')}
          </h2>

          {/* Tab row */}
          <div className="relative mt-12 w-full max-w-4xl">
            <div className="relative overflow-hidden">
              <div className="flex gap-0 overflow-x-auto scrollbar-hide px-8">
                {SCENES.map((s, i) => (
                  <button
                    key={s.key}
                    ref={(el) => { tabRefs.current[i] = el; }}
                    onClick={() => handleTabClick(i)}
                    className="flex-shrink-0 cursor-pointer px-6 py-3 text-lg font-medium transition-colors duration-200"
                    style={{ color: activeTab === i ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                  >
                    {t(`landing.scenes.tabs.${s.key}`)}
                  </button>
                ))}
              </div>
              {/* Sliding underline track */}
              <div className="relative mx-8 h-px" style={{ background: 'rgba(255,255,255,0.10)' }}>
                {/* Static white underline (shows active tab position) */}
                <div
                  ref={indicatorRef}
                  className="absolute bottom-0 h-[2px] transition-all duration-300 ease-out overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.25)', width: 0, transform: 'translateX(0)' }}
                >
                  {/* Progress bar fills over 5s */}
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${progress}%`,
                      background: '#ffffff',
                      transition: 'none',
                    }}
                  />
                </div>
              </div>
              {/* Right fade */}
              <div
                className="pointer-events-none absolute top-0 right-0 h-full w-[15%]"
                style={{ background: 'linear-gradient(to left, var(--color-ink), transparent)' }}
              />
            </div>
          </div>

          {/* Video / placeholder display */}
          <div className="relative mt-12 w-full max-w-5xl px-4">
            <div
              className="overflow-hidden rounded-2xl transition-opacity duration-200"
              style={{
                aspectRatio: '16/9',
                opacity: visible ? 1 : 0,
                background: `hsl(${scene.hue}deg, 40%, 12%)`,
              }}
            >
              {/* Placeholder: replace inner content with <video> when assets available */}
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-2xl font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {t(`landing.scenes.tabs.${scene.key}`)}
                </span>
              </div>
            </div>
            {/* Bottom gradient fade into next section */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[200px]"
              style={{ background: 'linear-gradient(to bottom, transparent, var(--color-ink))' }}
            />
          </div>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Add to page.tsx and visually verify**

  In `src/app/page.tsx`:
  ```tsx
  import { SceneShowcase } from '@/components/landing/SceneShowcase';
  // ...
  <WhyIceZone />
  <ModelMarquee />
  <SceneShowcase />
  ```

  Run `npm run dev`. Verify:
  - Tab row renders with 5 scene labels
  - Clicking a tab slides the underline to the new tab and resets the progress bar
  - Progress bar fills white from left to right over 5 seconds under the active tab
  - After 5 seconds, auto-advances to next tab and resets progress bar
  - Scrolling section out of viewport pauses auto-advance; scrolling back in resumes
  - Content area fades out then fades in on tab switch
  - Right edge of tab row has gradient fade

- [ ] **Step 4: Commit**

  ```bash
  rtk git add src/components/landing/SceneShowcase.tsx src/app/page.tsx
  rtk git commit -m "feat: add SceneShowcase component with sliding tab indicator and fade video switcher"
  ```

---

## Task 4: TemplateShowcase Component

**Files:**
- Create: `src/components/landing/TemplateShowcase.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/landing/TemplateShowcase.tsx`:

  ```tsx
  'use client';

  import { useEffect, useRef } from 'react';
  import Link from 'next/link';
  import { useTranslation } from 'react-i18next';

  type Template = {
    name: string;
    nameEn: string;
    source: 'official' | 'community';
    user?: string;
    uses: number;
    hue: number;
    // Absolute positioning + rotate
    pos: { top?: string; bottom?: string; left?: string; right?: string; width: string; rotate: string };
  };

  const TEMPLATES: Template[] = [
    {
      name: '小说转分镜', nameEn: 'Novel to Storyboard',
      source: 'official', uses: 3400, hue: 220,
      pos: { top: '18%', left: '4%', width: '27%', rotate: '-2deg' },
    },
    {
      name: '图生视频', nameEn: 'Image to Video',
      source: 'official', uses: 2100, hue: 190,
      pos: { top: '8%', left: '34%', width: '22%', rotate: '1.5deg' },
    },
    {
      name: '广告脚本生成', nameEn: 'Ad Script Generator',
      source: 'official', uses: 1800, hue: 260,
      pos: { top: '36%', left: '60%', width: '20%', rotate: '-1deg' },
    },
    {
      name: '动漫风格转换', nameEn: 'Anime Style Transfer',
      source: 'community', user: '@animefan', uses: 890, hue: 310,
      pos: { top: '55%', right: '4%', width: '18%', rotate: '3deg' },
    },
    {
      name: '批量商品图', nameEn: 'Batch Product Images',
      source: 'community', user: '@seller88', uses: 650, hue: 140,
      pos: { bottom: '10%', left: '20%', width: '19%', rotate: '-3deg' },
    },
    {
      name: '人像写真', nameEn: 'Portrait Photography',
      source: 'community', user: '@portrait_ai', uses: 1200, hue: 30,
      pos: { top: '12%', right: '4%', width: '16%', rotate: '2deg' },
    },
  ];

  function TemplateCard({ tpl, t }: { tpl: Template; t: (k: string) => string }) {
    return (
      <div
        className="absolute overflow-hidden rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:z-20 cursor-pointer"
        style={{
          top: tpl.pos.top,
          bottom: tpl.pos.bottom,
          left: tpl.pos.left,
          right: tpl.pos.right,
          width: tpl.pos.width,
          transform: `rotate(${tpl.pos.rotate})`,
          zIndex: 1,
        }}
      >
        {/* Thumbnail placeholder — replace with <img src={`/templates/${tpl.nameEn}.jpg`} ... /> */}
        <div
          style={{
            aspectRatio: '16/9',
            background: `hsl(${tpl.hue}deg, 35%, 18%)`,
          }}
        />
        {/* Card footer */}
        <div className="px-3 py-2" style={{ background: '#111827' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-white">{tpl.name}</span>
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: tpl.source === 'official'
                  ? 'rgba(245,150,49,0.18)'
                  : 'rgba(59,130,246,0.18)',
                color: tpl.source === 'official' ? '#f59631' : '#3b82f6',
              }}
            >
              {tpl.source === 'official'
                ? t('landing.templates.official')
                : (tpl.user ?? t('landing.templates.community'))}
            </span>
          </div>
          <p className="mt-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ★ {tpl.uses.toLocaleString()} {t('landing.templates.uses')}
          </p>
        </div>
      </div>
    );
  }

  export function TemplateShowcase() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
        { threshold: 0.1 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    return (
      <section
        ref={sectionRef}
        className="scroll-reveal relative w-full overflow-hidden"
        style={{ background: 'var(--color-ink)', minHeight: '760px' }}
      >
        {/* Header */}
        <div className="relative z-10 flex flex-col items-center pt-[100px]">
          <h2 className="text-center text-[48px] font-medium text-white md:text-[32px]">
            {t('landing.templates.heading')}
          </h2>
          <p
            className="mt-4 max-w-lg text-center text-base"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {t('landing.templates.subtitle')}
          </p>
          <Link
            href="/templates"
            className="mt-8 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors"
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.35)',
            }}
          >
            {t('landing.templates.cta')}
          </Link>
        </div>

        {/* Scattered cards — absolute within the section */}
        <div className="absolute inset-0 top-[260px]">
          {TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.nameEn} tpl={tpl} t={t} />
          ))}
        </div>

        {/* Bottom gradient fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-ink))' }}
        />
      </section>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Add to page.tsx and visually verify**

  In `src/app/page.tsx`:
  ```tsx
  import { TemplateShowcase } from '@/components/landing/TemplateShowcase';
  // ...
  <SceneShowcase />
  <TemplateShowcase />
  ```

  Run `npm run dev`. Verify:
  - Title + subtitle + "浏览模板库" button render at top
  - 6 template cards appear scattered/absolute-positioned with rotation
  - Each card has colored thumbnail placeholder + name + badge (官方/community handle)
  - Hovering a card scales it up (scale-105) and brings it to front (z-20)

- [ ] **Step 4: Commit**

  ```bash
  rtk git add src/components/landing/TemplateShowcase.tsx src/app/page.tsx
  rtk git commit -m "feat: add TemplateShowcase with scattered absolute-positioned template cards"
  ```

---

## Task 5: StartCreating Component

**Files:**
- Create: `src/components/landing/StartCreating.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/landing/StartCreating.tsx`:

  ```tsx
  'use client';

  import { useEffect, useRef } from 'react';
  import Link from 'next/link';
  import { useTranslation } from 'react-i18next';

  type FloatCard = {
    style: { top?: string; bottom?: string; left?: string; right?: string; width: string };
    rotate: string;
    delay: string;
    duration: string;
    hue: number;
  };

  const FLOATS: FloatCard[] = [
    { style: { top: '8%',  left: '2%',   width: '160px' }, rotate: '-6deg', delay: '0s',    duration: '5s',   hue: 220 },
    { style: { top: '60%', left: '4%',   width: '120px' }, rotate: '4deg',  delay: '1.2s',  duration: '6s',   hue: 260 },
    { style: { top: '12%', right: '3%',  width: '140px' }, rotate: '5deg',  delay: '0.6s',  duration: '4.5s', hue: 190 },
    { style: { top: '65%', right: '5%',  width: '130px' }, rotate: '-4deg', delay: '1.8s',  duration: '5.5s', hue: 30  },
    { style: { top: '35%', left: '10%',  width: '100px' }, rotate: '2deg',  delay: '0.3s',  duration: '7s',   hue: 160 },
    { style: { top: '40%', right: '10%', width: '110px' }, rotate: '-3deg', delay: '2s',    duration: '6.5s', hue: 310 },
  ];

  export function StartCreating() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLElement>(null);

    // Shift --cta-hue based on scroll intersection ratio
    useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
      const observer = new IntersectionObserver(
        ([entry]) => {
          const ratio = entry.intersectionRatio;
          // 220 (deep blue) → 280 (violet) as section becomes more visible
          const hue = Math.round(220 + ratio * 60);
          el.style.setProperty('--cta-hue', String(hue));
        },
        { threshold: thresholds }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    return (
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden"
        style={
          {
            minHeight: '640px',
            '--cta-hue': '220',
            background: [
              'radial-gradient(ellipse at 30% 50%, hsl(var(--cta-hue) 70% 15% / 0.55), transparent 60%)',
              'radial-gradient(ellipse at 70% 50%, hsl(calc(var(--cta-hue) + 45) 60% 10% / 0.4), transparent 60%)',
              'var(--color-surface)',
            ].join(', '),
          } as React.CSSProperties
        }
      >
        {/* Floating thumbnail cards */}
        {FLOATS.map((f, i) => (
          <div
            key={i}
            className="absolute overflow-hidden rounded-xl shadow-2xl animate-float-card"
            style={{
              ...f.style,
              '--card-rotate': f.rotate,
              transform: `rotate(${f.rotate})`,
              animationDelay: f.delay,
              animationDuration: f.duration,
              // Replace with <img src={`/screenshots/ss${i+1}.jpg`} ... />
            } as React.CSSProperties}
          >
            <div
              style={{
                width: f.style.width,
                aspectRatio: '16/9',
                background: `hsl(${f.hue}deg, 35%, 18%)`,
              }}
            />
          </div>
        ))}

        {/* Center CTA */}
        <div className="relative z-10 flex min-h-[640px] flex-col items-center justify-center px-6 py-20 text-center">
          <h2 className="text-[48px] font-medium text-white md:text-[32px]">
            {t('landing.cta.heading')}
          </h2>
          <p
            className="mt-4 max-w-md text-base"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {t('landing.cta.desc')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="animate-pulse-glow rounded-full px-8 py-3 text-sm font-semibold text-white"
              style={{ background: '#f59631' }}
            >
              {t('landing.cta.signup')}
            </Link>
            <Link
              href="/login"
              className="rounded-full border px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.22)' }}
            >
              {t('landing.cta.login')}
            </Link>
          </div>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Add to page.tsx and visually verify**

  In `src/app/page.tsx`:
  ```tsx
  import { StartCreating } from '@/components/landing/StartCreating';
  // ...
  <TemplateShowcase />
  <StartCreating />
  ```

  Run `npm run dev`. Verify:
  - 6 floating thumbnail cards visible at edges/corners
  - Each card gently bobs up/down with CSS animation
  - Scrolling to this section: background hue shifts from blue toward violet
  - "免费注册" amber button renders with pulse glow
  - "已有账号？登录" ghost button renders

- [ ] **Step 4: Commit**

  ```bash
  rtk git add src/components/landing/StartCreating.tsx src/app/page.tsx
  rtk git commit -m "feat: add StartCreating with scroll-driven gradient background and floating thumbnails"
  ```

---

## Task 6: Wire page.tsx + Remove Old Components

**Files:**
- Modify: `src/app/page.tsx` (final clean version)
- Delete: `src/components/landing/FeatureShowcase.tsx`
- Delete: `src/components/landing/CallToAction.tsx`

- [ ] **Step 1: Rewrite page.tsx with final component order**

  Replace the full contents of `src/app/page.tsx`:

  ```tsx
  import { LandingNav }         from '@/components/landing/LandingNav';
  import { VideoHero }           from '@/components/landing/VideoHero';
  import { LiveCanvasShowcase }  from '@/components/landing/LiveCanvasShowcase';
  import { ModelMarquee }        from '@/components/landing/ModelMarquee';
  import { WhyIceZone }          from '@/components/landing/WhyIceZone';
  import { SceneShowcase }       from '@/components/landing/SceneShowcase';
  import { TemplateShowcase }    from '@/components/landing/TemplateShowcase';
  import { StartCreating }       from '@/components/landing/StartCreating';
  import { LandingFooter }       from '@/components/landing/LandingFooter';

  export default function HomePage() {
    return (
      <main>
        <LandingNav />
        <VideoHero />
        <LiveCanvasShowcase />
        <ModelMarquee />
        <WhyIceZone />
        <SceneShowcase />
        <ModelMarquee />
        <TemplateShowcase />
        <StartCreating />
        <LandingFooter />
      </main>
    );
  }
  ```

- [ ] **Step 2: Delete old components**

  ```bash
  rm src/components/landing/FeatureShowcase.tsx
  rm src/components/landing/CallToAction.tsx
  ```

- [ ] **Step 3: Verify TypeScript + lint + build**

  ```bash
  npx tsc --noEmit
  npm run lint
  rtk next build
  ```

  Expected: No TypeScript errors, no lint errors, build succeeds with all routes.

- [ ] **Step 4: Full visual QA in browser**

  Run `npm run dev`. Scroll through the full page and verify:

  | Check | Expected |
  |-------|----------|
  | ModelMarquee (×2) | Glass band, model names ticker, pauses on hover |
  | WhyIceZone features | 3 columns with icon badges, text from i18n |
  | WhyIceZone image wall | 3D tilt, auto-scroll upward, top/bottom fades |
  | SceneShowcase tabs | 5 tabs, underline slides on click, progress bar fills over 5s |
  | SceneShowcase auto-advance | Advances every 5s, pauses off-screen, resets on click |
  | SceneShowcase video area | Fades out/in on tab switch |
  | TemplateShowcase cards | 6 cards scattered, hover scales up |
  | StartCreating BG | Gradient hue shifts as section enters viewport |
  | StartCreating floats | Cards bob up/down |
  | Language toggle | Switch zh↔en, all new keys translate |
  | Mobile (375px) | No horizontal overflow, feature cols stack |

- [ ] **Step 5: Final commit**

  ```bash
  rtk git add src/app/page.tsx
  rtk git rm src/components/landing/FeatureShowcase.tsx src/components/landing/CallToAction.tsx
  rtk git commit -m "feat: wire landing page lower half with ModelMarquee/WhyIceZone/SceneShowcase/TemplateShowcase/StartCreating"
  ```

---

## Self-Review

**Spec coverage check:**
- ✅ ModelMarquee: Task 1 — frosted glass, marquee-x animation, hover pause
- ✅ WhyIceZone: Task 2 — 3 feature cols, 3D image wall, auto-scroll, fade masks
- ✅ SceneShowcase: Task 3 — 5 marketing tabs, sliding underline, fade video switch
- ✅ TemplateShowcase: Task 4 — scattered absolute cards, official/community badges
- ✅ StartCreating: Task 5 — scroll-driven gradient hue, floating thumbnails, amber + ghost CTAs
- ✅ i18n: Task 0 — all `landing.why/scenes/templates` keys in both zh.json and en.json
- ✅ CSS keyframes: Task 0 — `marquee-x` + `float-card` + utility classes
- ✅ Old components deleted: Task 6
- ✅ Mobile responsive: all components use `md:` breakpoints

**Placeholder scan:** No TBD/TODO/similar in plan steps. Placeholder assets documented inline as comments in code.

**Type consistency:**
- `FEATURES[i].key` used as `landing.why.${f.key}.title` — matches i18n keys `instant/canvas/share` ✅
- `SCENES[i].key` used as `landing.scenes.tabs.${s.key}` — matches i18n keys `film/ads/content/anime/photo` ✅
- `TemplateCard` receives `tpl: Template` and `t: (k: string) => string` — consistent ✅
- `--card-rotate` CSS custom property used in `float-card` keyframes — consistent ✅
