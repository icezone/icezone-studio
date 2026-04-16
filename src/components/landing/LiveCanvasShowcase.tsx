'use client';

import { useEffect, useRef, useState, useCallback, type PointerEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Upload, Sparkles, Play, Download, ImagePlus } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodePos { x: number; y: number; }

interface DragState {
  nodeId: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 1280;
const CANVAS_H = 720;

const UPLOAD_W = 230;
const UPLOAD_H = 270;
const IMAGE_W  = 440;
const IMAGE_H  = 300;
const VIDEO_W  = 440;
const VIDEO_H  = 300;

const INITIAL_POSITIONS: Record<string, NodePos> = {
  upload: { x: 20,  y: 225 },
  image:  { x: 320, y: 30  },
  video:  { x: 860, y: 320 },
};

// ── Shared styles (mirrors real canvas CSS vars) ───────────────────────────────

const NODE_BG        = '#111827';
const NODE_BORDER    = 'rgba(255,255,255,0.10)';
const NODE_HEADER_BG = 'rgba(26,38,64,0.95)';
const NODE_FG        = '#e2e8f0';
const NODE_FG_MUTED  = '#6b7fa0';
const ACCENT         = '#3b82f6';
const AMBER          = '#f59631';
const HANDLE_SIZE    = 12;

// ── Redirect helper ────────────────────────────────────────────────────────────

function redirectToApp(e: React.MouseEvent | React.PointerEvent) {
  e.stopPropagation();
  window.location.href = '/signup';
}

// ── NodeHandle ─────────────────────────────────────────────────────────────────

function NodeHandle({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        [side]: -HANDLE_SIZE / 2 - 1,
        transform: 'translateY(-50%)',
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: '50%',
        background: ACCENT,
        border: '2px solid #111827',
        zIndex: 10,
        cursor: 'crosshair',
        flexShrink: 0,
      }}
    />
  );
}

// ── DemoNodeHeader ─────────────────────────────────────────────────────────────

function DemoNodeHeader({ icon, title, meta }: { icon: React.ReactNode; title: string; meta?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -28,
        left: 4,
        right: 4,
        zIndex: 10,
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{ color: NODE_FG, display: 'flex', alignItems: 'center', fontSize: 13 }}>{icon}</span>
      <span style={{ color: NODE_FG, fontSize: 14, fontWeight: 400, overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '60%' }}>{title}</span>
      {meta && <span style={{ color: NODE_FG_MUTED, fontSize: 11 }}>{meta}</span>}
    </div>
  );
}

// ── UploadDemoNode ─────────────────────────────────────────────────────────────

function UploadDemoNode({ pos, onPointerDown, selected }: {
  pos: NodePos;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: UPLOAD_W,
        height: UPLOAD_H,
        background: NODE_BG,
        border: `1px solid ${selected ? ACCENT : NODE_BORDER}`,
        borderRadius: 10,
        boxShadow: selected
          ? '0 0 0 1px rgba(91,118,254,0.32), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        cursor: 'grab',
        userSelect: 'none',
        overflow: 'visible',
      }}
    >
      <DemoNodeHeader
        icon={<Upload size={14} />}
        title={t('landing.canvas.nodeUploadTitle')}
        meta={t('landing.canvas.nodeUploadMeta')}
      />
      <NodeHandle side="right" />
      <div style={{ width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <Image
          src="/reference.png"
          alt="reference"
          fill
          style={{ objectFit: 'cover', pointerEvents: 'none' } as React.CSSProperties}
          sizes={`${UPLOAD_W}px`}
          priority
          draggable={false}
        />
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 8px',
          color: NODE_FG_MUTED, fontSize: 10, fontFamily: 'monospace',
          backdropFilter: 'blur(4px)',
        }}>
          1:1
        </div>
      </div>
    </div>
  );
}

// ── ImageEditDemoNode ──────────────────────────────────────────────────────────

function ImageEditDemoNode({ pos, onPointerDown, selected }: {
  pos: NodePos;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  selected: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: IMAGE_W,
        height: IMAGE_H,
        background: NODE_BG,
        border: `1px solid ${selected ? ACCENT : NODE_BORDER}`,
        borderRadius: 10,
        boxShadow: selected
          ? '0 0 0 1px rgba(91,118,254,0.32), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
    >
      <DemoNodeHeader icon={<Sparkles size={14} />} title={t('landing.canvas.nodeImageTitle')} meta="Flux" />
      <NodeHandle side="left" />
      <NodeHandle side="right" />

      {/* Header bar */}
      <div style={{
        background: NODE_HEADER_BG,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '6px 10px',
        borderRadius: '10px 10px 0 0',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <div style={{
          background: 'rgba(245,150,49,0.12)', border: '1px solid rgba(245,150,49,0.25)',
          borderRadius: 6, padding: '1px 8px', color: AMBER, fontSize: 10, fontWeight: 500,
        }}>Flux Pro</div>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${NODE_BORDER}`,
          borderRadius: 6, padding: '1px 8px', color: NODE_FG_MUTED, fontSize: 10,
        }}>1:1</div>
        <button
          onClick={redirectToApp}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            marginLeft: 'auto', background: ACCENT, border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 10px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Sparkles size={10} strokeWidth={2.5} />
          {t('landing.canvas.generate')}
        </button>
      </div>

      {/* Prompt */}
      <div
        onClick={redirectToApp}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          padding: '6px 10px', fontSize: 11.5, color: NODE_FG_MUTED,
          cursor: 'text', flexShrink: 0, lineHeight: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 40,
        }}
      >
        <span style={{ color: ACCENT, marginRight: 4 }}>@图1</span>
        <span>{t('landing.canvas.nodeImagePrompt')}</span>
      </div>

      {/* Image result */}
      <div style={{ flex: 1, position: 'relative', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
        <Image
          src="/demo.png"
          alt="AI generated"
          fill
          style={{ objectFit: 'cover', pointerEvents: 'none' } as React.CSSProperties}
          sizes={`${IMAGE_W}px`}
          draggable={false}
        />
        <button
          onClick={redirectToApp}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6,
            color: NODE_FG, cursor: 'pointer', padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Download size={10} /> {t('landing.canvas.download')}
        </button>
      </div>
    </div>
  );
}

// ── VideoGenDemoNode ───────────────────────────────────────────────────────────

function VideoGenDemoNode({ pos, onPointerDown, selected }: {
  pos: NodePos;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  selected: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: VIDEO_W,
        height: VIDEO_H,
        background: NODE_BG,
        border: `1px solid ${selected ? ACCENT : NODE_BORDER}`,
        borderRadius: 10,
        boxShadow: selected
          ? '0 0 0 1px rgba(91,118,254,0.32), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
    >
      <DemoNodeHeader icon={<Play size={14} />} title={t('landing.canvas.nodeVideoTitle')} meta="Kling" />
      <NodeHandle side="left" />

      {/* Header bar */}
      <div style={{
        background: NODE_HEADER_BG,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '6px 10px',
        borderRadius: '10px 10px 0 0',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <div style={{
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 6, padding: '1px 8px', color: '#8b5cf6', fontSize: 10, fontWeight: 500,
        }}>Kling 1.6</div>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${NODE_BORDER}`,
          borderRadius: 6, padding: '1px 8px', color: NODE_FG_MUTED, fontSize: 10,
        }}>5s</div>
        <button
          onClick={redirectToApp}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            marginLeft: 'auto', background: ACCENT, border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 10px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Sparkles size={10} strokeWidth={2.5} />
          {t('landing.canvas.generate')}
        </button>
      </div>

      {/* Reference strip */}
      <div style={{
        padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
          <Image src="/reference.png" alt="ref" fill style={{ objectFit: 'cover' } as React.CSSProperties} sizes="32px" draggable={false} />
        </div>
        <span style={{ color: NODE_FG_MUTED, fontSize: 10 }}>{t('landing.canvas.nodeVideoRef')}</span>
        <button
          onClick={redirectToApp}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            marginLeft: 'auto', background: 'transparent', border: `1px solid ${NODE_BORDER}`,
            borderRadius: 5, color: NODE_FG_MUTED, fontSize: 10, cursor: 'pointer',
            padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          <ImagePlus size={9} /> {t('landing.canvas.addImage')}
        </button>
      </div>

      {/* Video result */}
      <div style={{ flex: 1, position: 'relative', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: '#000' }}>
        <video
          src="/demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        />
        <button
          onClick={redirectToApp}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6,
            color: NODE_FG, cursor: 'pointer', padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Download size={10} /> {t('landing.canvas.download')}
        </button>
      </div>
    </div>
  );
}

// ── BezierEdge ─────────────────────────────────────────────────────────────────

function BezierEdge({ x1, y1, x2, y2, animated = false }: {
  x1: number; y1: number; x2: number; y2: number; animated?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} opacity={0.5} />
      {animated && (
        <circle r={4} fill={ACCENT} opacity={0.85}>
          <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function LiveCanvasShowcase() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const [positions, setPositions] = useState<Record<string, NodePos>>(INITIAL_POSITIONS);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Scroll reveal
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

  // Scale canvas to fit container width on mobile
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

  // Reset drag state when page becomes visible again (handles back-navigation)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dragRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const startDrag = useCallback((nodeId: string, e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    setSelectedNode(nodeId);
    dragRef.current = {
      nodeId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: positions[nodeId].x,
      originY: positions[nodeId].y,
    };
  }, [positions]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPositions((prev) => ({
      ...prev,
      [drag.nodeId]: { x: drag.originX + dx, y: drag.originY + dy },
    }));
  }, []);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Edge endpoints (right handle of upload → left handle of image/video)
  const uploadRightX = positions.upload.x + UPLOAD_W;
  const uploadMidY   = positions.upload.y + UPLOAD_H / 2;
  const imageLeftX   = positions.image.x;
  const imageMidY    = positions.image.y + IMAGE_H / 2;
  const imageRightX  = positions.image.x + IMAGE_W;
  const videoLeftX   = positions.video.x;
  const videoMidY    = positions.video.y + VIDEO_H / 2;

  return (
    <section
      ref={sectionRef}
      id="canvas"
      className="scroll-reveal py-24 px-4 md:px-6"
      style={{ background: 'var(--color-ink)', overflowX: 'hidden' }}
    >
      <div style={{ maxWidth: CANVAS_W + 48, margin: '0 auto' }}>
        {/* Heading */}
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text-hero)', fontFamily: 'var(--font-display)' }}
          >
            {t('landing.canvas.heading')}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {t('landing.canvas.subtitle')}
          </p>
        </div>

        {/* Canvas window */}
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          background: NODE_BG,
        }}>
          {/* Window chrome */}
          <div style={{
            height: 40, background: 'rgba(17,24,39,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ef4444', '#f59631', '#22c55e'].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <span style={{ color: NODE_FG_MUTED, fontSize: 11, fontFamily: 'monospace', marginLeft: 4 }}>
              {t('landing.canvas.canvasTitle')}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {['+', '⊞', '↺', '↻'].map((icon, i) => (
                <button
                  key={i}
                  onClick={redirectToApp}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6, color: NODE_FG_MUTED, fontSize: 12, width: 26, height: 24,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{icon}</button>
              ))}
              <Link
                href="/signup"
                style={{
                  background: ACCENT, border: 'none', borderRadius: 6,
                  color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 12px',
                  textDecoration: 'none', display: 'flex', alignItems: 'center',
                }}
              >
                {t('landing.canvas.tryFree')}
              </Link>
            </div>
          </div>

          {/* Scale wrapper — controls outer height, collapses correctly on mobile */}
          <div
            ref={scaleWrapperRef}
            style={{
              width: '100%',
              height: CANVAS_H * canvasScale,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Canvas body — fixed CANVAS_W width, scaled via transform */}
            <div
              ref={canvasRef}
              onPointerMove={canvasScale < 1 ? undefined : onPointerMove}
              onPointerUp={canvasScale < 1 ? undefined : stopDrag}
              onPointerLeave={canvasScale < 1 ? undefined : stopDrag}
              onPointerCancel={canvasScale < 1 ? undefined : stopDrag}
              onClick={canvasScale < 1 ? undefined : () => setSelectedNode(null)}
              style={{
                position: 'relative',
                width: CANVAS_W,
                height: CANVAS_H,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                overflow: 'hidden',
                cursor: 'default',
                touchAction: 'none',
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
                pointerEvents: canvasScale < 1 ? 'none' : 'auto',
              }}
            >
              {/* SVG edges */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                <BezierEdge x1={uploadRightX} y1={uploadMidY} x2={imageLeftX} y2={imageMidY} animated />
                <BezierEdge x1={uploadRightX} y1={uploadMidY} x2={videoLeftX} y2={videoMidY} animated />
                <BezierEdge x1={imageRightX} y1={imageMidY} x2={videoLeftX} y2={videoMidY} animated />
              </svg>

              {/* Nodes */}
              <UploadDemoNode
                pos={positions.upload}
                selected={selectedNode === 'upload'}
                onPointerDown={(e) => startDrag('upload', e)}
              />
              <ImageEditDemoNode
                pos={positions.image}
                selected={selectedNode === 'image'}
                onPointerDown={(e) => startDrag('image', e)}
              />
              <VideoGenDemoNode
                pos={positions.video}
                selected={selectedNode === 'video'}
                onPointerDown={(e) => startDrag('video', e)}
              />

              {/* Minimap */}
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                width: 90, height: 60,
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, overflow: 'hidden',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                  backgroundSize: '6px 6px', opacity: 0.6,
                }} />
                {Object.entries(positions).map(([id, pos]) => (
                  <div key={id} style={{
                    position: 'absolute',
                    left: `${(pos.x / CANVAS_W) * 100}%`,
                    top: `${(pos.y / CANVAS_H) * 100}%`,
                    width: 14, height: 9,
                    background: id === selectedNode ? ACCENT : 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                  }} />
                ))}
              </div>

              {/* Drag hint */}
              <div style={{
                position: 'absolute', bottom: 14, left: 14,
                fontSize: 10, color: 'rgba(255,255,255,0.25)',
                fontFamily: 'monospace', pointerEvents: 'none',
              }}>
                {t('landing.canvas.dragHint')}
              </div>
            </div>
          </div>
        </div>

        {/* CTA below canvas */}
        <div className="text-center mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-medium px-6 py-2.5 rounded-xl border transition-colors"
            style={{
              color: 'var(--color-text-hero)',
              borderColor: 'rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            {t('landing.canvas.fullApp')}
          </Link>
        </div>
      </div>
    </section>
  );
}
