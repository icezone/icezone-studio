<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md

## 1. 项目目标与技术栈

- 产品目标：基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）、视频生成的 Web SaaS 产品。
- 前端：Next.js 15 (App Router) + React 19 + TypeScript + Zustand 5 + @xyflow/react 12 + TailwindCSS 4。
- 后端：Supabase (Auth + Postgres + Storage + Realtime) + Next.js API Routes + sharp（图片处理）。
- 支付：PayPal + Alipay + WeChat Pay。
- 认证：Supabase Auth（Email + Google + WeChat OAuth）。
- 测试：Vitest（单元/API）+ Playwright（E2E），TDD 流程。
- 关键原则：解耦、可扩展、可回归验证、自动持久化、交互性能优先。

> **项目定位**：基于桌面版（`Storyboard-Copilot`）升级扩展为 Web SaaS。Web 版在 `storyboard-copilot-web` 新仓库中开发，尽可能沿用现有代码，重构基础设施层适配 Web。

## 2. 依赖安装权限

- 允许使用 `npm install` 安装开发过程中需要的任何工具、库和依赖。

## 3. 代码库浏览顺序

建议按以下顺序理解项目：

1. 入口与全局状态
- `app/(app)/layout.tsx`、`src/stores/authStore.ts`、`src/stores/projectStore.ts`、`src/stores/canvasStore.ts`

2. 画布主流程
- `app/(app)/canvas/[id]/page.tsx`、`src/features/canvas/Canvas.tsx`、`src/features/canvas/domain/canvasNodes.ts`、`src/features/canvas/domain/nodeRegistry.ts`

3. 节点与覆盖层
- `src/features/canvas/nodes/*.tsx`、`src/features/canvas/ui/*`

4. 工具体系
- `src/features/canvas/tools/`、`src/features/canvas/application/toolProcessor.ts`

5. 模型与供应商适配
- `src/features/canvas/models/`

6. 迁移接缝（Ports & Adapters）
- `src/features/canvas/application/ports.ts`、`src/features/canvas/infrastructure/web*.ts`

7. 服务端
- `app/api/`、`src/server/`

8. 数据库
- `supabase/migrations/`、`src/lib/supabase/`

## 4. 开发工作流

1. TDD 流程：先写失败测试 -> 实现最少代码 -> 重构 -> 全量测试。
2. 数据流：UI -> Store -> 应用服务 -> API Routes -> Supabase/Provider。
3. 小步提交：每次改动后 `tsc --noEmit` + `vitest run`。
4. 本地浏览器验证优先：`npm run dev` + 浏览器验证。

## 5. 架构与解耦标准

### 5.1 依赖与边界
- 模块间优先依赖接口/类型。
- 展示层不直接耦合基础设施层；通过应用层中转。
- 迁移接缝：`ports.ts` 定义接口，`canvasServices.ts` 接线 Web 适配器。

### 5.2 单一职责
- 一个文件只做一个业务概念。

### 5.3 文件规模控制
- 舒适区 <= 400 行，警戒线 800 行，强制拆分 1000 行。

### 5.4 节点注册单一真相源
- 统一在 `domain/nodeRegistry.ts` 声明，不在其他地方重复硬编码。

## 6. UI/交互规范

- 复用 `src/components/ui/primitives.tsx`。
- 风格统一使用设计变量和 token（`index.css`）。
- 节点控制条尺寸从 `nodeControlStyles.ts` 引用。
- 节点工具条从 `nodeToolbarConfig.ts` 引用。
- 明暗主题适配：明亮 `rgba(15,23,42,0.45)`，暗黑 `dark:border-[rgba(255,255,255,0.22)]`。

## 7. 命令与验证

```bash
# 开发
npm run dev

# 快速检查
npx tsc --noEmit
npx vitest run

# 完整构建
npm run build

# E2E 测试
npx playwright test

# Supabase 本地
npx supabase start
npx supabase db reset
```

## 8. 性能实践

- 拖拽中不写盘；拖拽结束再保存。
- 节点渲染用 `previewImageUrl`，处理用 `imageUrl`。
- 持久化防抖 + idle 调度。
- viewport 独立轻量 API。
- Canvas 组件 `'use client'`。

## 9. 持久化规范

- Supabase Postgres + IndexedDB 双写。
- 保存状态：`saving | saved | unsynced | offline | conflict`。
- 冲突检测：`revision` 列 + `expectedRevision`。
- 资产通过 `project_assets` 表跟踪。

## 10. 测试规范

| 类别 | 工具 | 位置 |
|------|------|------|
| 单元 | Vitest | `__tests__/unit/` |
| API | Vitest | `__tests__/api/` |
| E2E | Playwright | `__tests__/e2e/` |

TDD：先写失败测试 -> 实现 -> 重构 -> 全量通过。

## 11. i18n 规范

- `src/i18n/locales/zh.json` + `en.json`，使用 `useTranslation()` + `t('key')`。
- 新增文案同步双语言包。

---

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
