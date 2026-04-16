'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function LandingFooter() {
  const { t } = useTranslation();

  const linkGroups = [
    {
      titleKey: 'landing.footer.product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Canvas', href: '#canvas' },
        { label: 'Changelog', href: '/changelog' },
      ],
    },
    {
      titleKey: 'landing.footer.company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      titleKey: 'landing.footer.legal',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ];

  return (
    <footer
      className="border-t px-6 pt-12 pb-8"
      style={{ background: 'var(--color-ink)', borderColor: 'var(--color-glass-border)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top row */}
        <div className="flex flex-col md:flex-row gap-10 mb-10">
          {/* Brand */}
          <div className="flex-1 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="IceZone Studio" width={44} className="block rounded-lg" style={{ height: 'auto' }} />
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                IceZone Studio
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Link groups */}
          <div className="flex flex-wrap gap-10">
            {linkGroups.map((group) => (
              <div key={group.titleKey}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(group.titleKey)}
                </h4>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t text-xs"
          style={{ borderColor: 'var(--color-glass-border)', color: 'var(--color-muted)' }}
        >
          <span>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</span>
          <span>Made with ✦ for creators</span>
        </div>
      </div>
    </footer>
  );
}
