# Mobile Responsive Landing (VideoHero + LiveCanvasShowcase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix VideoHero and LiveCanvasShowcase to render correctly on mobile browsers without layout overflow or cropped video.

**Architecture:**
- VideoHero: adjust section height on mobile so a landscape video isn't extreme-portrait-cropped; `object-fit: cover` already exists but the full `h-screen` (100vh) on portrait mobile creates a very tall crop. Use `h-[70vh] min-h-[500px] sm:h-screen` to limit portrait crop on small screens.
- LiveCanvasShowcase: the canvas body is laid out for `CANVAS_W=1280px` with nodes at fixed pixel positions. On mobile, add a wrapper that scales the entire canvas down using `transform: scale(ratio)` + `transform-origin: top left`, sized so the container height collapses to match. Disable drag on mobile (pointer events none on canvas body when scaled). Uses a `ResizeObserver` to compute the live scale ratio.

**Tech Stack:** React, TypeScript, Tailwind CSS, inline styles (existing pattern in both components)

---

## Task 1: Fix VideoHero height on mobile

**Files:**
- Modify: `src/components/landing/VideoHero.tsx:22`

The section currently uses `h-screen` (= `100vh`). On a portrait mobile screen (e.g. 390×844px), this creates a very tall container around a landscape video, causing `object-fit: cover` to show only the middle strip. Changing to `h-[70vh] min-h-[500px] sm:h-screen` limits the crop on mobile while keeping full-screen on desktop.

- [ ] **Step 1: Update the section className**

In `src/components/landing/VideoHero.tsx`, change line 22:

```tsx
// Before
<section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">

// After
<section className="relative w-full h-[70vh] min-h-[500px] sm:h-screen flex items-center justify-center overflow-hidden">
```

- [ ] **Step 2: Verify locally**

Run `npm run dev` and open `http://localhost:3000` in Chrome DevTools with a mobile viewport (e.g. iPhone 12 Pro, 390×844). Confirm the hero section shows more of the video width rather than a narrow center strip. Desktop (`sm:` and above) should still be full-screen.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/VideoHero.tsx
git commit -m "fix: limit VideoHero height on mobile to reduce landscape video crop"
```

---

## Task 2: Scale LiveCanvasShowcase on mobile

**Files:**
- Modify: `src/components/landing/LiveCanvasShowcase.tsx`

The canvas body has `width: '100%'` but nodes are positioned at absolute coordinates designed for `CANVAS_W=1280px`. On mobile (~390px wide), nodes like the video node at `x=860` are far off screen. 

Fix: wrap the canvas body in a `scaleWrapperRef` div, use a `ResizeObserver` to compute `scale = containerWidth / CANVAS_W`, apply `transform: scale(scale) / transform-origin: top left` to the canvas body, and set the wrapper's height to `CANVAS_H * scale` so the container collapses correctly. Disable pointer events on the canvas body when `scale < 1` (mobile static view).

- [ ] **Step 1: Add scale state and ResizeObserver**

At the top of `LiveCanvasShowcase()` (after existing refs), add:

```tsx
const scaleWrapperRef = useRef<HTMLDivElement>(null);
const [canvasScale, setCanvasScale] = useState(1);

useEffect(() => {
  const el = scaleWrapperRef.current;
  if (!el) return;
  const observer = new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width;
    setCanvasScale(Math.min(1, w / CANVAS_W));
  });
  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 2: Wrap the canvas body with a scale wrapper**

Find the canvas window `<div>` (the one with `borderRadius: 16, overflow: 'hidden'`). Replace its inner structure so the canvas body is wrapped:

```tsx
{/* Canvas window */}
<div style={{
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
  background: NODE_BG,
}}>
  {/* Window chrome — unchanged */}
  <div style={{ height: 40, background: 'rgba(17,24,39,0.95)', /* ... existing styles */ }}>
    {/* ... existing chrome content unchanged ... */}
  </div>

  {/* Scale wrapper — controls outer height */}
  <div
    ref={scaleWrapperRef}
    style={{
      width: '100%',
      height: CANVAS_H * canvasScale,
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {/* Canvas body — fixed width, scaled down */}
    <div
      ref={canvasRef}
      onPointerMove={canvasScale < 1 ? undefined : onPointerMove}
      onPointerUp={canvasScale < 1 ? undefined : stopDrag}
      onPointerLeave={canvasScale < 1 ? undefined : stopDrag}
      onPointerCancel={canvasScale < 1 ? undefined : stopDrag}
      onClick={() => setSelectedNode(null)}
      style={{
        position: 'relative',
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        overflow: 'hidden',
        cursor: canvasScale < 1 ? 'default' : 'default',
        touchAction: 'none',
        transform: `scale(${canvasScale})`,
        transformOrigin: 'top left',
        pointerEvents: canvasScale < 1 ? 'none' : 'auto',
      }}
    >
      {/* SVG edges, nodes, minimap, drag hint — all unchanged */}
    </div>
  </div>
</div>
```

**Important:** The `ref={canvasRef}` moves to the inner fixed-width div. The `scaleWrapperRef` is on the outer div that measures available width.

- [ ] **Step 3: Verify locally**

Open DevTools in mobile viewport (390px wide). Confirm:
- The canvas shrinks to fit the screen width
- All three nodes are visible (no horizontal overflow)
- Scroll bar does not appear on the canvas section
- On desktop (≥1280px), `canvasScale === 1` and canvas behaves exactly as before (draggable)

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LiveCanvasShowcase.tsx
git commit -m "fix: scale LiveCanvasShowcase canvas to fit mobile viewport"
```

---

## Task 3: Deploy and verify

- [ ] **Step 1: Push to trigger CI/CD**

```bash
git push
```

- [ ] **Step 2: Confirm CI passes**

```bash
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: all jobs green, production deployment succeeds.

- [ ] **Step 3: Check live URL on mobile**

Open `https://icezone-studio.vercel.app` on a real mobile device or Chrome DevTools mobile emulation. Verify:
- VideoHero shows a reasonable portion of the video (not just a center strip)
- LiveCanvasShowcase canvas fits within the screen width, all nodes visible
- No horizontal scroll on the page
