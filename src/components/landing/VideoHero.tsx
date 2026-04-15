'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function VideoHero() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/banner.mp4"
        poster="/banner-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      {/* Gradient overlays for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(7,10,16,0.55) 0%, rgba(7,10,16,0.35) 40%, rgba(7,10,16,0.55) 100%)',
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 animate-reveal-up"
          style={{
            color: 'var(--color-text-hero)',
            fontFamily: 'var(--font-display)',
            animationDelay: '100ms',
          }}
        >
          {t('landing.hero.headline')}
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-reveal-in"
          style={{
            color: 'var(--color-text-secondary)',
            animationDelay: '250ms',
          }}
        >
          {t('landing.hero.subtitle')}
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-reveal-in"
          style={{ animationDelay: '400ms' }}
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto text-sm font-semibold text-white px-7 py-3 rounded-xl transition-all duration-200 hover:brightness-110 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--color-electric), var(--color-violet))', boxShadow: '0 4px 24px rgba(91,118,254,0.35)' }}
          >
            {t('landing.hero.cta')}
          </Link>
          <a
            href="#canvas"
            className="w-full sm:w-auto text-sm font-medium text-white/80 hover:text-white px-7 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors backdrop-blur-sm"
          >
            {t('landing.hero.ctaSecondary')}
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={indicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 transition-opacity duration-500"
        style={{ opacity: scrolled ? 0 : 1 }}
        aria-hidden="true"
      >
        <span className="text-white/40 text-xs tracking-widest uppercase">Scroll</span>
        <svg
          className="animate-bounce"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M10 4v12M10 16l-4-4M10 16l4-4"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
