import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/ssr
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock next/server NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: vi.fn(() => ({
        cookies: {
          set: vi.fn(),
        },
      })),
      redirect: vi.fn((url: URL) => ({
        url: url.toString(),
        cookies: {
          set: vi.fn(),
        },
      })),
    },
  };
});

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('should allow access to public routes without auth', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { middleware } = await import('../../src/middleware');
    const { NextResponse } = await import('next/server');
    const request = new NextRequest('http://localhost:3000/login');
    await middleware(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('should redirect unauthenticated users from protected routes to /login', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    vi.resetModules();
    const { middleware } = await import('../../src/middleware');
    const { NextResponse } = await import('next/server');
    const request = new NextRequest('http://localhost:3000/dashboard');
    await middleware(request);
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('should allow authenticated users to access protected routes', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    vi.resetModules();
    const { middleware } = await import('../../src/middleware');
    const { NextResponse } = await import('next/server');
    const request = new NextRequest('http://localhost:3000/dashboard');
    await middleware(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('should redirect authenticated users from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    vi.resetModules();
    const { middleware } = await import('../../src/middleware');
    const { NextResponse } = await import('next/server');
    const request = new NextRequest('http://localhost:3000/login');
    await middleware(request);
    expect(NextResponse.redirect).toHaveBeenCalled();
  });
});
