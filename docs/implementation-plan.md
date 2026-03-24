# Implementation Plan: Storyboard Copilot Web

> 基于桌面版升级扩展为 Web SaaS 的任务级实现计划。
> TDD + Git Worktree 并行 Agent 团队开发。
> 每个阶段有**验证门控** — 门控通过后方可推进下一阶段。

---

## 项目定位

- **来源**：桌面版 `Storyboard-Copilot`（Tauri 2 + Rust）已验证核心画布工作流。
- **目标**：升级扩展为 Web SaaS 产品，覆盖全球和中国市场。
- **仓库**：桌面版仓库保留不变。Web 版在独立新仓库 **`storyboard-copilot-web`** 中开发。
- **代码复用策略**：
  - **直接复制**（零改动或微调）：`domain/`、`models/`、`tools/`、`ui/`、`edges/`、`hooks/`、`pricing/`、`canvasStore.ts`、`primitives.tsx`、`i18n/`
  - **适配改写**（替换 Tauri 依赖为 Web API）：`nodes/*.tsx`（文件操作）、`toolProcessor.ts`（移除直接命令导入）
  - **重写**（基础设施层）：`imageData.ts` → Supabase Storage、`projectStore.ts` → Supabase + IndexedDB、`canvasServices.ts` → Web 适配器接线
  - **新建**（Web 专有）：API Routes、Server-side Providers、Supabase 迁移、认证、支付

---

## 原则

1. **最大化复用**：桌面版已验证的代码优先复制沿用，减少重复工作。
2. **TDD**：先写失败测试，实现最少代码通过，重构。
3. **并行 Agent**：独立工作流在 git worktree 中并行开发，互不冲突。
4. **门控推进**：每阶段必须通过验证门控后才能开始下一阶段。
5. **本地验证优先**：`npm run dev` + 浏览器验证为主，CI/CD 在功能稳定后搭建。

---

## Git Worktree 并行策略

### 工作原理

每个独立工作流在单独的 git worktree 中开发，各 worktree 有独立的工作目录但共享 git 历史。Agent 可以在不同 worktree 中**同时**工作，互不阻塞。

```bash
# 主分支保持干净
git checkout main

# Phase 0: 两个 agent 并行
git worktree add ../ws-auth-shell -b ws/auth-shell
git worktree add ../ws-image-processing -b ws/image-processing

# Phase 1: 两个 agent 并行（B 先行，C 在 B 的 API 就绪后启动）
git worktree add ../ws-project-persistence -b ws/project-persistence
git worktree add ../ws-canvas-nodes -b ws/canvas-nodes

# Phase 2: 两个 agent 并行（D 先行，E 在 D 共享基础设施就绪后启动）
git worktree add ../ws-ai-providers -b ws/ai-providers
git worktree add ../ws-video-providers -b ws/video-providers

# Phase 3: 两个 agent 并行
git worktree add ../ws-billing -b ws/billing
git worktree add ../ws-landing-settings -b ws/landing-settings
```

### 合并流程

每个 worktree 分支完成后通过 PR 合并到 `main`：
1. 在 worktree 内运行完整测试套件
2. Rebase 到最新 `main`
3. 创建 PR + 代码审查
4. 合并后清理 worktree

### 冲突预防

- 每个工作流操作**不同的文件集**（见下方各工作流文件清单）
- 共享文件（如 `package.json`）在合并时处理
- 模块间通过接口/类型解耦，减少交叉依赖

---

## Phase 0: 基础框架（Auth + App Shell + 图片处理）

**目标**：可启动的 Next.js 应用，含认证、路由保护和图片处理 API。
**并行工作流**：A 和 F 零依赖，完全并行。

### 工作流 A: Auth + App Shell + Middleware

**Agent**: worktree `ws-auth-shell`，分支 `ws/auth-shell`
**操作文件**：`app/(auth)/`、`app/(app)/layout.tsx`、`app/(app)/dashboard/`、`middleware.ts`、`src/lib/supabase/`、`src/stores/authStore.ts`、`src/i18n/`、`supabase/migrations/001_*`

#### A.1 项目脚手架
- [ ] `npx create-next-app@latest --app --ts --tailwind --eslint`
- [ ] 安装核心依赖：`zustand@5 @xyflow/react@12 i18next react-i18next zod`
- [ ] 安装 Supabase：`@supabase/supabase-js @supabase/ssr`
- [ ] 安装测试框架：`vitest @testing-library/react playwright @playwright/test`
- [ ] 配置 `vitest.config.ts`、`playwright.config.ts`
- [ ] 配置 TailwindCSS 4，设置设计 token
- [ ] 搭建 `src/lib/supabase/client.ts`（浏览器端客户端）
- [ ] 搭建 `src/lib/supabase/server.ts`（服务端客户端）
- [ ] 配置环境变量

**TDD 测试**（先写）：
```
__tests__/unit/supabase-client.test.ts   — 客户端正常创建
__tests__/unit/supabase-server.test.ts   — 服务端客户端读取 cookies
```

#### A.2 认证页面
- [ ] `app/(auth)/login/page.tsx` — Google + WeChat OAuth 登录
- [ ] `app/(auth)/signup/page.tsx` — 注册
- [ ] `app/(auth)/callback/page.tsx` — OAuth 回调
- [ ] `src/stores/authStore.ts` — 认证状态管理

**TDD 测试**：
```
__tests__/unit/authStore.test.ts         — session 状态流转
__tests__/e2e/auth.spec.ts              — 注册、登录、登出、重定向
```

#### A.3 中间件 + 路由保护
- [ ] `middleware.ts` — 未认证用户重定向到 `/login`
- [ ] `app/(app)/layout.tsx` — 认证守卫 + 侧边栏 Shell
- [ ] `app/(app)/dashboard/page.tsx` — 项目列表占位

**TDD 测试**：
```
__tests__/unit/middleware.test.ts        — 认证重定向逻辑
__tests__/e2e/auth.spec.ts              — 保护路由重定向（扩展）
```

#### A.4 Profile 自动创建
- [ ] `supabase/migrations/001_profiles.sql` — 注册触发器自动创建 profile

**TDD 测试**：
```
__tests__/api/profile.test.ts           — 注册后 profile 自动生成
```

#### A.5 i18n 搭建
- [ ] `src/i18n/index.ts` + `locales/zh.json` + `locales/en.json`
- [ ] 集成 Next.js App Router
- [ ] 添加认证相关文案

**TDD 测试**：
```
__tests__/unit/i18n-parity.test.ts      — zh/en 键值一致性
```

#### 工作流 A 验证门控
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run build` 成功
- [ ] 全部 vitest 测试通过
- [ ] Playwright: 注册 -> 登录 -> 看到仪表盘 -> 登出 -> 重定向到登录

---

### 工作流 F: 图片处理 API

**Agent**: worktree `ws-image-processing`，分支 `ws/image-processing`
**操作文件**：`src/server/image/`、`app/api/image/`、`__tests__/unit/image-*`、`__tests__/api/image-*`

#### F.1 Sharp 图片处理器
- [ ] `src/server/image/processor.ts` — split、crop、merge、resize、metadata
- [ ] 安装：`sharp @types/sharp`

**TDD 测试**（先写，使用测试图片）：
```
__tests__/unit/image-split.test.ts      — 2x2 切割产生 4 张正确尺寸图片
__tests__/unit/image-crop.test.ts       — 16:9 裁剪
__tests__/unit/image-merge.test.ts      — 2 张图片合并
__tests__/unit/image-resize.test.ts     — 保持比例缩放
__tests__/unit/image-metadata.test.ts   — 元数据读写往返
```

#### F.2 API 路由
- [ ] `app/api/image/split/route.ts`
- [ ] `app/api/image/crop/route.ts`
- [ ] `app/api/image/merge/route.ts`
- [ ] `app/api/image/metadata/route.ts`
- [ ] Zod 校验 + 文件大小限制（> 20MB 拒绝）

**TDD 测试**：
```
__tests__/api/image-split.test.ts       — 上传图片，获取切割结果
__tests__/api/image-crop.test.ts        — 上传图片，获取裁剪结果
__tests__/api/image-validation.test.ts  — 拒绝超大文件和无效参数
```

#### F.3 CJK 字体
- [ ] 捆绑 Noto Sans CJK 子集，用于分镜合并文字叠加

#### 工作流 F 验证门控
- [ ] 全部 vitest 测试通过
- [ ] API 返回正确 Content-Type 和状态码
- [ ] 真实图片切割/合并验证

---

## Phase 0 退出门控

- [ ] 认证流程端到端可用
- [ ] 图片处理 API 可用
- [ ] 全部测试绿色
- [ ] `npm run build` 成功

---

## Phase 1: 编辑器 MVP（数据库 + 项目持久化 + 画布）

**目标**：可创建、编辑、保存、恢复项目的 Web 画布编辑器。
**并行策略**：B 立即启动；C 在 B 的 API 路由就绪后启动（约 B 完成 60% 时）。

### 工作流 B: 数据库 Schema + 项目持久化

**Agent**: worktree `ws-project-persistence`，分支 `ws/project-persistence`
**操作文件**：`supabase/migrations/002-010_*`、`app/api/projects/`、`app/api/assets/`、`src/stores/projectStore.ts`

#### B.1 数据库迁移
- [ ] `002_projects.sql` — projects 表
- [ ] `003_project_drafts.sql` — 草稿表
- [ ] `004_project_assets.sql` — 资产表
- [ ] `005_ai_jobs.sql` — 任务表
- [ ] `006_credit_ledger.sql` — 积分账本
- [ ] `007_plans_payments.sql` — 套餐 + 支付
- [ ] `008_user_api_keys.sql` — BYOK 加密存储
- [ ] `009_rls_policies.sql` — RLS 策略
- [ ] `010_triggers.sql` — updated_at 触发器

**TDD 测试**：
```
__tests__/api/rls-isolation.test.ts     — 用户 A 无法读取用户 B 的项目
__tests__/api/rls-public.test.ts        — 公开项目任何人可读
```

#### B.2 项目 CRUD API
- [ ] `app/api/projects/route.ts` — GET（列表）、POST（创建）
- [ ] `app/api/projects/[id]/route.ts` — GET、PATCH、DELETE

**TDD 测试**：
```
__tests__/api/projects-crud.test.ts     — 创建/列表/重命名/删除/401
```

#### B.3 草稿 API
- [ ] `app/api/projects/[id]/draft/route.ts` — GET（加载）、PUT（保存 + revision 检查）
- [ ] `app/api/projects/[id]/draft/viewport/route.ts` — PATCH
- [ ] 冲突检测：revision 不匹配返回 409

**TDD 测试**：
```
__tests__/api/draft-save-load.test.ts   — 保存后加载一致
__tests__/api/draft-conflict.test.ts    — 并发保存返回 409
__tests__/unit/image-pool-codec.test.ts — imagePool 编解码往返
```

#### B.4 Web ProjectStore
- [ ] `src/stores/projectStore.ts` — Supabase + IndexedDB 双写
- [ ] 保存状态：`saving | saved | unsynced | offline | conflict`
- [ ] 防抖保存 + 独立 viewport 保存

**TDD 测试**：
```
__tests__/unit/projectStore-save.test.ts    — 防抖批量保存
__tests__/unit/projectStore-offline.test.ts — 网络错误转 offline
__tests__/unit/projectStore-conflict.test.ts — 409 转 conflict
```

#### B.5 重复标签检测
- [ ] BroadcastChannel API

#### 工作流 B 验证门控
- [ ] 迁移在干净 Supabase 实例上正常应用
- [ ] RLS 隔离测试通过
- [ ] 草稿保存/加载 + 冲突检测可用

---

### 工作流 C: 画布 + 节点

**Agent**: worktree `ws-canvas-nodes`，分支 `ws/canvas-nodes`
**前置**：工作流 B 的项目 CRUD + 草稿 API 已合并
**操作文件**：`src/features/canvas/`、`src/stores/canvasStore.ts`、`src/components/ui/`、`app/(app)/canvas/`

#### C.1 从桌面版复制画布域代码（直接复用）
- [ ] `src/features/canvas/domain/` — canvasNodes、nodeRegistry、nodeDisplay（**原样复制**）
- [ ] `src/features/canvas/models/` — 模型定义、注册表（**原样复制**）
- [ ] `src/features/canvas/tools/` — 工具类型、内置工具（**原样复制**）
- [ ] `src/features/canvas/ui/` — UI 组件（**原样复制**）
- [ ] `src/features/canvas/edges/`、`hooks/`、`pricing/`（**原样复制**）
- [ ] `src/stores/canvasStore.ts`（**原样复制**，零 Tauri 依赖）
- [ ] `src/components/ui/primitives.tsx`（**原样复制**）

#### C.2 节点组件适配（从桌面版复制后微调）
- [ ] 从桌面版复制 `nodes/*.tsx`，替换 Tauri 文件操作为 Web API（`<input type="file">`、`<a download>`、`window.open`）

#### C.3 基础设施适配器
- [ ] `infrastructure/webAiGateway.ts` — 实现 `AiGateway` 接口
- [ ] `infrastructure/webVideoGateway.ts` — 实现 `VideoAiGateway` 接口
- [ ] `infrastructure/webImageSplitGateway.ts` — 实现 `ImageSplitGateway` 接口
- [ ] `infrastructure/webImagePersistence.ts` — 实现 `ImagePersistence` 接口

#### C.4 imageData 重写
- [ ] 新增 `ImagePersistence` 接口到 `ports.ts`
- [ ] 基于 Supabase Storage 重写 imageData

**TDD 测试**：
```
__tests__/unit/imageData-web.test.ts        — URL 解析、上传逻辑
__tests__/unit/webAiGateway.test.ts         — 请求映射
__tests__/unit/webImageSplitGateway.test.ts — 参数映射
```

#### C.5 服务接线切换
- [ ] `canvasServices.ts` 切换到 Web 适配器

#### C.6 画布页面
- [ ] `app/(app)/canvas/[id]/page.tsx` — `'use client'`
- [ ] 加载草稿、自动保存、保存状态指示器

#### C.7 资产上传管道
- [ ] `POST /api/assets/upload` — 签名上传 URL
- [ ] `POST /api/assets/complete` — 注册资产元数据

**TDD 测试**：
```
__tests__/api/assets-upload.test.ts         — 上传流程
__tests__/e2e/canvas-basic.spec.ts          — 画布加载、节点渲染、拖拽、连线
__tests__/e2e/canvas-upload.spec.ts         — 上传图片、节点显示
__tests__/e2e/canvas-save.spec.ts           — 编辑、刷新、恢复
__tests__/e2e/canvas-tools.spec.ts          — 裁剪、切割工具
```

#### 工作流 C 验证门控
- [ ] 画布正常加载项目数据
- [ ] 所有节点类型正常渲染
- [ ] 图片上传 -> 显示 -> 自动保存 -> 刷新 -> 恢复
- [ ] 撤销/重做可用
- [ ] 工具产生结果节点

---

## Phase 1 退出门控

- [ ] 创建项目 -> 画布加载 -> 添加节点 -> 连线 -> 保存 -> 刷新 -> 恢复
- [ ] 上传图片 -> 节点显示 -> 自动保存持久化
- [ ] 重复标签警告
- [ ] 冲突检测（409）
- [ ] 全部测试绿色
- [ ] `npm run build` 成功

---

## Phase 2: AI 与媒体 MVP（AI Provider + 视频 Provider）

**目标**：图片生成和视频生成端到端可用。
**并行策略**：D 立即启动；E 在 D 的共享基础设施（KIE Common + Job Service）就绪后启动。

### 工作流 D: 服务端 AI Provider

**Agent**: worktree `ws-ai-providers`，分支 `ws/ai-providers`
**操作文件**：`src/server/ai/`、`src/server/jobs/`、`app/api/ai/image/`、`app/api/jobs/`

#### D.1 AI Provider 接口 + 注册表
- [ ] `src/server/ai/types.ts` — `AIProvider` 接口
- [ ] `src/server/ai/registry.ts` — Provider 注册表

#### D.2 实现 Provider（每个一文件）
- [ ] `providers/ppio.ts` — 同步 POST
- [ ] `providers/grsai.ts` — submit + poll
- [ ] `providers/kie.ts` — 文件上传 + submit + poll
- [ ] `providers/fal.ts` — 队列 API

**TDD 测试**：
```
__tests__/unit/ai-ppio.test.ts          — 请求映射、响应解析
__tests__/unit/ai-grsai.test.ts         — submit+poll 生命周期
__tests__/unit/ai-kie.test.ts           — 文件上传、submit、poll
__tests__/unit/ai-fal.test.ts           — 队列提交、状态轮询
```

#### D.3 任务服务
- [ ] `src/server/jobs/jobService.ts` — 创建、积分预扣、轮询、完成、失败、退款
- [ ] `src/server/jobs/worker.ts` — 后台轮询逻辑

**TDD 测试**：
```
__tests__/unit/jobService.test.ts       — 积分预扣/消费/退款
__tests__/integration/job-lifecycle.test.ts — 模拟 provider 全生命周期
```

#### D.4 API 路由
- [ ] `app/api/ai/image/generate/route.ts`
- [ ] `app/api/jobs/[id]/route.ts`
- [ ] `app/api/ai/models/route.ts`

**TDD 测试**：
```
__tests__/api/ai-generate.test.ts       — 提交生成、积分不足 402、未认证 401
__tests__/api/job-status.test.ts        — 轮询返回状态
```

#### D.5 Web AI Gateway
- [ ] `webAiGateway.ts` 完整实现

#### 工作流 D 验证门控
- [ ] Provider 单元测试全部通过
- [ ] 任务生命周期集成测试通过
- [ ] 积分逻辑正确

---

### 工作流 E: 服务端视频 Provider

**Agent**: worktree `ws-video-providers`，分支 `ws/video-providers`
**前置**：工作流 D 的 KIE Common + Job Service 就绪
**操作文件**：`src/server/video/`、`app/api/ai/video/`

#### E.1 视频 Provider 接口 + 注册表
- [ ] `src/server/video/types.ts`
- [ ] `src/server/video/registry.ts`

#### E.2 KIE 共享基础设施
- [ ] `providers/kie-common.ts` — API 客户端、上传、轮询

#### E.3 实现视频 Provider
- [ ] `providers/kling.ts` — multi_shots、kling_elements
- [ ] `providers/sora2.ts` — duration -> n_frames 映射
- [ ] `providers/veo.ts` — seed 校验、不同端点

**TDD 测试**：
```
__tests__/unit/video-kling.test.ts      — 参数映射
__tests__/unit/video-sora2.test.ts      — 时长转帧数
__tests__/unit/video-veo.test.ts        — seed 范围 clamp
__tests__/unit/video-kie-common.test.ts — 上传、轮询
```

#### E.4 视频 API + Realtime
- [ ] `app/api/ai/video/generate/route.ts`
- [ ] Supabase Realtime 推送任务状态
- [ ] `webVideoGateway.ts` 完整实现

**TDD 测试**：
```
__tests__/api/video-generate.test.ts    — 提交视频生成
__tests__/integration/video-lifecycle.test.ts — 全生命周期
__tests__/e2e/video-gen.spec.ts         — 生成流程、进度、结果节点
```

#### E.5 视频结果处理
- [ ] 完成后注册为 `project_asset`
- [ ] 创建 `VideoResultNode`

#### 工作流 E 验证门控
- [ ] Provider 测试全部通过
- [ ] 视频任务生命周期可用
- [ ] Realtime 推送到客户端
- [ ] 结果节点创建且视频可播放

---

## Phase 2 退出门控

- [ ] 图片生成：选模型 -> 生成 -> 结果节点出现
- [ ] 视频生成：配置 -> 提交 -> 进度显示 -> 结果节点
- [ ] 积分正确扣减，失败退款
- [ ] 页面刷新后任务恢复
- [ ] 全部测试绿色
- [ ] `npm run build` 成功

---

## Phase 3: 上线加固（支付 + 营销 + 设置）

**目标**：变现、营销和上线前打磨。
**并行策略**：G 和 H 完全独立，同时开发。

### 工作流 G: 支付 + 积分

**Agent**: worktree `ws-billing`，分支 `ws/billing`
**操作文件**：`src/server/billing/`、`app/api/billing/`、`app/api/webhooks/`、`app/(app)/billing/`

#### G.1 套餐定义
- [ ] `supabase/migrations/011_seed_plans.sql`

#### G.2 支付集成
- [ ] `paypal.ts` / `alipay.ts` / `wechatPay.ts`
- [ ] 对应 API 路由 + Webhook 处理

#### G.3 积分账本
- [ ] `credits.ts` — grant、hold、consume、release、refund、topup
- [ ] Webhook 幂等处理

**TDD 测试**：
```
__tests__/unit/credits.test.ts          — 积分算术 + 幂等性
__tests__/api/billing-paypal.test.ts    — 结账 + 捕获
__tests__/api/billing-alipay.test.ts    — 通知处理
__tests__/api/billing-wechat.test.ts    — 通知处理
```

#### G.4 支付 UI
- [ ] `app/(app)/billing/page.tsx` — 套餐对比、积分余额、支付历史

#### 工作流 G 验证门控
- [ ] 积分算术正确
- [ ] Webhook 幂等
- [ ] 沙箱支付流程可用

---

### 工作流 H: 营销 + 设置

**Agent**: worktree `ws-landing-settings`，分支 `ws/landing-settings`
**操作文件**：`app/(marketing)/`、`app/(app)/settings/`、`app/api/settings/`、`src/i18n/locales/`

#### H.1 营销页
- [ ] `app/(marketing)/page.tsx` — SSG 着陆页
- [ ] `app/(marketing)/pricing/page.tsx` — 定价对比
- [ ] SEO meta、Open Graph、响应式设计

#### H.2 设置页
- [ ] `app/(app)/settings/page.tsx` — profile、API key、主题、语言
- [ ] API Key CRUD 路由（加密存储）

#### H.3 完整 i18n 覆盖
- [ ] 审查全部用户可见文案
- [ ] zh/en 完整对齐

**TDD 测试**：
```
__tests__/unit/i18n-parity.test.ts      — 全量键值对齐
__tests__/e2e/landing.spec.ts           — 着陆页渲染
__tests__/e2e/settings.spec.ts          — 主题/语言/API Key
__tests__/e2e/i18n.spec.ts             — 中英切换无 key 泄露
```

#### 工作流 H 验证门控
- [ ] 着陆页双语可用
- [ ] 设置持久化
- [ ] API Key 加密存储
- [ ] i18n 对齐测试通过

---

## Phase 3 退出门控

- [ ] 支付沙箱流程可用
- [ ] 着陆页 SEO 就绪
- [ ] 设置正确持久化
- [ ] i18n 全覆盖
- [ ] 全部测试绿色
- [ ] `npm run build` 成功

---

## Phase 4: CI/CD Pipeline + 部署

**目标**：从 git repo 直接部署到远程服务器的自动化流水线。
**前置**：Phase 0-3 功能开发完成，本地浏览器验证通过。

### Step 1: Vercel 项目接入
- [ ] 创建 Vercel 项目，连接 GitHub 仓库
- [ ] 配置环境变量
- [ ] 验证 `git push main` 自动触发部署

### Step 2: GitHub Actions CI
- [ ] `.github/workflows/ci.yml` — 类型检查 + 单元测试 + 构建
- [ ] PR 自动运行 CI，失败阻止合并

### Step 3: E2E 集成
- [ ] CI 中运行 Playwright E2E
- [ ] 对 Vercel Preview URL 运行 E2E

### Step 4: 数据库迁移自动化
- [ ] `supabase db push` 集成到 CI
- [ ] Staging / Production 独立 Supabase 实例

### Step 5: Staging 环境
- [ ] PR 自动部署 Preview
- [ ] 部署后冒烟测试

### Phase 4 验证门控
- [ ] `git push main` -> 生产自动部署
- [ ] PR -> CI -> Preview -> E2E
- [ ] 数据库迁移自动应用
- [ ] 冒烟测试通过

---

## Agent 分配总览

```
Phase 0 (并行)
├── Agent 1: 工作流 A (Auth + Shell)          ws/auth-shell
└── Agent 2: 工作流 F (图片处理)              ws/image-processing

Phase 1 (B 先行，C 跟进)
├── Agent 1: 工作流 B (数据库 + 持久化)       ws/project-persistence
└── Agent 3: 工作流 C (画布 + 节点)           ws/canvas-nodes

Phase 2 (D 先行，E 跟进)
├── Agent 2: 工作流 D (AI Provider)           ws/ai-providers
└── Agent 4: 工作流 E (视频 Provider)         ws/video-providers

Phase 3 (并行)
├── Agent 5: 工作流 G (支付)                  ws/billing
└── Agent 6: 工作流 H (营销 + 设置)           ws/landing-settings

Phase 4 (顺序)
└── Agent 1: CI/CD Pipeline                  main
```

### Agent 时间线（最大并行度）

```
时间 ──────────────────────────────────────────────────────>
Agent 1: [====A====]→[=====B=====]→·····················→[==CI/CD==]
Agent 2: [====F====]→·→[=====D=====]→·····················
Agent 3: ···········→···[=====C=====]→·····················
Agent 4: ···················→···[=====E=====]→·············
Agent 5: ·····································[====G====]→·
Agent 6: ·····································[====H====]→·
```

---

## 验证检查点

### Phase 0 后
1. 注册 -> 登录 -> 仪表盘 -> 登出 -> 重定向
2. 图片 API 处理真实图片

### Phase 1 后
1. 创建项目 -> 画布 -> 节点 -> 连线 -> 撤销/重做
2. 上传图片 -> 显示 -> 自动保存 -> 刷新 -> 恢复
3. 重复标签警告

### Phase 2 后
1. 图片生成 -> 积分扣减 -> 结果节点
2. 视频生成 -> 进度 -> 结果节点
3. 失败 -> 积分退款

### Phase 3 后
1. 着陆页双语渲染
2. 支付流程可用
3. 设置持久化
4. 中英文完整覆盖

### Phase 4 后
1. `git push main` -> Vercel 自动部署
2. PR CI 流水线通过
3. 数据库迁移自动应用
