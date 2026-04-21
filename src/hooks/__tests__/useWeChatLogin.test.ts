import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeChatLogin } from '../useWeChatLogin';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe('useWeChatLogin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, image: 'data:image/png;base64,abc' }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    mockFetch.mockReset();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useWeChatLogin());
    expect(result.current.status).toBe('idle');
    expect(result.current.uuid).toBeNull();
    expect(result.current.qrImageSrc).toBeNull();
  });

  it('transitions to pending when startLogin is called', async () => {
    const { result } = renderHook(() => useWeChatLogin());
    await act(async () => {
      await result.current.startLogin();
    });
    expect(result.current.status).toBe('pending');
    expect(result.current.uuid).toBeTruthy();
    expect(result.current.qrImageSrc).toBe('data:image/png;base64,abc');
  });

  it('transitions to expired after timeout', async () => {
    const { result } = renderHook(() => useWeChatLogin());
    await act(async () => {
      await result.current.startLogin();
    });
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(result.current.status).toBe('expired');
  });

  it('resets state when reset is called', async () => {
    const { result } = renderHook(() => useWeChatLogin());
    await act(async () => {
      await result.current.startLogin();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.uuid).toBeNull();
  });
});
