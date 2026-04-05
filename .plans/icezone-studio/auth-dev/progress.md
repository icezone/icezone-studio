# auth-dev Progress Log

## 2026-03-25

### A.1 项目脚手架 - DONE
- 安装 zustand@5, @xyflow/react@12, i18next, react-i18next, zod, @supabase/supabase-js, @supabase/ssr
- 安装 vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, @playwright/test
- 配置 vitest.config.ts (jsdom, path alias @/)
- 配置 playwright.config.ts
- 创建 src/lib/supabase/client.ts (createBrowserClient via @supabase/ssr)
- 创建 src/lib/supabase/server.ts (createServerClient via @supabase/ssr + cookies)
- 创建 .env.local.example
- TDD: 4 tests passing (supabase-client.test.ts, supabase-server.test.ts)

### A.2 认证页面 - DONE
- app/(auth)/layout.tsx - auth layout
- app/(auth)/login/page.tsx - email+password login + Google OAuth
- app/(auth)/signup/page.tsx - email registration with confirmation
- app/(auth)/callback/route.ts - OAuth code exchange (Route Handler)
- src/stores/authStore.ts - Zustand store (user/session/loading + lazy supabase init)
- TDD: 6 tests passing (authStore.test.ts)

### A.3 中间件 + 路由保护 - DONE
- src/middleware.ts - session refresh, unauthenticated redirect to /login, authenticated redirect from /login to /dashboard
- app/(app)/layout.tsx - client-side auth guard + sidebar shell
- app/(app)/dashboard/page.tsx - project list placeholder
- TDD: 4 tests passing (middleware.test.ts)

### A.4 Profile 自动创建 - DONE
- supabase/migrations/001_profiles.sql - profiles table + RLS + handle_new_user trigger + handle_updated_at trigger

### A.5 i18n 搭建 - DONE
- src/i18n/index.ts - i18next config (zh default, en fallback)
- src/i18n/locales/zh.json - 中文 (common, auth, dashboard, nav)
- src/i18n/locales/en.json - 英文 (same keys)
- TDD: 3 tests passing (i18n-parity.test.ts)

### 验证门控
- [x] npx tsc --noEmit - 零错误
- [x] npx vitest run - 17/17 通过
- [x] npm run build - 成功
- [x] npm run lint - 零错误 (1 warning fixed)

