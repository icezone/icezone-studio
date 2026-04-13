'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function CallToAction() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="scroll-reveal py-24 px-6"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="max-w-3xl mx-auto text-center">
        {/* Decorative glow */}
        <div
          className="w-24 h-1 mx-auto mb-10 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-amber), transparent)' }}
        />

        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: 'var(--color-text-hero)', fontFamily: 'var(--font-display)' }}
        >
          {t('landing.cta.heading')}
        </h2>
        <p className="text-base mb-10" style={{ color: 'var(--color-text-secondary)' }}>
          {t('landing.cta.desc')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto text-sm font-semibold bg-amber text-ink px-8 py-3.5 rounded-xl hover:bg-amber/90 transition-colors animate-pulse-glow"
          >
            {t('landing.cta.signup')}
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto text-sm font-medium text-white/70 hover:text-white px-8 py-3.5 rounded-xl border border-white/15 hover:border-white/30 transition-colors"
          >
            {t('landing.cta.login')}
          </Link>
        </div>
      </div>
    </section>
  );
}
