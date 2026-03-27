'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

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
    return <div className="h-screen w-screen overflow-hidden">{children}</div>;
  }

  // App shell: sidebar layout
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-foreground/8 bg-background">
        {/* Logo */}
        <div className="flex h-14 items-center px-4">
          <span className="text-sm font-semibold text-foreground/90">
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
        <div className="border-t border-foreground/8 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-foreground/70">{user.email}</div>
            </div>
            <button
              onClick={() => void signOut()}
              title={t('auth.signOut')}
              className="flex-shrink-0 rounded p-1 text-foreground/30 hover:text-foreground/60"
              type="button"
            >
              <SignOutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
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
          ? 'bg-foreground/8 text-foreground font-medium'
          : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
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
      <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h4A1.5 1.5 0 0 1 9 2.5v4A1.5 1.5 0 0 1 7.5 8h-4A1.5 1.5 0 0 1 2 6.5v-4ZM3.5 2a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4ZM8.5 9A1.5 1.5 0 0 0 7 10.5v4A1.5 1.5 0 0 0 8.5 16h4a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 12.5 9h-4Zm0 1h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5ZM2 10.5A1.5 1.5 0 0 1 3.5 9h4a1.5 1.5 0 0 1 .354.043l-1.028 1.028a.5.5 0 0 0-.326-.071H3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.674l1 1V14.5A1.5 1.5 0 0 1 7.5 16h-4A1.5 1.5 0 0 1 2 14.5v-4ZM11.5 2a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 .043.354L11.07 6.826A.5.5 0 0 1 11 6.5v-4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-.674l1 1H15.5A1.5 1.5 0 0 0 17 6.5v-4A1.5 1.5 0 0 0 15.5 1h-4Z" />
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
