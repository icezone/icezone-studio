'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SceneTab {
  id: string;
  label: string;
}

const SCENE_IDS = ['ads', 'anime', 'film', 'content', 'photo'];

const SCENE_VIDEOS: Record<string, string> = {
  ads:     '/scenes/ads.mp4',
  anime:   '/scenes/anime.mp4',
  film:    '/scenes/film.mp4',
  content: '/scenes/content.mp4',
  photo:   '/scenes/photo.mp4',
};

const INTERVAL_MS = 5000;

export function SceneShowcase() {
  const { t } = useTranslation();
  const tabs = t('landing.scenes.tabs', { returnObjects: true }) as SceneTab[];

  const [activeIndex, setActiveIndex] = useState(0);
  const slideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  // Start (or restart) the 5s auto-advance
  const startTimers = useCallback(() => {
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % SCENE_IDS.length);
    }, INTERVAL_MS);
  }, []);

  // Restart timer whenever active slide changes
  useEffect(() => {
    startTimers();
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [activeIndex, startTimers]);

  const handleTabClick = (i: number) => {
    setActiveIndex(i); // triggers useEffect above which restarts timers
  };

  // Scroll-reveal for heading
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="overflow-hidden" style={{ background: 'var(--color-ink)' }}>
      {/* Heading */}
      <div ref={headingRef} className="scroll-reveal text-center pt-24 pb-12 px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t('landing.scenes.title')}
        </h2>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-muted)' }}>
          {t('landing.scenes.subtitle')}
        </p>
      </div>

      {/* Carousel track — no frame, edge-to-edge */}
      <div className="relative overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {SCENE_IDS.map((id) => (
            <div key={id} className="min-w-full shrink-0">
              {/* Main video — autoplay, muted, no controls, no focus highlight */}
              <div className="relative w-full" style={{ aspectRatio: '16/9', maxHeight: 540 }}>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover block"
                  style={{ outline: 'none', pointerEvents: 'none' }}
                >
                  <source src={SCENE_VIDEOS[id]} type="video/mp4" />
                </video>
              </div>

              {/* Reflection — flipped, 60px tall, fades to black */}
              <div className="relative overflow-hidden" style={{ height: 60 }}>
                <div style={{ transform: 'scaleY(-1)', transformOrigin: 'top center' }}>
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                    tabIndex={-1}
                    className="w-full block object-cover"
                    style={{ aspectRatio: '16/9', maxHeight: 540, opacity: 0.4, pointerEvents: 'none' }}
                  >
                    <source src={SCENE_VIDEOS[id]} type="video/mp4" />
                  </video>
                </div>
                {/* Gradient mask */}
                <div
                  className="absolute inset-0 z-10"
                  style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--color-ink) 100%)' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Left shade */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10"
          style={{
            width: '25%',
            background: 'linear-gradient(to right, #070a10 0%, rgba(7,10,16,0.92) 20%, rgba(7,10,16,0.75) 40%, rgba(7,10,16,0.45) 60%, rgba(7,10,16,0.15) 80%, transparent 100%)',
          }}
        />
        {/* Right shade */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10"
          style={{
            width: '25%',
            background: 'linear-gradient(to left, #070a10 0%, rgba(7,10,16,0.92) 20%, rgba(7,10,16,0.75) 40%, rgba(7,10,16,0.45) 60%, rgba(7,10,16,0.15) 80%, transparent 100%)',
          }}
        />
      </div>

      {/* Tab labels — flush to video, no background frame */}
      <div className="pb-16 pt-2 px-6">
        <div className="flex items-center justify-center flex-wrap gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(i)}
              className="relative px-6 py-2 text-xl font-semibold transition-colors duration-200"
              style={{ color: activeIndex === i ? 'white' : 'var(--color-muted)' }}
            >
              {tab.label}
              {activeIndex === i && (
                <span
                  className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full"
                  style={{ background: 'var(--color-electric)' }}
                />
              )}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
