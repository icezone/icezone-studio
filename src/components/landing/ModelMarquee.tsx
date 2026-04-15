'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';

const MODEL_LOGOS = [
  { id: 'nano',       src: '/models/nano.svg',        key: 'nano' },
  { id: 'sora',       src: '/models/sora.svg',        key: 'sora' },
  { id: 'kling',      src: '/models/kling.svg',       key: 'kling' },
  { id: 'grok',       src: '/models/grok.svg',        key: 'grok' },
  { id: 'veo',        src: '/models/veo.svg',         key: 'veo' },
  { id: 'elevenlabs', src: '/models/elevenlabs.svg',  key: 'elevenlabs' },
  { id: 'seed',       src: '/models/seed.svg',        key: 'seed' },
];

// Duplicate for seamless loop — marquee-x animates translateX(0 → -50%)
const LOGOS = [...MODEL_LOGOS, ...MODEL_LOGOS];

export function ModelMarquee() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--color-ink)' }}>
      {/* Top border */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Marquee track */}
        <div className="relative overflow-hidden py-5" aria-hidden="true">
          <div
            className="flex items-center will-change-transform"
            style={{
              gap: '3.5rem',
              animation: 'marquee-x 28s linear infinite',
              width: 'max-content',
            }}
          >
            {LOGOS.map((logo, i) => (
              <div
                key={`${logo.id}-${i}`}
                className="flex items-center gap-3 shrink-0"
              >
                {/* Logo — force white via brightness(0) invert(1) */}
                <div className="relative w-10 h-10 shrink-0">
                  <Image
                    src={logo.src}
                    alt=""
                    width={40}
                    height={40}
                    className="object-contain"
                    style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
                  />
                </div>
                {/* Name */}
                <span
                  className="text-xl font-semibold whitespace-nowrap"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {t(`landing.models.${logo.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Title below scroll bar */}
      <p
        className="text-center text-sm font-medium tracking-widest uppercase py-3"
        style={{ color: 'var(--color-muted)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        {t('landing.models.title')}
      </p>

      {/* Edge fade masks */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
        style={{ background: 'linear-gradient(to right, var(--color-ink), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
        style={{ background: 'linear-gradient(to left, var(--color-ink), transparent)' }}
      />
    </section>
  );
}
