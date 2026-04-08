# 代码库导航

建议按以下顺序理解项目代码库（Web 版结构）。

## 1. 入口与全局状态

**核心文件**:
- `app/(app)/layout.tsx` - 应用布局与全局 Provider
- `src/stores/authStore.ts` - 认证状态管理
- `src/stores/projectStore.ts` - 项目状态管理
- `src/stores/canvasStore.ts` - 画布状态管理

**说明**: 这些文件定义了应用的全局状态和数据流入口。理解 Zustand store 的结构是后续开发的基础。

## 2. 画布主流程

**核心文件**:
- `app/(app)/canvas/[id]/page.tsx` - 画布页面入口
- `src/features/canvas/Canvas.tsx` - 画布主组件
- `src/features/canvas/domain/canvasNodes.ts` - 节点类型定义
- `src/features/canvas/domain/nodeRegistry.ts` - 节点注册表
- `src/features/canvas/NodeSelectionMenu.tsx` - 节点选择菜单

**说明**: 画布是产品的核心交互区域。理解节点注册机制和 @xyflow/react 集成是关键。

## 3. 节点与覆盖层

**核心文件**:
- `src/features/canvas/nodes/*.tsx` - 所有节点组件
- `src/features/canvas/nodes/ImageEditNode.tsx` - 图片编辑节点
- `src/features/canvas/nodes/GroupNode.tsx` - 编组节点
- `src/features/canvas/ui/SelectedNodeOverlay.tsx` - 选中覆盖层
- `src/features/canvas/ui/NodeActionToolbar.tsx` - 节点操作工具条
- `src/features/canvas/ui/NodeToolDialog.tsx` - 节点工具对话框
- `src/features/canvas/ui/nodeControlStyles.ts` - 节点控制条样式
- `src/features/canvas/ui/nodeToolbarConfig.ts` - 节点工具条配置

**说明**: 11 种节点各有独特的 UI 和交互逻辑。理解节点生命周期和数据流是扩展功能的基础。

## 4. 工具体系（重点）

**核心文件**:
- `src/features/canvas/tools/types.ts` - 工具类型定义
- `src/features/canvas/tools/builtInTools.ts` - 内置工具注册
- `src/features/canvas/ui/tool-editors/*` - 工具编辑器 UI
- `src/features/canvas/application/toolProcessor.ts` - 工具执行器

**说明**: 工具体系采用插件化架构：类型定义 → 注册 → 编辑器 → 执行器。理解这个流程是添加新工具的关键。

## 5. 模型与供应商适配

**核心文件**:
- `src/features/canvas/models/types.ts` - 模型类型定义
- `src/features/canvas/models/registry.ts` - 图片模型注册表
- `src/features/canvas/models/videoRegistry.ts` - 视频模型注册表
- `src/features/canvas/models/image/*` - 图片模型定义
- `src/features/canvas/models/video/*` - 视频模型定义
- `src/features/canvas/models/providers/*` - Provider 定义

**说明**: 模型采用自动发现机制。每个模型文件导出标准格式，注册表自动加载。支持热插拔扩展。

## 6. 迁移接缝（Ports & Adapters）

**核心文件**:
- `src/features/canvas/application/ports.ts` - 核心接口定义
- `src/features/canvas/application/canvasServices.ts` - 适配器接线
- `src/features/canvas/infrastructure/webAiGateway.ts` - AI 网关适配器
- `src/features/canvas/infrastructure/webVideoGateway.ts` - 视频网关适配器
- `src/features/canvas/infrastructure/webImageSplitGateway.ts` - 图片切割网关
- `src/features/canvas/infrastructure/webImagePersistence.ts` - 图片持久化适配器
- `src/features/canvas/infrastructure/webLlmAnalysisGateway.ts` - LLM 分析网关（N2/N3/N4）

**说明**: Ports & Adapters 模式将领域逻辑与基础设施解耦。ports.ts 定义接口，infrastructure/ 提供 Web 实现。

## 7. 服务端（API Routes + Server Logic）

### API Routes

- `app/api/projects/` - 项目 CRUD
- `app/api/projects/[id]/draft/` - 草稿读写
- `app/api/assets/` - 资产上传/管理
- `app/api/ai/image/` - 图片生成 API
- `app/api/ai/video/` - 视频生成 API
- `app/api/ai/reverse-prompt/` - N2: 反向提示词
- `app/api/ai/shot-analysis/` - N3: 镜头分析
- `app/api/ai/novel-analyze/` - N4: 小说拆分
- `app/api/video/analyze/` - N1: 视频分析
- `app/api/image/` - 图片处理（split/crop/merge/metadata）
- `app/api/templates/` - 模板 CRUD + publish + use
- `app/api/jobs/[id]/` - 任务状态轮询
- `app/api/settings/` - API Key 管理（AES-256-GCM 加密）
- `app/api/billing/` - 支付

### Server Logic

- `src/server/ai/` - AI Provider 实现 + 分析服务
- `src/server/ai/analysis/` - reversePrompt / shotAnalysis / novelAnalysis
- `src/server/video/` - 视频 Provider 实现
- `src/server/video/analysis/` - 场景检测 + 关键帧提取
- `src/server/image/` - sharp 图片处理
- `src/server/jobs/` - 任务编排

**说明**: API Routes 负责 HTTP 请求处理，Server Logic 封装业务逻辑。两者解耦便于测试和复用。

## 8. 数据库

**核心文件**:
- `supabase/migrations/` - SQL 迁移文件
- `src/lib/supabase/client.ts` - 浏览器端 Supabase 客户端
- `src/lib/supabase/server.ts` - 服务端 Supabase 客户端

**说明**: 数据库 schema 通过迁移管理。客户端和服务端使用不同的 Supabase 实例（认证上下文不同）。

---

相关文档：
- `tech-stack.md` - 技术栈说明
- `layering.md` - 分层架构详解
- `data-flow.md` - 数据流模式
