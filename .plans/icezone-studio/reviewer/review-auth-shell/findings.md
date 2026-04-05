# Review: auth-dev 工作流 A - Auth + App Shell + i18n

**审查日期**: 2026-03-25
**审查对象**: D:/ws-auth-shell（分支 ws/auth-shell，commit f86d022）
**裁决**: [WARN] 警告 — 0 CRITICAL, 1 HIGH, 3 MEDIUM

---

## 审查范围

| 文件 | 行数 | 职责 |
|------|------|------|
| src/lib/supabase/client.ts | 9 | 浏览器端 Supabase 客户端 |
| src/lib/supabase/server.ts | 28 | 服务端 Supabase 客户端 |
| src/middleware.ts | 58 | 路由保护 + session 刷新 |
| src/stores/authStore.ts | 72 | Zustand auth 状态管理 |
| src/app/(auth)/login/page.tsx | 110 | 登录页 |
| src/app/(auth)/signup/page.tsx | 131 | 注册页 |
| src/app/(auth)/callback/route.ts | 19 | OAuth 回调 |
| src/app/(auth)/layout.tsx | 13 | Auth 布局 |
| src/app/(app)/layout.tsx | 67 | App Shell + sidebar |
| src/app/(app)/dashboard/page.tsx | 14 | Dashboard 占位 |
| supabase/migrations/001_profiles.sql | 61 | profiles 表 + RLS + trigger |
| src/i18n/index.ts | 20 | i18n 配置 |
| src/i18n/locales/zh.json | 43 | 中文翻译 |
| src/i18n/locales/en.json | 43 | 英文翻译 |
| 测试文件 x 5 | ~220 | 17 个用例 |

---

## CRITICAL (0)

无。

## HIGH (1)

### H1. OAuth callback `next` 参数存在开放重定向风险

**位置**: `src/app/(auth)/callback/route.ts:7-13`

**问题**:
```typescript
const next = searchParams.get('next') ?? '/dashboard';
// ...
return NextResponse.redirect(`${origin}${next}`);
```

`next` 参数直接拼接到重定向 URL 中，没有校验。攻击者可以构造恶意链接如：
`/callback?code=xxx&next=//evil.com` 或 `/callback?code=xxx&next=/../../evil.com`

虽然使用了 `origin` 前缀，但 `//evil.com` 在部分浏览器中会被解析为协议相对 URL，导致重定向到外部站点。

**建议**: 校验 `next` 参数必须以 `/` 开头且不包含 `//`，或使用白名单路径。例如：
```typescript
const next = searchParams.get('next') ?? '/dashboard';
const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
```

---

## MEDIUM (3)

### M1. UI 组件硬编码英文文案，未使用 i18n

**位置**: `src/app/(auth)/login/page.tsx`、`src/app/(auth)/signup/page.tsx`、`src/app/(app)/layout.tsx`、`src/app/(app)/dashboard/page.tsx`

**问题**: 已定义了完整的 zh.json/en.json 翻译文件，但所有页面组件中的文案全部硬编码英文（如 "Login"、"Sign in to your account"、"My Projects"、"Sign out" 等），没有使用 `useTranslation()` + `t('key')`。

根据 CLAUDE.md 第 12 节 i18n 规范："组件中统一使用 `useTranslation()` + `t('key.path')`，避免硬编码中英文文案。"

**影响**: 切换语言不生效，中文用户始终看到英文界面。

**建议**: 在各组件中引入 `useTranslation` 并替换硬编码文案。

### M2. profiles 表缺少 INSERT 的 RLS 策略

**位置**: `supabase/migrations/001_profiles.sql`

**问题**: 当前仅有 SELECT 和 UPDATE 策略，缺少 INSERT 策略。虽然 `handle_new_user()` trigger 使用 `SECURITY DEFINER` 绕过 RLS 执行 INSERT，但如果未来有其他场景需要通过客户端 INSERT profile（如手动创建配置），会被 RLS 阻止。

**影响**: 当前不影响功能（trigger 用 SECURITY DEFINER），但建议显式添加 INSERT 策略以保持策略完整性：
```sql
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
```

### M3. authStore 的 `onAuthStateChange` 订阅未清理

**位置**: `src/stores/authStore.ts:39-44`

**问题**: `initialize()` 中调用 `supabase.auth.onAuthStateChange()` 注册了监听器，但没有保存返回的 `subscription` 引用，也没有提供 `dispose()` 方法。如果 `initialize()` 被多次调用（如 React StrictMode 或路由切换），会注册多个监听器。

**建议**: 保存 subscription 引用，提供清理机制，或在 `initialize()` 中检查是否已订阅。

---

## LOW (3)

### L1. `dashboard/page.tsx` 中 `export const dynamic = 'force-dynamic'` 在 'use client' 页面中无效

**位置**: `src/app/(app)/dashboard/page.tsx:3`

**问题**: `dynamic` 导出是 Next.js 的 Server Component 路由段配置，在 `'use client'` 组件中不会被识别。不会报错但属于死代码。

### L2. Supabase 客户端单例在模块作用域使用可变变量

**位置**: `src/stores/authStore.ts:16-22`

**问题**: `_supabase` 使用 `let` 在模块顶层，在测试场景中可能导致状态泄漏。当前测试通过 `vi.resetModules()` 规避了这个问题。生产环境中是安全的，仅记录。

### L3. 登录页/注册页缺少限速机制

**位置**: `src/app/(auth)/login/page.tsx`、`src/app/(auth)/signup/page.tsx`

**问题**: 前端无请求限速。Supabase 服务端有内置限速，因此不紧急，但前端增加基本的防抖或禁用重复提交是好实践。当前 `loading` 状态已禁用按钮，基本可接受。

---

## 正面评价

1. **中间件实现规范**: 遵循 Supabase 官方推荐模式，`getUser()` + cookie 刷新 + 路由守卫，逻辑清晰。
2. **Supabase 客户端封装得当**: client/server 分离，server 端正确处理 Server Component 的 cookie 只读限制。
3. **RLS 策略合理**: profiles 表启用 RLS，SELECT/UPDATE 限制在本用户，trigger 使用 SECURITY DEFINER + 空 search_path，安全。
4. **authStore SSR 安全**: lazy init Supabase 客户端，避免在 SSR 阶段创建。
5. **测试结构良好**: 17 个用例覆盖初始状态、认证流程、中间件路由、i18n key 对称性。
6. **i18n 基础完善**: 配置正确，key 结构合理，parity 测试保证中英同步。
7. **无 console.log 残留**。
8. **无硬编码密钥**，所有敏感值通过环境变量读取。
9. **密码验证**: 注册页有 minLength 和二次确认校验。

---

## 结论

**[WARN]** — 1 个 HIGH 问题（H1 开放重定向）**建议在合并前修复**。3 个 MEDIUM 问题中 M1（i18n 未接入）影响较大但不涉及安全，M2/M3 可后续迭代修复。
