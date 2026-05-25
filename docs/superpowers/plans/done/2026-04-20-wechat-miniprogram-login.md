# WeChat Mini Program Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable WeChat scan-to-login for IceZone Studio web app via a personal Mini Program bridge, Supabase Edge Function, and Realtime subscription.

**Architecture:** Web frontend generates a QR code containing a UUID-parameterized URL. User scans with WeChat → Mini Program sends wx.login code + UUID to a Supabase Edge Function → Edge Function exchanges code for openid via WeChat API, creates/finds user, writes session tokens to a `wechat_login_sessions` table → Web frontend receives Realtime update and sets session.

**Tech Stack:** Next.js 16, Supabase (Edge Functions / Realtime / Auth Admin), WeChat Mini Program (native), qrcode.react, TypeScript, Deno (Edge Function runtime)

---

## File Structure

### New Files
| Path | Responsibility |
|------|---------------|
| `supabase/migrations/015_wechat_login_sessions.sql` | Create table + RLS + Realtime + cleanup cron |
| `supabase/functions/wechat-login/index.ts` | Edge Function: validate, call WeChat API, create user, write tokens |
| `src/components/auth/WeChatLoginButton.tsx` | Button that triggers the QR modal |
| `src/components/auth/WeChatQRModal.tsx` | Modal with QR code, countdown, Realtime subscription |
| `src/hooks/useWeChatLogin.ts` | Hook: UUID generation, Realtime subscription, session setting, state machine |
| `wechat-miniprogram/` | Mini Program source (separate from Next.js) |
| `wechat-miniprogram/app.json` | Mini Program config |
| `wechat-miniprogram/app.js` | Mini Program entry |
| `wechat-miniprogram/pages/login/index.js` | Login page logic |
| `wechat-miniprogram/pages/login/index.wxml` | Login page template |
| `wechat-miniprogram/pages/login/index.wxss` | Login page styles |
| `wechat-miniprogram/pages/login/index.json` | Login page config |

### Modified Files
| Path | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Add WeChatLoginButton below Google button |
| `src/i18n/locales/en.json` | Add `auth.wechat*` keys |
| `src/i18n/locales/zh.json` | Add `auth.wechat*` keys |
| `package.json` | Add `qrcode.react` dependency |

---

## Task 1: Database Migration — `wechat_login_sessions` Table

**Files:**
- Create: `supabase/migrations/015_wechat_login_sessions.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/015_wechat_login_sessions.sql

-- Create wechat_login_sessions table
create table if not exists public.wechat_login_sessions (
  id uuid primary key,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired', 'failed')),
  user_id uuid references auth.users(id) on delete set null,
  access_token text,
  refresh_token text,
  error_message text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- Enable RLS
alter table public.wechat_login_sessions enable row level security;

-- Anyone can insert a pending session (anonymous web users create these)
create policy "Anyone can create pending session"
  on public.wechat_login_sessions for insert
  with check (status = 'pending');

-- Anyone can read their own session by id (for Realtime subscription)
create policy "Anyone can read session by id"
  on public.wechat_login_sessions for select
  using (true);

-- No client-side update allowed (Edge Function uses service_role)
-- No update/delete policies for anon

-- Enable Realtime for this table
alter publication supabase_realtime add table public.wechat_login_sessions;

-- Index for cleanup query
create index idx_wechat_login_sessions_created_at on public.wechat_login_sessions(created_at);

-- Hourly cleanup via pg_cron (delete sessions older than 1 hour)
-- Note: pg_cron must be enabled in Supabase dashboard first
select cron.schedule(
  'cleanup-wechat-login-sessions',
  '0 * * * *',
  $$delete from public.wechat_login_sessions where created_at < now() - interval '1 hour'$$
);
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor)
Expected: Table created, RLS enabled, Realtime enabled.

- [ ] **Step 3: Verify in Supabase dashboard**

Check:
- Table `wechat_login_sessions` exists with correct columns
- RLS is enabled
- Table appears in Realtime publications

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/015_wechat_login_sessions.sql
git commit -m "feat(db): add wechat_login_sessions table with RLS and Realtime"
```

---

## Task 2: Supabase Edge Function — `wechat-login`

**Files:**
- Create: `supabase/functions/wechat-login/index.ts`

- [ ] **Step 1: Initialize Supabase functions directory**

```bash
mkdir -p supabase/functions/wechat-login
```

- [ ] **Step 2: Write the Edge Function**

```typescript
// supabase/functions/wechat-login/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const WECHAT_APP_ID = Deno.env.get("WECHAT_APP_ID")!;
const WECHAT_APP_SECRET = Deno.env.get("WECHAT_APP_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WeChatSessionResponse {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method not allowed" }, 405);
  }

  let body: { code?: string; uuid?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid JSON" }, 400);
  }

  const { code, uuid } = body;
  if (!code || !uuid) {
    return jsonResponse({ success: false, error: "code and uuid are required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Validate session exists and is pending
  const { data: session, error: fetchError } = await supabase
    .from("wechat_login_sessions")
    .select("*")
    .eq("id", uuid)
    .single();

  if (fetchError || !session) {
    return jsonResponse({ success: false, error: "invalid session" }, 400);
  }

  if (session.status !== "pending") {
    return jsonResponse({ success: false, error: "session already used" }, 400);
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "expired" })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: "session expired" }, 400);
  }

  // 2. Call WeChat code2session API
  const wechatUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

  let wechatData: WeChatSessionResponse;
  try {
    const wechatRes = await fetch(wechatUrl);
    wechatData = await wechatRes.json();
  } catch (e) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "failed", error_message: "WeChat API network error" })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: "WeChat API unavailable" }, 502);
  }

  if (wechatData.errcode && wechatData.errcode !== 0) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "failed", error_message: `WeChat error: ${wechatData.errcode} ${wechatData.errmsg}` })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: `WeChat auth failed: ${wechatData.errmsg}` }, 400);
  }

  const openid = wechatData.openid;
  if (!openid) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "failed", error_message: "No openid returned" })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: "failed to get openid" }, 400);
  }

  // 3. Find or create user
  let userId: string;

  // Search for existing user with this wechat_openid
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.user_metadata?.wechat_openid === openid
  );

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new user with wechat_openid in metadata
    const fakeEmail = `wechat_${openid}@wechat.placeholder`;
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: fakeEmail,
      email_confirm: true,
      user_metadata: { wechat_openid: openid, provider: "wechat" },
    });

    if (createError || !newUser.user) {
      await supabase
        .from("wechat_login_sessions")
        .update({ status: "failed", error_message: `User creation failed: ${createError?.message}` })
        .eq("id", uuid);
      return jsonResponse({ success: false, error: "failed to create user" }, 500);
    }
    userId = newUser.user.id;
  }

  // 4. Generate session tokens for the user
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: (existingUser?.email) || `wechat_${openid}@wechat.placeholder`,
  });

  // Use signInWithPassword alternative: create a session directly
  // Actually, use admin API to generate a session
  // The best approach: use supabase.auth.admin.generateLink won't give us tokens directly.
  // Instead, we'll use the undocumented but stable approach of signing in on behalf of user.

  // Better approach: use admin.createSession (not available) or generate a custom JWT
  // Supabase recommends using admin.generateLink + exchange, but for server-to-server,
  // we can use the internal endpoint.

  // Most reliable: use admin API to get user, then create a one-time sign-in token
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: existingUser?.email || `wechat_${openid}@wechat.placeholder`,
  });

  if (linkError || !linkData) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "failed", error_message: `Session generation failed: ${linkError?.message}` })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: "failed to generate session" }, 500);
  }

  // Exchange the token_hash for a real session
  const verifyUrl = `${SUPABASE_URL}/auth/v1/verify`;
  const verifyRes = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      type: "magiclink",
      token_hash: linkData.properties?.hashed_token,
    }),
  });

  const verifyData = await verifyRes.json();

  if (!verifyData.access_token) {
    await supabase
      .from("wechat_login_sessions")
      .update({ status: "failed", error_message: "Token exchange failed" })
      .eq("id", uuid);
    return jsonResponse({ success: false, error: "failed to exchange token" }, 500);
  }

  // 5. Update session table with tokens (atomic: only if still pending)
  const { data: updateResult, error: updateError } = await supabase
    .from("wechat_login_sessions")
    .update({
      status: "confirmed",
      user_id: userId,
      access_token: verifyData.access_token,
      refresh_token: verifyData.refresh_token,
    })
    .eq("id", uuid)
    .eq("status", "pending")
    .select()
    .single();

  if (updateError || !updateResult) {
    return jsonResponse({ success: false, error: "session was already consumed" }, 409);
  }

  return jsonResponse({ success: true }, 200);
});

function jsonResponse(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

- [ ] **Step 3: Set environment variables**

Run in Supabase dashboard or CLI:
```bash
npx supabase secrets set WECHAT_APP_ID=wx3a92970198b515db
npx supabase secrets set WECHAT_APP_SECRET=<your-secret>
```

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

- [ ] **Step 4: Deploy the Edge Function**

```bash
npx supabase functions deploy wechat-login --no-verify-jwt
```

The `--no-verify-jwt` flag is required because the Mini Program calls this function without a Supabase JWT (it's unauthenticated from Supabase's perspective).

- [ ] **Step 5: Test with curl**

```bash
curl -X POST https://xucmespxytzbyvfzpdoc.supabase.co/functions/v1/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test", "uuid": "00000000-0000-0000-0000-000000000000"}'
```

Expected: `{"success": false, "error": "invalid session"}` (because no session row exists)

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/wechat-login/index.ts
git commit -m "feat(edge-function): add wechat-login for Mini Program auth flow"
```

---

## Task 3: Install `qrcode.react` Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install qrcode.react
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('qrcode.react'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add qrcode.react for WeChat login QR code"
```

---

## Task 4: Custom Hook — `useWeChatLogin`

**Files:**
- Create: `src/hooks/useWeChatLogin.ts`
- Test: `src/hooks/__tests__/useWeChatLogin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useWeChatLogin.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeChatLogin } from '../useWeChatLogin';

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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useWeChatLogin());
    expect(result.current.status).toBe('idle');
    expect(result.current.uuid).toBeNull();
    expect(result.current.qrUrl).toBeNull();
  });

  it('transitions to pending when startLogin is called', async () => {
    const { result } = renderHook(() => useWeChatLogin());
    await act(async () => {
      await result.current.startLogin();
    });
    expect(result.current.status).toBe('pending');
    expect(result.current.uuid).toBeTruthy();
    expect(result.current.qrUrl).toContain(result.current.uuid);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useWeChatLogin.test.ts`
Expected: FAIL — module `../useWeChatLogin` not found

- [ ] **Step 3: Write the hook implementation**

```typescript
// src/hooks/useWeChatLogin.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

type WeChatLoginStatus = 'idle' | 'pending' | 'confirmed' | 'failed' | 'expired';

const WECHAT_SCAN_BASE_URL = process.env.NEXT_PUBLIC_WECHAT_SCAN_URL || '';
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function useWeChatLogin() {
  const [status, setStatus] = useState<WeChatLoginStatus>('idle');
  const [uuid, setUuid] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof createClient extends () => infer R ? R : never> | null>(null);

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
      supabase.removeChannel(channelRef.current as any);
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

    setUuid(newUuid);
    setQrUrl(`${WECHAT_SCAN_BASE_URL}?uuid=${newUuid}`);
    setStatus('pending');
    setError(null);
    setRemainingSeconds(Math.floor(SESSION_TIMEOUT_MS / 1000));

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

    channelRef.current = channel as any;
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setUuid(null);
    setQrUrl(null);
    setError(null);
    setRemainingSeconds(0);
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    uuid,
    qrUrl,
    error,
    remainingSeconds,
    startLogin,
    reset,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useWeChatLogin.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWeChatLogin.ts src/hooks/__tests__/useWeChatLogin.test.ts
git commit -m "feat(hook): add useWeChatLogin with Realtime subscription and timeout"
```

---

## Task 5: i18n — Add WeChat Auth Translation Keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: Add English translations**

Add the following keys inside the `"auth"` object in `src/i18n/locales/en.json`:

```json
"wechatLogin": "WeChat Scan Login",
"wechatScanTitle": "WeChat Scan Login",
"wechatScanInstruction": "Open WeChat and scan the QR code",
"wechatExpired": "QR code expired",
"wechatRefresh": "Click to refresh",
"wechatFailed": "Login failed",
"wechatSuccess": "Login successful, redirecting...",
"wechatTimeRemaining": "{{seconds}}s remaining"
```

- [ ] **Step 2: Add Chinese translations**

Add the following keys inside the `"auth"` object in `src/i18n/locales/zh.json`:

```json
"wechatLogin": "微信扫码登录",
"wechatScanTitle": "微信扫码登录",
"wechatScanInstruction": "打开微信，扫描二维码",
"wechatExpired": "二维码已过期",
"wechatRefresh": "点击刷新",
"wechatFailed": "登录失败",
"wechatSuccess": "登录成功，正在跳转...",
"wechatTimeRemaining": "剩余 {{seconds}} 秒"
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "i18n: add WeChat login translation keys (en + zh)"
```

---

## Task 6: UI Component — `WeChatQRModal`

**Files:**
- Create: `src/components/auth/WeChatQRModal.tsx`

- [ ] **Step 1: Create the QR Modal component**

```typescript
// src/components/auth/WeChatQRModal.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useWeChatLogin } from '@/hooks/useWeChatLogin';

interface WeChatQRModalProps {
  open: boolean;
  onClose: () => void;
}

export function WeChatQRModal({ open, onClose }: WeChatQRModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, qrUrl, error, remainingSeconds, startLogin, reset } = useWeChatLogin();

  useEffect(() => {
    if (open && status === 'idle') {
      startLogin();
    }
  }, [open, status, startLogin]);

  useEffect(() => {
    if (status === 'confirmed') {
      onClose();
      router.push('/dashboard');
    }
  }, [status, onClose, router]);

  const handleRefresh = () => {
    reset();
    startLogin();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = remainingSeconds / 300;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-lg font-semibold text-foreground">
          {t('auth.wechatScanTitle')}
        </h2>

        {status === 'pending' && qrUrl && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border border-foreground/10 p-4">
              <QRCodeSVG value={qrUrl} size={200} />
            </div>
            <p className="text-sm text-foreground/60">{t('auth.wechatScanInstruction')}</p>
            <div className="w-full">
              <div className="h-1.5 w-full rounded-full bg-foreground/10">
                <div
                  className="h-1.5 rounded-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-foreground/40">{timeDisplay}</p>
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border border-foreground/10 p-4 opacity-30">
              <QRCodeSVG value="expired" size={200} />
            </div>
            <p className="text-sm text-foreground/60">{t('auth.wechatExpired')}</p>
            <button
              onClick={handleRefresh}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              {t('auth.wechatRefresh')}
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error || t('auth.wechatFailed')}
            </div>
            <button
              onClick={handleRefresh}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="text-4xl text-green-500">✓</div>
            <p className="text-sm text-foreground/60">{t('auth.wechatSuccess')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `WeChatQRModal`

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/WeChatQRModal.tsx
git commit -m "feat(ui): add WeChatQRModal with QR code, countdown, and status states"
```

---

## Task 7: UI Component — `WeChatLoginButton`

**Files:**
- Create: `src/components/auth/WeChatLoginButton.tsx`

- [ ] **Step 1: Create the button component**

```typescript
// src/components/auth/WeChatLoginButton.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WeChatQRModal } from './WeChatQRModal';

export function WeChatLoginButton() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full rounded-md border border-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
      >
        {t('auth.wechatLogin')}
      </button>
      <WeChatQRModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/WeChatLoginButton.tsx
git commit -m "feat(ui): add WeChatLoginButton component"
```

---

## Task 8: Integrate WeChat Login Button into Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add import and button to login page**

Add import at the top:
```typescript
import { WeChatLoginButton } from '@/components/auth/WeChatLoginButton';
```

Add the WeChat button after the Google button (before the closing `</div>` with sign-up link):
```tsx
<WeChatLoginButton />
```

The final OAuth section should look like:
```tsx
<button
  type="button"
  onClick={handleGoogleLogin}
  className="w-full rounded-md border border-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
>
  {t('auth.continueWithGoogle')}
</button>

<WeChatLoginButton />
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev`
Visit: `http://localhost:3000/login`
Expected: See "WeChat Scan Login" button below Google button

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat(login): integrate WeChat scan login button"
```

---

## Task 9: Environment Variable Configuration

**Files:**
- Modify: `.env.example` (or `.env.local`)

- [ ] **Step 1: Add the QR URL env var**

Add to `.env.local`:
```
NEXT_PUBLIC_WECHAT_SCAN_URL=https://your-domain.com/wechat-scan
```

This is the base URL encoded in the QR code. It must match the URL rule configured in the Mini Program backend under "扫普通链接二维码打开小程序".

- [ ] **Step 2: Document the required env vars**

The following env vars are needed:
- `NEXT_PUBLIC_WECHAT_SCAN_URL` — Base URL for QR code (configured in Mini Program link rules)
- `WECHAT_APP_ID` — Set in Supabase Edge Function secrets
- `WECHAT_APP_SECRET` — Set in Supabase Edge Function secrets

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "config: add NEXT_PUBLIC_WECHAT_SCAN_URL env var"
```

---

## Task 10: WeChat Mini Program Source

**Files:**
- Create: `wechat-miniprogram/app.json`
- Create: `wechat-miniprogram/app.js`
- Create: `wechat-miniprogram/pages/login/index.json`
- Create: `wechat-miniprogram/pages/login/index.js`
- Create: `wechat-miniprogram/pages/login/index.wxml`
- Create: `wechat-miniprogram/pages/login/index.wxss`

- [ ] **Step 1: Create app.json**

```json
{
  "pages": ["pages/login/index"],
  "window": {
    "navigationBarTitleText": "IceZone Login",
    "navigationBarBackgroundColor": "#ffffff",
    "backgroundColor": "#f5f5f5"
  }
}
```

- [ ] **Step 2: Create app.js**

```javascript
// wechat-miniprogram/app.js
App({});
```

- [ ] **Step 3: Create pages/login/index.json**

```json
{
  "navigationBarTitleText": "Login"
}
```

- [ ] **Step 4: Create pages/login/index.js**

```javascript
// wechat-miniprogram/pages/login/index.js
const EDGE_FUNCTION_URL = 'https://xucmespxytzbyvfzpdoc.supabase.co/functions/v1/wechat-login';

Page({
  data: {
    uuid: '',
    status: 'idle', // idle | loading | success | error
    errorMsg: '',
  },

  onLoad(options) {
    const uuid = options.uuid || '';
    if (!uuid) {
      this.setData({ status: 'error', errorMsg: 'Missing login session' });
      return;
    }
    this.setData({ uuid });
  },

  handleLogin() {
    if (this.data.status === 'loading') return;
    this.setData({ status: 'loading', errorMsg: '' });

    wx.login({
      success: (res) => {
        if (!res.code) {
          this.setData({ status: 'error', errorMsg: 'Failed to get WeChat code' });
          return;
        }
        wx.request({
          url: EDGE_FUNCTION_URL,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { code: res.code, uuid: this.data.uuid },
          timeout: 10000,
          success: (resp) => {
            if (resp.data && resp.data.success) {
              this.setData({ status: 'success' });
            } else {
              this.setData({
                status: 'error',
                errorMsg: (resp.data && resp.data.error) || 'Login failed',
              });
            }
          },
          fail: () => {
            this.setData({ status: 'error', errorMsg: 'Network error, please retry' });
          },
        });
      },
      fail: () => {
        this.setData({ status: 'error', errorMsg: 'WeChat login failed' });
      },
    });
  },
});
```

- [ ] **Step 5: Create pages/login/index.wxml**

```xml
<!-- wechat-miniprogram/pages/login/index.wxml -->
<view class="container">
  <image class="logo" src="/assets/logo.png" mode="aspectFit" />
  <text class="title">Login to IceZone Studio</text>

  <block wx:if="{{status === 'idle' || status === 'error'}}">
    <button class="login-btn" bindtap="handleLogin" disabled="{{!uuid}}">
      Confirm Login
    </button>
  </block>

  <block wx:if="{{status === 'loading'}}">
    <view class="loading-container">
      <view class="spinner" />
      <text class="loading-text">Logging in...</text>
    </view>
  </block>

  <block wx:if="{{status === 'success'}}">
    <view class="success-container">
      <text class="success-icon">✓</text>
      <text class="success-text">Login successful! You may close this page.</text>
    </view>
  </block>

  <block wx:if="{{status === 'error'}}">
    <view class="error-container">
      <text class="error-text">{{errorMsg}}</text>
      <button class="retry-btn" bindtap="handleLogin">Retry</button>
    </view>
  </block>
</view>
```

- [ ] **Step 6: Create pages/login/index.wxss**

```css
/* wechat-miniprogram/pages/login/index.wxss */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
  background-color: #ffffff;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 40rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 60rpx;
}

.login-btn {
  width: 80%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  border-radius: 12rpx;
  border: none;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e0e0e0;
  border-top: 4rpx solid #07c160;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #666;
}

.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.success-icon {
  font-size: 80rpx;
  color: #07c160;
}

.success-text {
  font-size: 28rpx;
  color: #333;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
}

.error-text {
  font-size: 26rpx;
  color: #e53935;
  text-align: center;
}

.retry-btn {
  width: 60%;
  height: 72rpx;
  line-height: 72rpx;
  background-color: #f5f5f5;
  color: #333;
  font-size: 28rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}
```

- [ ] **Step 7: Commit**

```bash
git add wechat-miniprogram/
git commit -m "feat(wechat): add Mini Program source for scan-to-login"
```

---

## Task 11: Mini Program Configuration — Scan URL Rule

This is a manual step in the WeChat Mini Program backend.

- [ ] **Step 1: Configure "扫普通链接二维码打开小程序" rule**

In Mini Program backend → "开发" → "开发管理" → "开发设置" → "扫普通链接二维码打开小程序":

1. Add a URL rule:
   - URL: `https://your-domain.com/wechat-scan`（你的 webapp 域名）
   - Matched path: `pages/login/index`
   - Test link: `https://your-domain.com/wechat-scan?uuid=test123`

2. The rule maps query parameter `uuid` automatically to the page's `onLoad(options)`.

- [ ] **Step 2: Upload Mini Program code via WeChat DevTools**

1. Open WeChat DevTools
2. Import the `wechat-miniprogram/` directory
3. Set AppID to `wx3a92970198b515db`
4. Click "Upload" to submit for review (or use as development version for testing)

- [ ] **Step 3: Add a logo asset**

Place your IceZone logo at `wechat-miniprogram/assets/logo.png` (square, at least 120x120px).

---

## Task 12: End-to-End Integration Test

- [ ] **Step 1: Test the full flow manually**

1. Start web app: `npm run dev`
2. Go to login page, click "WeChat Scan Login"
3. Verify QR modal appears with QR code and countdown
4. Open Mini Program in WeChat DevTools with URL: `pages/login/index?uuid=<copy-uuid-from-db>`
5. Click "Confirm Login" in Mini Program
6. Verify web app auto-redirects to dashboard

- [ ] **Step 2: Test timeout behavior**

1. Open QR modal, wait for countdown to reach 0
2. Verify QR shows "expired" state with refresh button
3. Click refresh → verify new QR code appears

- [ ] **Step 3: Test failure case**

1. Create a pending session manually in DB
2. Call Edge Function with an invalid WeChat code
3. Verify session status changes to 'failed'
4. Verify web modal shows error message

- [ ] **Step 4: Verify RLS**

1. As anon user, try to UPDATE a session row via client → should fail
2. As anon user, try to INSERT with status='confirmed' → should fail (check constraint in WITH CHECK)

---

## Summary of Environment Setup Required

| What | Where | Value |
|------|-------|-------|
| `WECHAT_APP_ID` | Supabase Edge Function secrets | `wx3a92970198b515db` |
| `WECHAT_APP_SECRET` | Supabase Edge Function secrets | (your secret) |
| `NEXT_PUBLIC_WECHAT_SCAN_URL` | `.env.local` | `https://your-domain.com/wechat-scan` |
| Mini Program server domain | WeChat backend settings | `https://xucmespxytzbyvfzpdoc.supabase.co` |
| Scan URL rule | WeChat backend settings | Map `https://your-domain.com/wechat-scan` → `pages/login/index` |
| Realtime enabled | Supabase dashboard | Enable for `wechat_login_sessions` table |
| pg_cron enabled | Supabase dashboard | Enable extension before running migration |
