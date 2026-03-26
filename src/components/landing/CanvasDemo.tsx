'use client';

import { useEffect, useState } from 'react';

type NodeData = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  type: 'source' | 'ai' | 'result' | 'video' | 'export';
  color: string;
  icon: React.ReactNode;
  badge?: string;
};

function NodeCard({ node, active }: { node: NodeData; active: boolean }) {
  const colorMap: Record<string, string> = {
    source: 'rgba(59,130,246,0.15)',
    ai: 'rgba(245,150,49,0.15)',
    result: 'rgba(34,211,238,0.12)',
    video: 'rgba(139,92,246,0.15)',
    export: 'rgba(16,185,129,0.12)',
  };

  const borderMap: Record<string, string> = {
    source: 'rgba(59,130,246,0.35)',
    ai: 'rgba(245,150,49,0.45)',
    result: 'rgba(34,211,238,0.3)',
    video: 'rgba(139,92,246,0.35)',
    export: 'rgba(16,185,129,0.3)',
  };

  return (
    <div
      className="absolute rounded-xl border transition-all duration-300"
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        background: colorMap[node.type],
        borderColor: active ? borderMap[node.type] : 'rgba(255,255,255,0.08)',
        boxShadow: active
          ? `0 0 24px -4px ${borderMap[node.type]}, 0 4px 20px rgba(0,0,0,0.4)`
          : '0 4px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Node header */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span className="text-base leading-none">{node.icon}</span>
        <span className="text-[10px] font-medium text-white/70 font-mono tracking-wide truncate">
          {node.label}
        </span>
        {node.badge && (
          <span
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              background: borderMap[node.type],
              color: 'white',
            }}
          >
            {node.badge}
          </span>
        )}
      </div>

      {/* Node content — simulated image/video preview */}
      <div className="m-2 rounded-lg overflow-hidden" style={{ height: node.h - 52 }}>
        {node.type === 'source' && (
          <div className="w-full h-full relative overflow-hidden rounded-lg"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2040 100%)' }}>
            <div className="absolute inset-0 flex items-end p-2">
              <div className="w-full h-12 rounded"
                style={{ background: 'linear-gradient(to top, rgba(59,130,246,0.3), transparent)' }} />
            </div>
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-0.5 p-1.5 opacity-40">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-sm"
                  style={{ background: `hsla(${210 + i * 15},60%,${30 + i * 3}%,0.8)` }} />
              ))}
            </div>
            <div className="absolute bottom-2 left-2 text-[8px] text-white/50 font-mono">
              scene_01.jpg
            </div>
          </div>
        )}

        {node.type === 'ai' && (
          <div className="w-full h-full rounded-lg relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2d1a00 0%, #1a1000 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-6 rounded-full border-2 border-amber/60 border-t-transparent animate-spin" />
                <span className="text-[9px] text-amber/70 font-mono">Generating…</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 text-[8px] text-amber/40 font-mono">
              flux-pro
            </div>
          </div>
        )}

        {node.type === 'result' && (
          <div className="w-full h-full rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0a2a2a 0%, #051515 100%)' }}>
            <div className="absolute inset-4 opacity-70">
              <div className="w-full h-full rounded"
                style={{
                  background: 'linear-gradient(160deg, #22d3ee22, #06b6d422, transparent)',
                  border: '1px solid rgba(34,211,238,0.2)',
                }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)' }} />
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              <span className="text-[8px] text-cyan/60 font-mono">Ready</span>
            </div>
          </div>
        )}

        {node.type === 'video' && (
          <div className="w-full h-full rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a0f2e 0%, #0d0618 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-violet/40 flex items-center justify-center">
                <div className="w-0 h-0 ml-0.5"
                  style={{
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '8px solid rgba(139,92,246,0.8)',
                  }} />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 text-[8px] text-violet/50 font-mono">
              kling-3.0
            </div>
          </div>
        )}

        {node.type === 'export' && (
          <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0a2018 0%, #051008 100%)' }}>
            <div className="flex flex-col items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v10m0 0l-3-3m3 3l3-3" stroke="rgba(16,185,129,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[8px] text-emerald-400/60 font-mono">Export ready</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const NODES: NodeData[] = [
  {
    id: 'source',
    x: 28, y: 60, w: 148, h: 110,
    label: 'Source Image',
    type: 'source',
    color: '#3b82f6',
    icon: '🖼️',
  },
  {
    id: 'ai',
    x: 228, y: 30, w: 148, h: 110,
    label: 'AI Generate',
    type: 'ai',
    color: '#f59631',
    icon: '✨',
    badge: 'AI',
  },
  {
    id: 'result',
    x: 428, y: 50, w: 148, h: 110,
    label: 'Generated',
    type: 'result',
    color: '#22d3ee',
    icon: '🎨',
  },
  {
    id: 'video',
    x: 228, y: 190, w: 148, h: 100,
    label: 'Video Gen',
    type: 'video',
    color: '#8b5cf6',
    icon: '🎬',
    badge: 'Async',
  },
  {
    id: 'export',
    x: 428, y: 200, w: 148, h: 100,
    label: 'Storyboard Export',
    type: 'export',
    color: '#10b981',
    icon: '📤',
  },
];

// Connection paths [from, to] with bezier control points
const CONNECTIONS = [
  { from: { x: 176, y: 115 }, to: { x: 228, y: 85 }, color: 'rgba(59,130,246,0.4)' },
  { from: { x: 376, y: 85 }, to: { x: 428, y: 105 }, color: 'rgba(245,150,49,0.4)' },
  { from: { x: 176, y: 115 }, to: { x: 228, y: 240 }, color: 'rgba(59,130,246,0.25)' },
  { from: { x: 376, y: 240 }, to: { x: 428, y: 250 }, color: 'rgba(139,92,246,0.4)' },
];

export function CanvasDemo() {
  const [activeNode, setActiveNode] = useState<string>('ai');

  useEffect(() => {
    const order = ['source', 'ai', 'result', 'video', 'export'];
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % order.length;
      setActiveNode(order[idx]);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border"
      style={{
        background: '#0d1525',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        height: 340,
      }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Toolbar */}
      <div
        className="absolute top-0 inset-x-0 h-9 flex items-center px-3 gap-2 border-b"
        style={{ background: 'rgba(7,10,16,0.8)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-3">
          {['Select', 'Hand', 'Zoom'].map((tool) => (
            <span key={tool} className="text-[10px] text-white/30 font-mono">{tool}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400/70 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Saved
          </div>
          <span className="text-[10px] text-white/20 font-mono">Share</span>
        </div>
      </div>

      {/* Canvas area */}
      <div className="absolute inset-0 top-9">
        {/* SVG connection lines */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
          {CONNECTIONS.map((conn, i) => {
            const cpX = (conn.from.x + conn.to.x) / 2;
            const cpY1 = conn.from.y;
            const cpY2 = conn.to.y;
            return (
              <g key={i}>
                <path
                  d={`M ${conn.from.x} ${conn.from.y} C ${cpX} ${cpY1}, ${cpX} ${cpY2}, ${conn.to.x} ${conn.to.y}`}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  style={{
                    animation: `flow-path ${2 + i * 0.5}s linear infinite`,
                    strokeDashoffset: 300,
                  }}
                />
                {/* Traveling dot */}
                <circle r="3" fill={conn.color}>
                  <animateMotion
                    dur={`${2.5 + i * 0.4}s`}
                    repeatCount="indefinite"
                    path={`M ${conn.from.x} ${conn.from.y} C ${cpX} ${cpY1}, ${cpX} ${cpY2}, ${conn.to.x} ${conn.to.y}`}
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {NODES.map((node) => (
          <NodeCard key={node.id} node={node} active={activeNode === node.id} />
        ))}

        {/* Minimap */}
        <div
          className="absolute bottom-3 right-3 w-20 h-14 rounded-lg border flex items-center justify-center"
          style={{
            background: 'rgba(7,10,16,0.8)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="scale-[0.18] origin-center opacity-60" style={{ transform: 'scale(0.18)' }}>
            {NODES.map((n) => (
              <div
                key={n.id}
                className="absolute rounded"
                style={{
                  left: n.x,
                  top: n.y,
                  width: n.w,
                  height: n.h,
                  background: 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <span className="text-[8px] text-white/30 font-mono absolute bottom-1 left-1.5">Navigator</span>
        </div>
      </div>
    </div>
  );
}
