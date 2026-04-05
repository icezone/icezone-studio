# auth-dev - 任务计划

> 角色: Phase 0 工作流 A — Auth + App Shell + Middleware
> 状态: in_progress
> worktree: D:/ws-auth-shell（分支 ws/auth-shell）
> 创建: 2026-03-25

## 目标

在 ws-auth-shell worktree 中完成 Phase 0 工作流 A：
可启动的 Next.js 应用，含 Supabase 认证、路由保护、i18n 和 App Shell。

## 详细步骤

### A.1 项目脚手架
- [ ] 安装核心依赖：zustand@5 @xyflow/react@12 i18next react-i18next zod
- [ ] 安装 Supabase：@supabase/supabase-js @supabase/ssr
- [ ] 安装测试框架：vitest @testing-library/react playwright @playwright/test
- [ ] 配置 vitest.config.ts、playwright.config.ts
- [ ] 配置 TailwindCSS 4，设置设计 token（src/styles/index.css）
- [ ] 搭建 src/lib/supabase/client.ts（浏览器端客户端）
- [ ] 搭建 src/lib/supabase/server.ts（服务端客户端）
- [ ] 配置 .env.local.example

**先写测试：**
- __tests__/unit/supabase-client.test.ts
- __tests__/unit/supabase-server.test.ts

### A.2 认证页面
- [ ] app/(auth)/login/page.tsx — Google + WeChat OAuth 登录
- [ ] app/(auth)/signup/page.tsx — 注册
- [ ] app/(auth)/callback/page.tsx — OAuth 回调
- [ ] src/stores/authStore.ts — 认证状态管理（Zustand）

**先写测试：**
- __tests__/unit/authStore.test.ts

### A.3 中间件 + 路由保护
- [ ] middleware.ts — 未认证用户重定向到 /login
- [ ] app/(app)/layout.tsx — 认证守卫 + 侧边栏 Shell
- [ ] app/(app)/dashboard/page.tsx — 项目列表占位页

**先写测试：**
- __tests__/unit/middleware.test.ts

### A.4 Profile 自动创建
- [ ] supabase/migrations/001_profiles.sql — 注册触发器自动创建 profile

### A.5 i18n 搭建
- [ ] src/i18n/index.ts + locales/zh.json + locales/en.json
- [ ] 集成 Next.js App Router
- [ ] 添加认证相关文案

**先写测试：**
- __tests__/unit/i18n-parity.test.ts

## 验证门控（完成后检查）
- [ ] npx tsc --noEmit 零错误
- [ ] npm run build 成功
- [ ] 全部 vitest 测试通过
- [ ] Playwright: 注册 -> 登录 -> 看到仪表盘 -> 登出 -> 重定向到登录

## 涉及文件（主要）
- app/(auth)/login/page.tsx, signup/page.tsx, callback/page.tsx
- app/(app)/layout.tsx, dashboard/page.tsx
- middleware.ts
- src/lib/supabase/client.ts, server.ts
- src/stores/authStore.ts
- src/i18n/index.ts, locales/
- supabase/migrations/001_profiles.sql
- __tests__/unit/supabase-*.test.ts, authStore.test.ts, middleware.test.ts, i18n-parity.test.ts
- __tests__/e2e/auth.spec.ts

## 备注
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- 禁止在此工作流改动 src/features/canvas/ 或 app/api/
- 完成后提 PR: ws/auth-shell → main
