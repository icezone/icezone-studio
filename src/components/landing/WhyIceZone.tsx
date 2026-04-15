'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

// All gallery images — distributed across 4 columns
const ALL_IMAGES = [
  '/gallery/allien.jpg',
  '/gallery/anime.jpg',
  '/gallery/banana.jpg',
  '/gallery/bike.jpg',
  '/gallery/car.jpg',
  '/gallery/cat.jpg',
  '/gallery/city.jpg',
  '/gallery/cute.jpg',
  '/gallery/cyborg.webp',
  '/gallery/dessert.jpg',
  '/gallery/dino.jpg',
  '/gallery/dragon.png',
  '/gallery/dream.jpg',
  '/gallery/robot.jpg',
  '/gallery/ship.jpg',
  '/gallery/soldier.jpg',
  '/gallery/fox.jpg',
  '/gallery/gothic_clay.webp',
  '/gallery/lava.jpg',
  '/gallery/monochrome.webp',
  '/gallery/mythic_fighter.webp',
  '/gallery/risograph.webp',
  '/gallery/steampunk.webp',
  '/gallery/sunrise.webp',
  '/gallery/water.jpg',
  '/gallery/dynamite.webp',
];

// 4 columns — each gets a slice of images, duplicated for seamless loop
const COLUMNS = [0, 1, 2, 3].map((col) => {
  const imgs = ALL_IMAGES.filter((_, i) => i % 4 === col);
  return [...imgs, ...imgs]; // duplicate for seamless loop
});


const FEATURE_ICONS = [
  // Layers / multi-model
  <svg key="layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M2 12l10 6 10-6"/>
    <path d="M2 17l10 6 10-6"/>
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  </svg>,
  // Nodes / workflow
  <svg key="nodes" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
    <path d="M7 12h4m2 0h1M17 6.5l-4 3.5M17 17.5l-4-3.5"/>
  </svg>,
  // Sparkle / one-click magic
  <svg key="sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>,
];

export function WhyIceZone() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  // Scroll-driven parallax on the wall
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      const wall = wallRef.current;
      if (!section || !wall) return;
      const rect = section.getBoundingClientRect();
      const progress = -rect.top; // px scrolled past top of section
      // Move wall upward as user scrolls down — 0.7 gives visible motion
      wall.style.transform = `rotateX(18deg) translateY(${progress * 0.7}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-reveal for foreground cards
  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean);
    if (!cards.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  const features = t('landing.why.features', { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  return (
    <section
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
      style={{ background: 'var(--color-surface)' }}
    >
      {/* ── Image wall ── */}
      <div
        className="absolute inset-0 overflow-hidden"
        aria-hidden="true"
        style={{
          zIndex: 0,
          // Perspective container — makes rotateX look 3-D
          perspective: '1100px',
          perspectiveOrigin: '50% 40%',
        }}
      >
        {/* This div is the rotated wall; JS scroll updates its transform */}
        <div
          ref={wallRef}
          className="absolute inset-0 flex gap-2 px-1"
          style={{
            transformOrigin: '50% 50%',
            transform: 'rotateX(18deg)',
            // Pull the wall up a little so it fills the section from behind
            top: '-15%',
            bottom: '-15%',
            height: '130%',
          }}
        >
          {COLUMNS.map((imgs, colIdx) => {
            return (
              <div
                key={colIdx}
                className="flex-1 flex flex-col gap-2"
                style={{ opacity: 0.55 }}
              >
                {imgs.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative rounded-lg overflow-hidden shrink-0"
                    style={{ aspectRatio: '4/3' }}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 12vw"
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-to-bottom shade: dark at top, transparent at bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'linear-gradient(to bottom, var(--color-surface) 0%, rgba(13,21,37,0.85) 20%, rgba(13,21,37,0.55) 40%, rgba(13,21,37,0.25) 65%, transparent 100%)',
        }}
      />

      {/* Foreground content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Heading */}
        <div
          ref={(el) => { if (el) cardsRef.current[0] = el; }}
          className="scroll-reveal text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('landing.why.title')}
          </h2>
          <p className="text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
            {t('landing.why.subtitle')}
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              ref={(el) => { if (el) cardsRef.current[i + 1] = el; }}
              className="scroll-reveal"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div
                className="h-full rounded-2xl p-6 transition-all duration-300 cursor-default"
                style={{
                  background: 'var(--color-glass)',
                  border: '1px solid var(--color-glass-border)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.18)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid var(--color-glass-border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                <div className="flex justify-center mb-5">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-electric), var(--color-violet))',
                      boxShadow: '0 4px 16px rgba(91,118,254,0.35)',
                      color: '#fff',
                    }}
                  >
                    {FEATURE_ICONS[i]}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed text-center">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
