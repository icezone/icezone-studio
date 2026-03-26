'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, initialize, signOut } = useAuthStore();
  const router = useRouter();

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
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r border-foreground/10 bg-background p-4">
        <div className="mb-6 text-lg font-bold text-foreground">
          Storyboard Copilot
        </div>
        <nav className="space-y-1">
          <a
            href="/dashboard"
            className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-foreground/5"
          >
            My Projects
          </a>
        </nav>
        <div className="mt-auto pt-4">
          <div className="truncate text-xs text-foreground/40">{user.email}</div>
          <button
            onClick={() => signOut()}
            className="mt-2 text-xs text-foreground/60 hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
