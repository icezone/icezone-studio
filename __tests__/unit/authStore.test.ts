import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';

// Mock supabase client
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signInWithOAuth: mockSignInWithOAuth,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01',
  identities: [],
} as User;

const mockSession: Session = {
  access_token: 'token-abc',
  refresh_token: 'refresh-abc',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  user: mockUser,
};

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state between tests
    vi.resetModules();
  });

  it('should have initial state with no user and loading true', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(true);
  });

  it('should initialize and fetch session', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });
    const { useAuthStore } = await import('@/stores/authStore');
    await useAuthStore.getState().initialize();
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.loading).toBe(false);
  });

  it('should handle signInWithOAuth', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });
    const { useAuthStore } = await import('@/stores/authStore');
    await useAuthStore.getState().signInWithOAuth('google');
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/callback') },
    });
  });

  it('should handle signUp with email and password', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    const { useAuthStore } = await import('@/stores/authStore');
    const result = await useAuthStore.getState().signUp('test@example.com', 'password123');
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.error).toBeNull();
  });

  it('should handle signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    const { useAuthStore } = await import('@/stores/authStore');
    const result = await useAuthStore.getState().signIn('test@example.com', 'password123');
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.error).toBeNull();
  });

  it('should handle signOut', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });
    const { useAuthStore } = await import('@/stores/authStore');
    // First initialize with a session
    await useAuthStore.getState().initialize();
    // Then sign out
    await useAuthStore.getState().signOut();
    expect(mockSignOut).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });
});
