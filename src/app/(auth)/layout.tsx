'use client';

import Link from 'next/link';
import '@/i18n';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar with home link */}
      <div className="flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="IceZone Studio" width={44} className="block rounded-md" style={{ height: 'auto' }} />
          <span className="font-medium">IceZone Studio</span>
        </Link>
      </div>

      {/* Form area */}
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
