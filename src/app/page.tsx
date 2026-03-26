import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';
import { CanvasDemo } from '@/components/landing/CanvasDemo';

// ─── Feature Cards ───────────────────────────────────────
const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2l2.4 7.4H21l-6.2 4.5 2.4 7.4L11 17l-6.2 4.3 2.4-7.4L1 9.4h7.6L11 2z"
          stroke="#f59631" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    color: 'amber',
    title: 'AI Image Generation',
    desc: 'Generate photorealistic images from text prompts using Flux, DALL-E, Stable Diffusion, and more — all on a single canvas.',
    tags: ['Flux Pro', 'DALL-E 3', 'SD XL'],
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="4" width="18" height="14" rx="2" stroke="#3b82f6" strokeWidth="1.5" />
        <path d="M9 8.5l5 3-5 3V8.5z" fill="#3b82f6" />
      </svg>
    ),
    color: 'electric',
    title: 'AI Video Generation',
    desc: 'Transform still images into cinematic videos with Kling 3.0, Sora2, and Veo 3.1. Full async task tracking with progress.',
    tags: ['Kling 3.0', 'Sora2', 'Veo 3.1'],
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="1" width="9" height="9" rx="2" stroke="#22d3ee" strokeWidth="1.5" />
        <rect x="12" y="1" width="9" height="9" rx="2" stroke="#22d3ee" strokeWidth="1.5" />
        <rect x="1" y="12" width="9" height="9" rx="2" stroke="#22d3ee" strokeWidth="1.5" />
        <rect x="12" y="12" width="9" height="9" rx="2" stroke="#22d3ee" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="2" fill="#22d3ee" />
      </svg>
    ),
    color: 'cyan',
    title: 'Node Canvas Workflow',
    desc: 'Visual node-based canvas — connect images, tools, and AI models like building blocks. See your creative process at a glance.',
    tags: ['Drag & Drop', 'Auto-save', 'History'],
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 6h18M2 11h12M2 16h8" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18" cy="15" r="3" stroke="#8b5cf6" strokeWidth="1.5" />
        <path d="M20.5 17.5l2 2" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'violet',
    title: 'Storyboard Tools',
    desc: 'Split images into panels, add annotations, crop and merge frames. Everything you need to craft a production-ready storyboard.',
    tags: ['Split', 'Annotate', 'Merge'],
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2C6.03 2 2 6.03 2 11s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" stroke="#f59631" strokeWidth="1.5" />
        <path d="M11 7v4l3 3" stroke="#f59631" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'amber',
    title: 'Async Job Tracking',
    desc: 'Long-running AI jobs run in the background. Real-time status updates via Supabase Realtime push. Never wait at a loading screen.',
    tags: ['Realtime', 'Polling', 'Webhook'],
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 16l4-4 4 4 6-8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="16" r="1.5" fill="#10b981" />
        <circle cx="8" cy="12" r="1.5" fill="#10b981" />
        <circle cx="12" cy="16" r="1.5" fill="#10b981" />
        <circle cx="18" cy="8" r="1.5" fill="#10b981" />
      </svg>
    ),
    color: 'emerald',
    title: 'Auto-save & Sync',
    desc: 'Your work saves automatically — locally with IndexedDB and remotely to Supabase. Offline-first with conflict resolution.',
    tags: ['IndexedDB', 'Supabase', 'Offline'],
  },
];

// ─── Workflow Steps ──────────────────────────────────────
const steps = [
  {
    number: '01',
    title: 'Start on the Canvas',
    desc: 'Upload reference images or start from a blank canvas. Add nodes for each scene, character, or concept in your storyboard.',
    accent: '#f59631',
  },
  {
    number: '02',
    title: 'Generate with AI',
    desc: 'Connect your nodes to AI generation models. Describe what you want — the AI renders images and videos to match your vision.',
    accent: '#3b82f6',
  },
  {
    number: '03',
    title: 'Refine & Export',
    desc: 'Annotate frames, split panels, adjust compositions. When ready, export your storyboard as a complete sequence.',
    accent: '#22d3ee',
  },
];

// ─── Pricing Tiers ───────────────────────────────────────
const plans = [
  {
    name: 'Free',
    price: '0',
    period: 'forever',
    desc: 'Perfect for exploring and small projects.',
    features: [
      '100 image generation credits / mo',
      '3 canvas projects',
      'Basic AI models (SD XL)',
      'PNG / JPEG export',
      'Community support',
    ],
    cta: 'Start for free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '29',
    period: '/ month',
    desc: 'For creators and professionals who ship.',
    features: [
      '2,000 credits / mo',
      'Unlimited projects',
      'All AI image models incl. Flux Pro',
      'Video generation (Kling, Veo)',
      'Priority processing',
      'Email & chat support',
    ],
    cta: 'Start Pro trial',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '99',
    period: '/ month',
    desc: 'For teams and high-volume production.',
    features: [
      'Unlimited credits',
      'Team workspaces',
      'All video models + Sora2',
      'API access',
      'Custom model fine-tuning',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact us',
    href: '/signup?plan=studio',
    highlighted: false,
  },
];

// ─── Stats ────────────────────────────────────────────────
const stats = [
  { value: '10M+', label: 'Images generated' },
  { value: '50K+', label: 'Active creators' },
  { value: '150+', label: 'AI models' },
  { value: '6', label: 'Video providers' },
];

// ─── Use Cases ───────────────────────────────────────────
const useCases = [
  {
    emoji: '🎬',
    title: 'Film & Animation',
    desc: 'Pre-visualize scenes before expensive production days.',
  },
  {
    emoji: '📱',
    title: 'Content Creation',
    desc: 'Batch-generate social media visuals at scale.',
  },
  {
    emoji: '🎮',
    title: 'Game Concept Art',
    desc: 'Iterate character and environment designs rapidly.',
  },
  {
    emoji: '📖',
    title: 'Graphic Novels',
    desc: 'Draft sequential art panels with consistent style.',
  },
];

// ─── Page ─────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#070a10', color: '#e8eeff', fontFamily: 'var(--font-geist-sans)' }}
    >
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-6 mesh-bg">
        {/* Background grid */}
        <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-2/3 right-1/4 w-[300px] h-[200px] rounded-full opacity-[0.05] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #f59631 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8 animate-reveal-up"
            style={{ background: 'rgba(245,150,49,0.08)', borderColor: 'rgba(245,150,49,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            <span className="text-xs text-amber font-medium tracking-wide">Now with Kling 3.0 · Sora2 · Veo 3.1</span>
          </div>

          {/* Main headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-800 leading-[1.05] tracking-tight mb-6 animate-reveal-up delay-100"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            <span className="text-white">The AI Canvas</span>
            <br />
            <span className="landing-gradient-text">for Storytellers</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-muted leading-relaxed mb-10 animate-reveal-up delay-200">
            A node-based creative studio where you generate images, produce videos,
            and craft perfect storyboards — all powered by the world&apos;s best AI models.
            No subscriptions to multiple tools. One canvas, infinite possibilities.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-reveal-up delay-300">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-ink text-base transition-all hover:scale-105 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f59631, #fb923c)',
                boxShadow: '0 4px 24px rgba(245,150,49,0.35)',
              }}
            >
              Start creating free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l7 7-7 7-1.4-1.4L12.2 8.5H1V7.5h11.2L6.6 2.4 8 1z" />
              </svg>
            </Link>
            <a
              href="#workflow"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-base border transition-all hover:border-white/20 hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b7fa0' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="currentColor" />
              </svg>
              See how it works
            </a>
          </div>

          {/* Canvas demo */}
          <div className="animate-reveal-in delay-400 max-w-4xl mx-auto">
            <CanvasDemo />
          </div>

          <p className="mt-4 text-xs text-muted/50 animate-reveal-up delay-600">
            Live canvas preview — this is what you&apos;ll build with
          </p>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="border-y" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-3xl font-800 mb-1 landing-gradient-text"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-xs font-medium text-electric uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              Everything in one place
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              One studio, every tool
            </h2>
            <p className="max-w-xl mx-auto text-muted text-lg">
              Stop juggling between apps. Generate, edit, annotate, and export your
              storyboard without leaving the canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl p-6 border transition-all duration-300 cursor-default card-glow-amber"
                style={{
                  background: 'rgba(13,21,37,0.6)',
                  borderColor: 'rgba(255,255,255,0.07)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {f.icon}
                </div>

                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed mb-4">{f.desc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="py-24 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-block text-xs font-medium text-amber uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ background: 'rgba(245,150,49,0.08)', border: '1px solid rgba(245,150,49,0.2)' }}>
              How it works
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              From prompt to storyboard
            </h2>
            <p className="text-muted text-lg">Three steps to your best creative work.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div
              className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px"
              style={{ background: 'linear-gradient(90deg, #f59631, #3b82f6, #22d3ee)' }}
            />

            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step number circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-6 relative z-10"
                  style={{
                    background: '#0d1525',
                    border: `2px solid ${step.accent}`,
                    color: step.accent,
                    fontFamily: 'var(--font-display)',
                    boxShadow: `0 0 24px -4px ${step.accent}55`,
                  }}
                >
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-3"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              Built for every creative
            </h2>
            <p className="text-muted">Whatever you make, Storyboard Copilot fits your workflow.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="rounded-2xl p-5 border text-center transition-all hover:border-white/15"
                style={{ background: 'rgba(13,21,37,0.5)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="text-3xl mb-3">{uc.emoji}</div>
                <div className="text-sm font-semibold text-white mb-1.5">{uc.title}</div>
                <div className="text-xs text-muted leading-relaxed">{uc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-xs font-medium text-violet uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              Simple pricing
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              Start free, scale as you grow
            </h2>
            <p className="text-muted text-lg">No surprise bills. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-2xl border p-7 transition-all"
                style={{
                  background: plan.highlighted
                    ? 'linear-gradient(135deg, rgba(245,150,49,0.08) 0%, rgba(251,146,60,0.04) 100%)'
                    : 'rgba(13,21,37,0.6)',
                  borderColor: plan.highlighted
                    ? 'rgba(245,150,49,0.35)'
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: plan.highlighted
                    ? '0 0 60px -20px rgba(245,150,49,0.2)'
                    : 'none',
                }}
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full text-ink"
                    style={{ background: 'linear-gradient(135deg, #f59631, #fb923c)' }}
                  >
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <div className="text-sm font-medium text-muted mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-bold text-white"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                    >
                      ${plan.price}
                    </span>
                    <span className="text-sm text-muted">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted mt-2">{plan.desc}</p>
                </div>

                <Link
                  href={plan.href}
                  className="block text-center py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all"
                  style={
                    plan.highlighted
                      ? {
                          background: 'linear-gradient(135deg, #f59631, #fb923c)',
                          color: '#070a10',
                          boxShadow: '0 4px 16px rgba(245,150,49,0.3)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          color: '#e8eeff',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }
                  }
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-muted">
                      <svg
                        className="shrink-0 mt-0.5"
                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                      >
                        <path d="M2.5 7l3 3 6-6" stroke={plan.highlighted ? '#f59631' : '#6b7fa0'}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6">
        <div
          className="max-w-4xl mx-auto rounded-3xl border p-12 md:p-16 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245,150,49,0.06) 0%, rgba(59,130,246,0.04) 100%)',
            borderColor: 'rgba(245,150,49,0.2)',
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,150,49,0.06) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-5"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
            >
              Start creating today
            </h2>
            <p className="text-lg text-muted mb-8 max-w-xl mx-auto">
              Join thousands of creators who use Storyboard Copilot to bring their
              ideas to life. Free plan includes 100 credits — no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 rounded-xl font-semibold text-ink text-base transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #f59631, #fb923c)',
                  boxShadow: '0 8px 32px rgba(245,150,49,0.35)',
                }}
              >
                Create your first storyboard →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl font-medium text-base border transition-all hover:border-white/20 hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b7fa0' }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 py-12"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <rect x="1" y="1" width="6" height="5" rx="1" fill="#070a10" />
                    <rect x="11" y="1" width="6" height="5" rx="1" fill="#070a10" />
                    <rect x="1" y="12" width="6" height="5" rx="1" fill="#070a10" />
                    <rect x="11" y="12" width="6" height="5" rx="1" fill="#070a10" />
                    <circle cx="9" cy="9" r="2" fill="#070a10" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Storyboard<span className="text-amber">Copilot</span>
                </span>
              </Link>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                The AI creative studio for storytellers. Generate, edit, and export
                stunning storyboards powered by cutting-edge AI.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact'],
              },
              {
                title: 'Legal',
                links: ['Privacy', 'Terms', 'Cookies'],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
                  {col.title}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-muted">
              © 2026 Storyboard Copilot. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {['Twitter', 'GitHub', 'Discord'].map((social) => (
                <a key={social} href="#" className="text-xs text-muted hover:text-white transition-colors">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
