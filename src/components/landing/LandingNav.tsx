'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

function LanguageToggle() {
  // Always start with 'zh' to match SSR — read real value in useEffect after hydration
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('i18n-lang') as 'zh' | 'en' | null;
    const resolved = saved ?? (navigator.language.startsWith('zh') ? 'zh' : 'en');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(resolved);
    i18n.changeLanguage(resolved);
  }, []);

  const toggle = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    i18n.changeLanguage(next);
    localStorage.setItem('i18n-lang', next);
  };

  return (
    <button
      onClick={toggle}
      className="text-xs font-medium text-muted hover:text-white transition-colors px-2 py-1 rounded border border-border hover:border-white/20"
      aria-label="Switch language"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export function LandingNav() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { labelKey: 'landing.nav.features', href: '#features' },
    { labelKey: 'landing.nav.canvas', href: '#canvas' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-ink/85 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/LOGO.png"
            alt="IceZone Studio"
            width={32}
            height={32}
            className="rounded-lg object-cover shrink-0"
          />
          <span
            className="text-white font-bold text-base tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            IceZone<span style={{
              background: 'linear-gradient(135deg, var(--color-electric), var(--color-violet))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}> Studio</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.labelKey}
              href={link.href}
              className="text-sm text-muted hover:text-white transition-colors duration-200"
            >
              {t(link.labelKey)}
            </a>
          ))}
        </div>

        {/* Desktop CTA + Language switcher */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="text-sm text-muted hover:text-white transition-colors px-3 py-1.5"
          >
            {t('landing.nav.signIn')}
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-all duration-200 hover:brightness-110 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--color-electric), var(--color-violet))', boxShadow: '0 4px 16px rgba(91,118,254,0.35)' }}
          >
            {t('landing.nav.startFree')}
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageToggle />
          <button
            className="text-muted hover:text-white transition-colors p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileOpen ? (
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ink/95 backdrop-blur-xl border-b border-border px-6 pb-4">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <a
                key={link.labelKey}
                href={link.href}
                className="text-sm text-muted hover:text-white transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                {t(link.labelKey)}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-border mt-2">
              <Link
                href="/login"
                className="text-sm text-muted text-center py-2"
              >
                {t('landing.nav.signIn')}
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-amber text-ink text-center py-2.5 rounded-lg"
              >
                {t('landing.nav.startFree')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
