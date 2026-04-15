'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type Feature = {
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  accentColor: string;
  tags: string[];
};

const FEATURE_ICONS = {
  imageGen: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 15l5-4 4 3 3-2.5 8 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  videoGen: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 8l5-3v12l-5-3V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  canvas: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5h6M4.5 8v6M17.5 8v6M8 17.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  storyboard: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="3" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="3" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="12" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="12" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const FEATURES: Feature[] = [
  {
    titleKey: 'landing.features.imageGen.title',
    descKey: 'landing.features.imageGen.desc',
    icon: FEATURE_ICONS.imageGen,
    accentColor: '#f59631',
    tags: ['Flux', 'SDXL', 'Midjourney'],
  },
  {
    titleKey: 'landing.features.videoGen.title',
    descKey: 'landing.features.videoGen.desc',
    icon: FEATURE_ICONS.videoGen,
    accentColor: '#3b82f6',
    tags: ['Kling', 'Wan', 'Vidu'],
  },
  {
    titleKey: 'landing.features.canvas.title',
    descKey: 'landing.features.canvas.desc',
    icon: FEATURE_ICONS.canvas,
    accentColor: '#22d3ee',
    tags: ['Node-based', 'Visual'],
  },
  {
    titleKey: 'landing.features.storyboard.title',
    descKey: 'landing.features.storyboard.desc',
    icon: FEATURE_ICONS.storyboard,
    accentColor: '#8b5cf6',
    tags: ['Shot analysis', 'Export'],
  },
];

export function FeatureShowcase() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => card.classList.add('revealed'), i * 100);
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(card);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-24 px-6"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text-hero)', fontFamily: 'var(--font-display)' }}
          >
            {t('landing.features.heading')}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.titleKey}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="scroll-reveal group relative p-6 rounded-2xl border transition-all duration-300 cursor-default"
              style={{
                background: 'var(--color-frame)',
                borderColor: 'var(--color-glass-border)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = feature.accentColor + '40';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px -8px ${feature.accentColor}30`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-glass-border)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                style={{ background: feature.accentColor + '15', color: feature.accentColor }}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--color-text-hero)' }}
              >
                {t(feature.titleKey)}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {t(feature.descKey)}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: feature.accentColor + '12', color: feature.accentColor }}
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
  );
}
