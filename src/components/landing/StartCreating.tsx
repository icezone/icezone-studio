'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Link from 'next/link';

// Gallery images for floating decorations
const FLOATING_IMAGES = [
  '/gallery/sunrise.webp',
  '/gallery/gothic_clay.webp',
  '/gallery/steampunk.webp',
  '/gallery/risograph.webp',
  '/gallery/monochrome.webp',
  '/gallery/dynamite.webp',
];

// Each floating card gets a unique position, tilt, and animation delay
const FLOAT_CONFIG = [
  { top: '5%',  left: '3%',   delay: '0s',   size: 160, rotate: '-12deg' },
  { top: '58%', left: '1%',   delay: '0.8s', size: 140, rotate: '8deg'   },
  { top: '15%', right: '2%',  delay: '1.5s', size: 155, rotate: '14deg'  },
  { top: '55%', right: '3%',  delay: '0.4s', size: 145, rotate: '-9deg'  },
  { top: '2%',  right: '22%', delay: '2.0s', size: 130, rotate: '6deg'   },
  { top: '68%', left: '20%',  delay: '1.2s', size: 135, rotate: '-15deg' },
];

export function StartCreating() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
      { threshold: 0.2, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #070a10 0%, #0d1525 25%, #111827 50%, #0d1525 75%, #070a10 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient-drift 8s ease infinite',
          zIndex: 0,
        }}
      />

      {/* Color glow blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      >
        <div
          className="absolute w-96 h-96 rounded-full opacity-20"
          style={{
            top: '-10%',
            left: '10%',
            background: 'radial-gradient(circle, var(--color-electric), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-15"
          style={{
            bottom: '-5%',
            right: '15%',
            background: 'radial-gradient(circle, var(--color-violet), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Floating gallery images — hidden on mobile to avoid overlap */}
      <div
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{ zIndex: 2 }}
        aria-hidden="true"
      >
        {FLOATING_IMAGES.map((src, i) => {
          const cfg = FLOAT_CONFIG[i];
          return (
            // Outer: positioning + rotate (static)
            <div
              key={src}
              className="absolute"
              style={{
                top: cfg.top,
                left: (cfg as { left?: string }).left,
                right: (cfg as { right?: string }).right,
                width: cfg.size,
                height: cfg.size,
                transform: `rotate(${cfg.rotate})`,
              }}
            >
              {/* Inner: float animation (translateY only, doesn't fight rotate) */}
              <div
                className="w-full h-full rounded-2xl overflow-hidden"
                style={{
                  position: 'relative',
                  animation: `float-card 3s ease-in-out infinite`,
                  animationDelay: cfg.delay,
                  willChange: 'transform',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  opacity: 0.85,
                }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes={`${cfg.size}px`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA content */}
      <div
        ref={contentRef}
        className="scroll-reveal relative z-10 max-w-2xl mx-auto px-6 text-center"
      >
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          {t('landing.startCreating.headline')}
        </h2>
        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-10 max-w-xl mx-auto">
          {t('landing.startCreating.description')}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-semibold text-white transition-all duration-200 hover:scale-105 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, var(--color-electric), var(--color-violet))',
              boxShadow: '0 4px 24px rgba(59,130,246,0.35)',
            }}
          >
            {t('landing.startCreating.primaryButton')}
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-medium transition-all duration-200 hover:bg-white/10"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            {t('landing.startCreating.secondaryButton')}
          </Link>
        </div>
      </div>
    </section>
  );
}
