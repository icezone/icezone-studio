'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { SettingsDialog } from '@/features/settings/SettingsDialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, initialize, signOut } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  // Canvas page needs full screen — no sidebar
  const isCanvas = pathname?.startsWith('/canvas/');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/40 text-sm">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) return null;

  // Canvas: full screen, no sidebar
  if (isCanvas) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {children}
        <SettingsDialog />
      </div>
    );
  }

  // App shell: sidebar layout
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-white/8 bg-[#111113]">
        {/* Logo */}
        <div className="flex h-14 items-center px-4">
          <span className="text-sm font-semibold text-white/90">
            {t('nav.appName')}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          <NavItem href="/dashboard" icon={<ProjectsIcon />}>
            {t('nav.myProjects')}
          </NavItem>
          <NavItem href="/settings" icon={<SettingsIcon />}>
            {t('nav.settings')}
          </NavItem>
        </nav>

        {/* User */}
        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white">
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-white/65">{user.email}</div>
            </div>
            <button
              onClick={() => void signOut()}
              title={t('auth.signOut')}
              className="flex-shrink-0 rounded p-1 text-white/35 hover:text-white/70"
              type="button"
            >
              <SignOutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6">{children}</main>
      <SettingsDialog />
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/55 hover:bg-white/6 hover:text-white/85'
      }`}
    >
      <span className="h-4 w-4 flex-shrink-0">{icon}</span>
      {children}
    </Link>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.25" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.25" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.25" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.25" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M6.955 1.45A.5.5 0 0 1 7.45 1h1.1a.5.5 0 0 1 .495.45l.196 1.618.929.382 1.219-.99a.5.5 0 0 1 .659.03l.778.778a.5.5 0 0 1 .03.659l-.99 1.219.382.929 1.618.196a.5.5 0 0 1 .45.495v1.1a.5.5 0 0 1-.45.495l-1.618.196-.382.929.99 1.219a.5.5 0 0 1-.03.659l-.778.778a.5.5 0 0 1-.659.03l-1.219-.99-.929.382-.196 1.618A.5.5 0 0 1 8.55 15h-1.1a.5.5 0 0 1-.495-.45l-.196-1.618-.929-.382-1.219.99a.5.5 0 0 1-.659-.03l-.778-.778a.5.5 0 0 1-.03-.659l.99-1.219-.382-.929-1.618-.196A.5.5 0 0 1 1 8.55v-1.1a.5.5 0 0 1 .45-.495l1.618-.196.382-.929-.99-1.219a.5.5 0 0 1 .03-.659l.778-.778a.5.5 0 0 1 .659-.03l1.219.99.929-.382.196-1.618ZM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M2 2.75A2.75 2.75 0 0 1 4.75 0h4a2.75 2.75 0 0 1 2.75 2.75v1.5a.75.75 0 0 1-1.5 0v-1.5c0-.69-.56-1.25-1.25-1.25h-4c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h4c.69 0 1.25-.56 1.25-1.25v-1.5a.75.75 0 0 1 1.5 0v1.5A2.75 2.75 0 0 1 8.75 16h-4A2.75 2.75 0 0 1 2 13.25V2.75Zm10.44 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l.72.72H6.75a.75.75 0 0 0 0 1.5h3.38l-.72.72a.75.75 0 1 0 1.06 1.06l1.97-1.97a.75.75 0 0 0 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
