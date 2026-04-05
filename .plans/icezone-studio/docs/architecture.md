# icezone-studio - 架构

> 维护者：team-lead, devs（架构变更后更新）
> 创建: 2026-03-25

## 系统概览

Web SaaS 产品，用户在节点画布上创建、编辑、保存分镜项目；支持 AI 图片生成/编辑和视频生成。

## 组件图

```
浏览器客户端
├── Next.js App Router (React 19, TypeScript)
│   ├── app/(auth)/         — 认证页面（SSR）
│   ├── app/(app)/          — 应用页面（含画布）
│   │   ├── layout.tsx      — 认证守卫 + Shell
│   │   ├── dashboard/      — 项目列表
│   │   └── canvas/[id]/    — 画布编辑器（'use client'）
│   └── app/api/            — API Routes（服务端）
│
├── 前端状态
│   ├── authStore (Zustand)    — 用户会话
│   ├── projectStore (Zustand) — 项目持久化（双写 IndexedDB + Supabase）
│   └── canvasStore (Zustand)  — 画布节点/边/历史
│
└── 画布域 (src/features/canvas/)
    ├── domain/             — canvasNodes, nodeRegistry, nodeDisplay（来自桌面版）
    ├── models/             — AI/Video 模型定义（来自桌面版）
    ├── tools/              — 工具类型 + 内置工具（来自桌面版）
    ├── ui/                 — UI 组件（来自桌面版）
    ├── nodes/              — 节点渲染（适配：替换 Tauri 为 Web API）
    ├── application/
    │   ├── ports.ts        — 接口定义（AiGateway, VideoAiGateway, etc.）
    │   ├── canvasServices.ts — Web 适配器接线
    │   └── toolProcessor.ts — 工具执行逻辑
    └── infrastructure/
        ├── webAiGateway.ts
        ├── webVideoGateway.ts
        ├── webImageSplitGateway.ts
        └── webImagePersistence.ts

服务端（Next.js API Routes + Server Logic）
├── src/server/ai/          — AI Provider 体系（ppio, grsai, kie, fal）
├── src/server/video/       — 视频 Provider 体系（kling, sora2, veo）
├── src/server/image/       — sharp 图片处理（split, crop, merge）
├── src/server/jobs/        — 任务编排（创建/轮询/完成/退款）
└── src/server/billing/     — 支付集成（Phase 3）

数据层
├── Supabase Auth           — 用户认证（Email + Google + WeChat OAuth）
├── Supabase Postgres       — 项目数据、资产、任务、积分、支付
├── Supabase Storage        — 图片/视频资产存储
├── Supabase Realtime       — 任务状态推送
└── IndexedDB (idb-keyval)  — 本地缓存（离线支持）
```

## 数据流

### 项目保存
```
用户操作 → canvasStore → projectStore.save()
         → 防抖 1s
         → IndexedDB（即时写入）
         → PUT /api/projects/[id]/draft（含 revision）
         → Supabase Postgres project_drafts 表
```

### AI 图片生成
```
用户点击生成 → webAiGateway.generate()
            → POST /api/ai/image/generate
            → server/ai/registry → Provider.submit()
            → 积分预扣（credit_ledger）
            → 异步：Provider.poll() → 完成
            → 注册资产（project_assets）
            → 返回图片 URL → ImageNode 更新
```

### 视频生成
```
用户提交 → webVideoGateway.generate()
        → POST /api/ai/video/generate
        → KIE Common → Provider.submit()
        → Job 创建（ai_jobs 表）
        → Supabase Realtime 订阅
        → worker.poll() 轮询 → 状态更新
        → Realtime 推送到客户端
        → 完成 → VideoResultNode 创建
```

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | Next.js App Router | 15 |
| UI 库 | React | 19 |
| 类型 | TypeScript | 5+ |
| 样式 | TailwindCSS | 4 |
| 画布 | @xyflow/react | 12 |
| 状态管理 | Zustand | 5 |
| 国际化 | i18next + react-i18next | latest |
| 后端 | Supabase (Auth+Postgres+Storage+Realtime) | latest |
| 图片处理 | sharp | latest |
| 单元测试 | Vitest | latest |
| E2E 测试 | Playwright | latest |

## 代码复用策略（来自桌面版）

- **直接复制（零改动）**：domain/, models/, tools/, ui/, edges/, hooks/, pricing/, canvasStore.ts, primitives.tsx, i18n/
- **适配改写（替换 Tauri）**：nodes/*.tsx（文件操作），toolProcessor.ts（移除直接命令导入）
- **重写（基础设施层）**：imageData.ts → Supabase Storage，projectStore.ts → Supabase+IndexedDB，canvasServices.ts → Web 适配器
- **新建（Web 专有）**：API Routes, Server-side Providers, Supabase 迁移, 认证, 支付
