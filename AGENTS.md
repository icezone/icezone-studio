<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md — IceZone Studio

## 1. 项目概览

- 产品名称：**IceZone Studio** — AI Creative Studio
- 仓库：`https://github.com/icezone/icezone-studio`
- 产品目标：基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）、视频生成、AI 分析的 Web SaaS 产品。
- 前端：Next.js 15 (App Router) + React 19 + TypeScript + Zustand 5 + @xyflow/react 12 + TailwindCSS 4。
- 后端：Supabase (Auth + Postgres + Storage + Realtime) + Next.js API Routes + sharp（图片处理）。
- 认证：Supabase Auth（Email + Google + WeChat OAuth）。
- 测试：Vitest（单元/API）+ Playwright（E2E），TDD 流程。
- 关键原则：解耦、可扩展、可回归验证、自动持久化、交互性能优先。

> **项目定位**：基于桌面版（`Storyboard-Copilot`）升级的 Web SaaS 产品（IceZone Studio），沿用画布域逻辑，重构基础设施层适配 Web。

## 2. 已实现功能（截至 2026-04-05）

### 节点体系（11 种）
- **uploadNode** — 图片上传/导入
- **imageNode** — AI 图片生成与编辑
- **exportImageNode** — 生成/处理结果导出（流程创建）
- **textAnnotationNode** — 画布文字注释
- **groupNode** — 节点编组（流程创建）
- **storyboardNode** — 分镜网格拆分与导出
- **storyboardGenNode** — AI 分镜生成 + 批量生成
- **videoGenNode** — 视频生成（文字/图片驱动）
- **videoResultNode** — 视频结果播放（流程创建）
- **novelInputNode** — 小说/剧本文本分析 (N4)
- **videoAnalysisNode** — 视频场景检测 + 关键帧提取 (N1)

### AI 模型
**图片（7 模型 / 4 Provider）**：KIE（默认）、FAL、GRSAI、PPIO
**视频（5 模型 / 3 Provider）**：Kling（默认）、Sora2、VEO

### AI 分析功能
- **N1 视频分析**：场景检测 + 关键帧提取 → `/api/video/analyze`
- **N2 反向提示词**：图片→提示词生成（Gemini Vision）→ `/api/ai/reverse-prompt`
- **N3 镜头分析**：专业影视分析（景别/运镜/灯光/构图）→ `/api/ai/shot-analysis`
- **N4 小说拆分**：文本→场景拆分 + 角色提取 → `/api/ai/novel-analyze`

### 工具体系
- 裁剪 (crop)、标注 (annotate)、分镜切割 (splitStoryboard)

### 模板系统
- 3 个官方模板 + 用户自定义模板（保存/加载/发布/分享）

### BYOK（Bring Your Own Key）
- 6 Provider：kie、ppio、grsai、fal、openai、anthropic（AES-256-GCM 加密存储）

### API 端点（23+）
- AI 生成/分析、图片处理、资产管理、项目 CRUD、模板、设置、任务轮询

### 其他
- i18n（中文 + 英文）、持久化（Supabase + IndexedDB 双写）、画布交互（多选/编组/复制粘贴/撤销重做/模板/右键框选）
- CI/CD：GitHub Actions（TypeScript + Lint + Unit tests + Build + E2E）

## 3. 依赖安装权限

- 允许使用 `npm install` 安装开发过程中需要的任何工具、库和依赖。

## 4. 代码库浏览顺序

建议按以下顺序理解项目：

1. 入口与全局状态
- `app/(app)/layout.tsx`、`src/stores/authStore.ts`、`src/stores/projectStore.ts`、`src/stores/canvasStore.ts`

2. 画布主流程
- `app/(app)/canvas/[id]/page.tsx`、`src/features/canvas/Canvas.tsx`、`src/features/canvas/domain/canvasNodes.ts`、`src/features/canvas/domain/nodeRegistry.ts`

3. 节点与覆盖层
- `src/features/canvas/nodes/*.tsx`（含 VideoAnalysisNode、NovelInputNode）
- `src/features/canvas/ui/*`（含 ReversePromptDialog、ShotAnalysisDialog）

4. 工具体系
- `src/features/canvas/tools/`、`src/features/canvas/application/toolProcessor.ts`

5. 模型与供应商适配
- `src/features/canvas/models/`（image/ + video/ + providers/）

6. 模板系统
- `src/features/templates/`（TemplateLibrary、SaveTemplateDialog、templateSerializer）

7. 迁移接缝（Ports & Adapters）
- `src/features/canvas/application/ports.ts`、`src/features/canvas/infrastructure/web*.ts`

8. 服务端
- `app/api/`（23+ 端点）
- `src/server/ai/`（Provider + 分析服务）
- `src/server/video/`（视频 Provider + 场景分析）
- `src/server/image/`（sharp 图片处理）

9. 数据库
- `supabase/migrations/`、`src/lib/supabase/`

## 5. 开发工作流

1. TDD 流程：先写失败测试 -> 实现最少代码 -> 重构 -> 全量测试。
2. 数据流：UI -> Store -> 应用服务 -> API Routes -> Supabase/Provider。
3. 小步提交：每次改动后 `tsc --noEmit` + `vitest run`。
4. 本地浏览器验证优先：`npm run dev` + 浏览器验证。

## 6. 架构与解耦标准

### 6.1 依赖与边界
- 模块间优先依赖接口/类型。
- 展示层不直接耦合基础设施层；通过应用层中转。
- 迁移接缝：`ports.ts` 定义接口，`canvasServices.ts` 接线 Web 适配器。

### 6.2 单一职责
- 一个文件只做一个业务概念。

### 6.3 文件规模控制
- 舒适区 <= 400 行，警戒线 800 行，强制拆分 1000 行。

### 6.4 节点注册单一真相源
- 统一在 `domain/nodeRegistry.ts` 声明，不在其他地方重复硬编码。

## 7. UI/交互规范

- 复用 `src/components/ui/primitives.tsx`。
- 风格统一使用设计变量和 token（`index.css`）。
- 节点控制条尺寸从 `nodeControlStyles.ts` 引用。
- 节点工具条从 `nodeToolbarConfig.ts` 引用。
- 明暗主题适配：明亮 `rgba(15,23,42,0.45)`，暗黑 `dark:border-[rgba(255,255,255,0.22)]`。

## 8. 命令与验证

```bash
# 开发
npm run dev

# 快速检查
npx tsc --noEmit
npx vitest run
npm run lint

# 完整构建
npm run build

# E2E 测试
npx playwright test

# Supabase 本地
npx supabase start
npx supabase db reset
```

## 9. 性能实践

- 拖拽中不写盘；拖拽结束再保存。
- 节点渲染用 `previewImageUrl`，处理用 `imageUrl`。
- 持久化防抖 + idle 调度。
- viewport 独立轻量 API。
- Canvas 组件 `'use client'`。

## 10. 持久化规范

- Supabase Postgres + IndexedDB 双写。
- 保存状态：`saving | saved | unsynced | offline | conflict`。
- 冲突检测：`revision` 列 + `expectedRevision`。
- 资产通过 `project_assets` 表跟踪。

## 11. 测试规范

| 类别 | 工具 | 位置 |
|------|------|------|
| 单元 | Vitest | `__tests__/unit/` |
| API | Vitest | `__tests__/api/` |
| E2E | Playwright | `__tests__/e2e/` |

TDD：先写失败测试 -> 实现 -> 重构 -> 全量通过。

## 12. i18n 规范

- `src/i18n/locales/zh.json` + `en.json`，使用 `useTranslation()` + `t('key')`。
- 新增文案同步双语言包。

## 13. 模型与工具扩展规范

### 新图片模型
- 一模型一文件 → `src/features/canvas/models/image/<provider>/`

### 新视频模型
- 一模型一文件 → `src/features/canvas/models/video/<provider>/`
- 导出 `videoModel: VideoModelDefinition`

### 新 Provider
- 服务端：`src/server/ai/providers/` 或 `src/server/video/providers/`
- 前端模型定义：`src/features/canvas/models/providers/`

### 新工具
1. `tools/types.ts` 声明 → 2. `builtInTools.ts` 注册 → 3. `tool-editors/` 编辑器 → 4. `toolProcessor.ts` 执行

### 新节点
1. `canvasNodes.ts` 类型 → 2. `nodeRegistry.ts` 注册 → 3. `nodes/index.ts` 组件 → 4. 配置 connectivity

---

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
