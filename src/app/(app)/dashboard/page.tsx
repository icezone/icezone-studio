'use client';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Your projects will appear here.
      </p>
    </div>
  );
}
