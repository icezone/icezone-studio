import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: { getAll: () => unknown; setAll: (cookies: unknown) => void } }) => {
    // Call the cookie handlers to verify they work
    opts.cookies.getAll();
    opts.cookies.setAll([]);
    return { auth: {}, from: vi.fn() };
  }),
}));

describe('Supabase Server Client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('should export createClient function', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    expect(createClient).toBeDefined();
    expect(typeof createClient).toBe('function');
  });

  it('should return a supabase client instance', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const client = await createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
