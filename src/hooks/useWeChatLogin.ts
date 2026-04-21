import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

type WeChatLoginStatus = 'idle' | 'pending' | 'confirmed' | 'failed' | 'expired';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function useWeChatLogin() {
  const [status, setStatus] = useState<WeChatLoginStatus>('idle');
  const [uuid, setUuid] = useState<string | null>(null);
  const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const startLogin = useCallback(async () => {
    cleanup();

    const newUuid = uuidv4();
    const supabase = createClient();

    // Insert pending session
    const { error: insertError } = await supabase
      .from('wechat_login_sessions')
      .insert({ id: newUuid, status: 'pending' });

    if (insertError) {
      setError(insertError.message);
      setStatus('failed');
      return;
    }

    // Fetch Mini Program QR code from Edge Function
    setUuid(newUuid);
    setStatus('pending');
    setError(null);
    setRemainingSeconds(Math.floor(SESSION_TIMEOUT_MS / 1000));

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/wechat-qrcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: newUuid }),
      });
      const data = await res.json();
      if (data.success && data.image) {
        setQrImageSrc(data.image);
      } else {
        setError(data.error || 'Failed to generate QR code');
        setStatus('failed');
        return;
      }
    } catch {
      setError('Failed to connect to QR code service');
      setStatus('failed');
      return;
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Set expiration timeout
    timeoutRef.current = setTimeout(() => {
      setStatus('expired');
      cleanup();
    }, SESSION_TIMEOUT_MS);

    // Subscribe to Realtime changes
    const channel = supabase
      .channel(`wechat-login:${newUuid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wechat_login_sessions',
          filter: `id=eq.${newUuid}`,
        },
        async (payload) => {
          const newRow = payload.new as {
            status: string;
            access_token?: string;
            refresh_token?: string;
            error_message?: string;
          };

          if (newRow.status === 'confirmed' && newRow.access_token && newRow.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: newRow.access_token,
              refresh_token: newRow.refresh_token,
            });
            if (sessionError) {
              setError(sessionError.message);
              setStatus('failed');
            } else {
              setStatus('confirmed');
            }
            cleanup();
          } else if (newRow.status === 'failed') {
            setError(newRow.error_message || 'Login failed');
            setStatus('failed');
            cleanup();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setUuid(null);
    setQrImageSrc(null);
    setError(null);
    setRemainingSeconds(0);
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    uuid,
    qrImageSrc,
    error,
    remainingSeconds,
    startLogin,
    reset,
  };
}
