# 文档重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CLAUDE.md 和 AGENTS.md 重构为精简入口文档，并将详细内容拆分到 docs/ 下的 24 个分类文档中。

**Architecture:** 清理现有 planning 文件 → 创建目录结构 → 按优先级创建 24 个详细文档 → 重写入口文档 → 单次提交。所有文档使用中文，AGENTS.md 作为主索引。

**Tech Stack:** Markdown, Git

---

## 任务总览

1. 清理现有文档
2. 创建目录结构
3. 创建核心架构文档（3 个）
4. 创建产品功能文档（5 个）
5. 创建 API 参考文档（3 个）
6. 创建开发规范文档（7 个）
7. 创建架构补充文档（2 个）
8. 创建扩展指南文档（4 个）
9. 重写 AGENTS.md
10. 重写 CLAUDE.md
11. 验证并提交

---

## Task 1: 清理现有文档

**Files:**
- Delete: `docs/WAVE0-WAVE1-IMPLEMENTATION-SUMMARY.md`
- Delete: `docs/implementation-guide-wave0-wave1.md`
- Delete: `docs/N1-IMPLEMENTATION.md`
- Delete: `docs/N1-N8-IMPLEMENTATION-STATUS.md`
- Delete: `docs/N2-IMPLEMENTATION.md`
- Delete: `docs/N3-IMPLEMENTATION.md`
- Delete: `docs/feature-design-wave0-wave1.md`
- Delete: `docs/implementation-plan.md`
- Delete: `docs/migration-plan-v2.md`
- Delete: `docs/system-design-plan.md`

- [ ] **Step 1: 删除所有旧 planning 文件**

```bash
cd docs
rm WAVE0-WAVE1-IMPLEMENTATION-SUMMARY.md
rm implementation-guide-wave0-wave1.md
rm N1-IMPLEMENTATION.md
rm N1-N8-IMPLEMENTATION-STATUS.md
rm N2-IMPLEMENTATION.md
rm N3-IMPLEMENTATION.md
rm feature-design-wave0-wave1.md
rm implementation-plan.md
rm migration-plan-v2.md
rm system-design-plan.md
```

- [ ] **Step 2: 验证删除**

Run: `ls docs/*.md`
Expected: 只显示 superpowers/ 下的文件，docs/ 根目录无 .md 文件

---

## Task 2: 创建目录结构

**Files:**
- Create: `docs/architecture/`
- Create: `docs/product/`
- Create: `docs/api/`
- Create: `docs/standards/`
- Create: `docs/extensions/`

- [ ] **Step 1: 创建所有子目录**

```bash
mkdir -p docs/architecture
mkdir -p docs/product
mkdir -p docs/api
mkdir -p docs/standards
mkdir -p docs/extensions
```

- [ ] **Step 2: 验证目录结构**

Run: `ls -d docs/*/`
Expected: 显示 5 个新目录和 superpowers/

---

## Task 3: 创建 tech-stack.md

**Files:**
- Create: `docs/architecture/tech-stack.md`

- [ ] **Step 1: 创建技术栈文档**

```markdown
# 技术栈与依赖

## 产品信息

- **产品名称**: IceZone Studio — AI Creative Studio
- **仓库**: `https://github.com/icezone/icezone-studio`
- **产品目标**: 基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）、视频生成、AI 分析的 Web SaaS 产品

## 前端技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **类型系统**: TypeScript
- **状态管理**: Zustand 5
- **画布引擎**: @xyflow/react 12
- **样式方案**: TailwindCSS 4

## 后端技术栈

- **基础设施**: Supabase
  - 认证 (Auth)
  - 数据库 (Postgres)
  - 存储 (Storage)
  - 实时通信 (Realtime)
- **API 层**: Next.js API Routes
- **图片处理**: sharp

## 支付集成

- PayPal
- Alipay
- WeChat Pay

支持全球 + 中国市场。

## 认证方案

Supabase Auth 支持：
- Email + 密码
- Google OAuth
- WeChat OAuth

## 测试框架

- **单元测试**: Vitest
- **API 测试**: Vitest
- **E2E 测试**: Playwright

## 多媒体支持

- **图片生成/编辑**: 同步 + 异步模式
- **视频生成**: 异步轮询 + Realtime 推送
- **AI 视觉分析**: Gemini Vision API

## 关键原则

1. **解耦**: 模块间依赖接口而非实现
2. **可扩展**: 支持新节点/模型/Provider 热插拔
3. **可回归验证**: TDD 流程，完整测试覆盖
4. **自动持久化**: Supabase + IndexedDB 双写
5. **交互性能优先**: 防抖、idle 调度、客户端渲染

## 项目定位

基于桌面版（Storyboard-Copilot）升级的 Web SaaS 产品：
- 沿用画布域逻辑
- 沿用模型定义
- 沿用工具体系
- 沿用 UI 组件
- 重构基础设施层适配 Web 架构

## 依赖安装权限

- 允许使用 `npm install` 安装开发过程中需要的任何工具、库和依赖
- 安装新依赖后应更新 `package.json`，确保 `package-lock.json` 同步
- 优先选择社区主流、维护活跃的包
- 避免引入过大或过冷门的依赖

---

相关文档：
- `layering.md` - 分层架构说明
- `codebase-guide.md` - 代码库导航
- `../product/features-overview.md` - 产品功能概览
```

写入文件: `docs/architecture/tech-stack.md`

- [ ] **Step 2: 验证文件创建**

Run: `cat docs/architecture/tech-stack.md | head -20`
Expected: 显示文档标题和产品信息部分

---

## Task 4: 创建 codebase-guide.md

**Files:**
- Create: `docs/architecture/codebase-guide.md`

- [ ] **Step 1: 创建代码库导航文档**

```markdown
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
```

写入文件: `docs/architecture/codebase-guide.md`

- [ ] **Step 2: 验证文件创建**

Run: `wc -l docs/architecture/codebase-guide.md`
Expected: 显示约 130-150 行

---

## Task 5: 创建 development-workflow.md

**Files:**
- Create: `docs/standards/development-workflow.md`

- [ ] **Step 1: 创建开发工作流文档**

内容见设计文档"示例 3: docs/standards/development-workflow.md"部分，完整复制该内容。

写入文件: `docs/standards/development-workflow.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep -c "## " docs/standards/development-workflow.md`
Expected: 显示约 9-10 个二级标题

---

## Task 6: 创建 features-overview.md

**Files:**
- Create: `docs/product/features-overview.md`

- [ ] **Step 1: 创建功能概览文档**

```markdown
# 功能概览

本文档概述 IceZone Studio 的核心功能和实现状态（截至 2026-04-05）。

## 产品定位

IceZone Studio 是基于桌面版（Storyboard-Copilot）升级的 Web SaaS 产品：
- 沿用画布域逻辑
- 沿用模型定义
- 沿用工具体系
- 沿用 UI 组件
- 重构基础设施层适配 Web 架构

从本地应用演进为云端 SaaS，支持多用户、多项目、实时协作。

## 核心功能模块

### 1. 画布系统

- **节点编排**: 11 种节点类型，支持拖拽、连线、分组
- **交互操作**: 多选、复制粘贴、撤销重做、右键框选
- **视口管理**: 缩放、平移、缩略图导航
- **模板系统**: 保存/加载/发布/分享画布配置

### 2. AI 生成

- **图片生成**: 7 个模型 / 4 个 Provider（KIE、FAL、GRSAI、PPIO）
- **视频生成**: 5 个模型 / 3 个 Provider（Kling、Sora2、VEO）
- **异步任务**: 轮询 + Realtime 推送

### 3. AI 分析

- **N1: 视频分析**: 场景检测 + 关键帧提取
- **N2: 反向提示词**: 图片 → 提示词生成（Gemini Vision）
- **N3: 镜头分析**: 专业影视分析（景别/运镜/灯光/构图）
- **N4: 小说拆分**: 文本 → 场景拆分 + 角色提取

### 4. 工具处理

- **裁剪工具**: 预设比例 + 自定义比例
- **标注工具**: 颜色/线宽/字号可调
- **分镜切割**: 行列网格 + 线宽

### 5. 项目管理

- **CRUD**: 创建、读取、更新、删除项目
- **自动保存**: Supabase + IndexedDB 双写
- **冲突检测**: 基于 revision 的乐观锁
- **资产管理**: 统一跟踪上传/生成的媒体文件

### 6. 认证与授权

- **认证方式**: Email/密码 + Google OAuth + WeChat OAuth
- **BYOK**: 支持 6 个 Provider 的自带 API Key（AES-256-GCM 加密）

### 7. 国际化

- **支持语言**: 中文 + 英文
- **动态切换**: 运行时无刷新切换
- **完整覆盖**: UI 文案、节点标题、错误提示

### 8. CI/CD

- **GitHub Actions**: TypeScript check + Lint + Unit tests + Build + E2E
- **发布流程**: 自动版本号递增 + CHANGELOG 生成

## 功能成熟度

### ✅ 已完成（Production Ready）

- 画布基础交互
- 图片生成与编辑（7 个模型）
- 视频生成（5 个模型）
- AI 分析功能（N1-N4）
- 工具体系（裁剪/标注/分镜）
- 模板系统
- 项目 CRUD + 自动保存
- 认证授权
- i18n 双语

### 🚧 进行中（In Progress）

- 支付集成（PayPal + Alipay + WeChat Pay）
- 实时协作（Supabase Realtime）
- 移动端适配

### 📋 计划中（Planned）

- 更多 AI 模型接入
- 高级工具（蒙版、修复、超分辨率）
- 团队协作功能
- 版本历史与分支

---

相关文档：
- `nodes.md` - 节点类型详细清单
- `models.md` - AI 模型详细清单
- `tools.md` - 工具体系说明
- `templates.md` - 模板系统说明
- `../architecture/tech-stack.md` - 技术栈说明
```

写入文件: `docs/product/features-overview.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "##" docs/product/features-overview.md`
Expected: 显示所有二级和三级标题

---

## Task 7: 创建 nodes.md

**Files:**
- Create: `docs/product/nodes.md`

- [ ] **Step 1: 创建节点类型文档**

```markdown
# 节点类型清单

本文档详细列出 IceZone Studio 支持的所有节点类型（共 11 种）。

## 节点类型表

| 节点 | 类型 ID | 菜单可见 | 说明 |
|------|---------|---------|------|
| 上传图片 | `uploadNode` | ✅ | 图片上传/导入，支持宽高比管理 |
| 图片编辑 | `imageNode` | ✅ | AI 图片生成与编辑 |
| 导出结果 | `exportImageNode` | 流程创建 | 生成/处理结果展示 |
| 文字标注 | `textAnnotationNode` | ✅ | 画布文字注释 |
| 编组 | `groupNode` | 流程创建 | 节点分组/组织 |
| 分镜拆分 | `storyboardNode` | ✅ | 网格切割与导出 |
| 分镜生成 | `storyboardGenNode` | ✅ | AI 分镜描述 + 参考图 + 批量生成 |
| 视频生成 | `videoGenNode` | ✅ | 视频生成（文字/图片驱动） |
| 视频结果 | `videoResultNode` | 流程创建 | 视频生成结果播放 |
| 小说输入 | `novelInputNode` | ✅ | 小说/剧本文本分析与拆分 (N4) |
| 视频分析 | `videoAnalysisNode` | ✅ | 视频场景检测与关键帧提取 (N1) |

## 节点分类

### 用户可手动创建

这些节点在节点选择菜单中可见：
- `uploadNode` - 上传图片
- `imageNode` - 图片编辑
- `textAnnotationNode` - 文字标注
- `storyboardNode` - 分镜拆分
- `storyboardGenNode` - 分镜生成
- `videoGenNode` - 视频生成
- `novelInputNode` - 小说输入
- `videoAnalysisNode` - 视频分析

### 仅流程创建

这些节点由应用流程自动创建，不出现在菜单中：
- `exportImageNode` - AI 生成或工具处理后自动创建
- `groupNode` - 多选节点后手动编组创建
- `videoResultNode` - 视频生成完成后自动创建

## 节点注册规则

### 单一真相源

节点类型、默认数据、菜单展示、连线能力统一在 `domain/nodeRegistry.ts` 声明，禁止在其他地方重复硬编码。

### 连线能力配置（connectivity）

每个节点在注册表中定义 `connectivity` 配置：

```typescript
connectivity: {
  sourceHandle: boolean,    // 是否具备输出端口
  targetHandle: boolean,    // 是否具备输入端口
  connectMenu: {
    fromSource: boolean,    // 从输出端拉线时，是否出现在创建菜单
    fromTarget: boolean     // 从输入端拉线时，是否出现在创建菜单
  }
}
```

### 菜单候选节点

菜单候选节点必须由注册表函数统一推导（如 `getConnectMenuNodeTypes`），禁止在 UI 层手写类型白名单。

### 内部衍生节点

内部衍生节点（如 `exportImageNode`、`groupNode`）默认 `connectMenu` 关闭，只能由应用流程自动创建。

## 节点详细说明

### uploadNode（上传图片）

**功能**：
- 本地图片上传
- URL 导入
- 宽高比约束管理

**输出**：
- 图片 URL（用于后续节点）
- 图片元数据（宽度、高度、格式）

**连线**：
- 输出端口：✅
- 输入端口：❌

---

### imageNode（图片编辑）

**功能**：
- AI 图片生成（文字驱动）
- AI 图片编辑（图片 + 文字驱动）
- 支持 7 个模型（KIE、FAL、GRSAI、PPIO）

**输入**：
- 可选：参考图片（从上游节点）
- 必需：提示词

**输出**：
- 生成的图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### exportImageNode（导出结果）

**功能**：
- 展示生成/处理后的图片
- 提供下载按钮

**输入**：
- 必需：图片 URL（从上游节点）

**连线**：
- 输出端口：❌
- 输入端口：✅

**创建方式**：
- 自动创建（AI 生成完成后）
- 自动创建（工具处理完成后）

---

### textAnnotationNode（文字标注）

**功能**：
- 画布上添加文字注释
- 支持 Markdown 格式

**连线**：
- 输出端口：❌
- 输入端口：❌

---

### groupNode（编组）

**功能**：
- 将多个节点组织为一个逻辑分组
- 支持折叠/展开
- 支持嵌套分组

**创建方式**：
- 多选节点后，点击"编组"按钮

**连线**：
- 输出端口：❌
- 输入端口：❌

---

### storyboardNode（分镜拆分）

**功能**：
- 将图片按网格切割为多个分镜
- 配置行数、列数、线宽

**输入**：
- 必需：图片 URL

**输出**：
- 多个分镜图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### storyboardGenNode（分镜生成）

**功能**：
- 输入分镜描述，AI 生成参考图
- 支持批量生成（一次生成多个分镜）

**输入**：
- 必需：分镜描述列表

**输出**：
- 多个生成的图片 URL

**连线**：
- 输出端口：✅
- 输入端口：❌

---

### videoGenNode（视频生成）

**功能**：
- 文字驱动视频生成
- 图片驱动视频生成（Image-to-Video）
- 支持 5 个模型（Kling、Sora2、VEO）

**输入**：
- 可选：参考图片
- 必需：提示词

**输出**：
- 视频 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### videoResultNode（视频结果）

**功能**：
- 播放生成的视频
- 提供下载按钮

**输入**：
- 必需：视频 URL

**连线**：
- 输出端口：❌
- 输入端口：✅

**创建方式**：
- 自动创建（视频生成完成后）

---

### novelInputNode（小说输入）

**功能**：
- 输入小说/剧本文本
- AI 自动拆分场景
- 提取角色列表

**输出**：
- 场景描述列表
- 角色信息

**连线**：
- 输出端口：✅
- 输入端口：❌

**关联 API**: `/api/ai/novel-analyze`

---

### videoAnalysisNode（视频分析）

**功能**：
- 视频场景检测
- 关键帧提取

**输入**：
- 必需：视频 URL

**输出**：
- 场景边界时间戳
- 关键帧图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

**关联 API**: `/api/video/analyze`

---

相关文档：
- `../extensions/add-node.md` - 新增节点指南
- `models.md` - AI 模型清单
- `tools.md` - 工具体系
- `../architecture/codebase-guide.md` - 节点代码位置
```

写入文件: `docs/product/nodes.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep -c "###" docs/product/nodes.md`
Expected: 显示约 15-20 个三级标题

---

## Task 8: 创建 models.md

**Files:**
- Create: `docs/product/models.md`

- [ ] **Step 1: 创建 AI 模型文档**

```markdown
# AI 模型清单

本文档列出 IceZone Studio 支持的所有 AI 模型和 Provider。

## 图片生成模型

共 7 个模型，分布在 4 个 Provider：

### KIE（默认）

- **nano-banana-2**: 标准版本，速度快
- **nano-banana-pro**: 高质量版本，细节更丰富

### FAL

- **nano-banana-2**: 标准版本
- **nano-banana-pro**: 高质量版本

### GRSAI

- **nano-banana-2**: 标准版本
- **nano-banana-pro**: 高质量版本

### PPIO

- **gemini-3.1-flash**: 基于 Gemini 的快速生成模型

## 视频生成模型

共 5 个模型，分布在 3 个 Provider：

### Kling（默认）

**模型**: `kling/kling-3.0`

**支持时长**:
- 3s
- 5s
- 10s
- 15s

**支持宽高比**:
- 16:9（横屏）
- 9:16（竖屏）
- 1:1（方形）

**特性**:
- 支持 Image-to-Video
- 支持音频生成
- 支持种子控制

**API 基础设施**: 基于 KIE API

---

### Sora2

**模型**:
- `sora2/sora2-pro` - 高质量版本
- `sora2/sora2-standard` - 标准版本

**支持时长**:
- 10s
- 15s

**时长映射**: duration → n_frames（内部转换）

**API 基础设施**: 基于 KIE API

---

### VEO

**模型**:
- `veo/veo3` - 标准质量
- `veo/veo3_fast` - 快速生成

**种子范围**: 10000-99999（自动 clamp）

**API 基础设施**: 基于 KIE API

## AI 分析功能

### N1: 视频分析

**功能**:
- 场景检测（Scene Detection）
- 关键帧提取（Key Frame Extraction）

**API 端点**: `/api/video/analyze`

**节点**: `videoAnalysisNode`

**技术**:
- 使用 ffmpeg 进行场景检测
- 基于相似度算法提取关键帧

---

### N2: 反向提示词

**功能**:
- 从图片生成描述性提示词
- 用于 AI 图片生成的参考

**API 端点**: `/api/ai/reverse-prompt`

**对话框**: `ReversePromptDialog`

**技术**:
- Gemini Vision API
- 多语言支持（中文/英文）

---

### N3: 镜头分析

**功能**:
- 专业影视镜头分析
- 输出景别、运镜、灯光、构图信息

**API 端点**: `/api/ai/shot-analysis`

**对话框**: `ShotAnalysisDialog`

**技术**:
- Gemini Vision API
- 结构化输出（JSON）

---

### N4: 小说拆分

**功能**:
- 文本场景拆分
- 角色提取

**API 端点**: `/api/ai/novel-analyze`

**节点**: `novelInputNode`

**技术**:
- Gemini Text API
- 基于章节/段落的智能分割

## BYOK（Bring Your Own Key）

支持用户自带 API Key，避免消耗平台额度。

### 支持的 Provider

1. **kie** - KIE API Key
2. **ppio** - PPIO API Key
3. **grsai** - GRSAI API Key
4. **fal** - FAL API Key
5. **openai** - OpenAI API Key
6. **anthropic** - Anthropic API Key

### 存储方式

- **加密算法**: AES-256-GCM
- **存储位置**: Supabase `user_settings` 表
- **作用域**: 每个用户独立存储

### 使用优先级

1. 用户自带 Key（如果已配置）
2. 平台默认 Key

## 模型扩展

### 自动发现机制

每个模型文件导出标准格式的定义对象：

```typescript
// 图片模型
export const imageModel: ImageModelDefinition = { ... };

// 视频模型
export const videoModel: VideoModelDefinition = { ... };
```

注册表自动扫描并加载所有符合格式的模型。

### Provider 共享基础设施

所有基于 KIE API 的 Provider 共享：
- 统一 API Key 管理
- 共享图片上传逻辑（支持 http://、data:、base64）
- 共享状态轮询逻辑

文件位置: `src/server/video/providers/kie-common.ts`

---

相关文档：
- `../extensions/add-model.md` - 新增模型指南
- `../extensions/add-provider.md` - 新增 Provider 指南
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - API 端点参考
```

写入文件: `docs/product/models.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "##" docs/product/models.md`
Expected: 显示所有二级和三级标题

---

## Task 9: 创建 tools.md

**Files:**
- Create: `docs/product/tools.md`

- [ ] **Step 1: 创建工具体系文档**

```markdown
# 工具体系

本文档说明 IceZone Studio 的工具处理能力。

## 工具概览

当前支持 3 种内置工具：

| 工具 | 插件 ID | 功能 | 编辑器 |
|------|---------|------|--------|
| 裁剪 | `cropToolPlugin` | 图片裁剪 | `CropEditor` |
| 标注 | `annotateToolPlugin` | 画笔标注 | `AnnotateEditor` |
| 分镜切割 | `splitStoryboardToolPlugin` | 网格切割 | `SplitStoryboardEditor` |

## 工具架构

工具体系采用插件化架构，分为 4 层：

```
1. 类型定义 (tools/types.ts)
     ↓
2. 工具注册 (tools/builtInTools.ts)
     ↓
3. 编辑器 UI (ui/tool-editors/*)
     ↓
4. 执行器 (application/toolProcessor.ts)
```

### 类型定义

定义工具能力接口：

```typescript
export interface ToolPlugin {
  id: string;
  displayName: string;
  editorKind: 'crop' | 'annotate' | 'splitStoryboard';
  createDefaultAnnotation(): ToolAnnotation;
}
```

### 工具注册

在 `builtInTools.ts` 注册所有内置工具：

```typescript
export const builtInTools: ToolPlugin[] = [
  cropToolPlugin,
  annotateToolPlugin,
  splitStoryboardToolPlugin,
];
```

### 编辑器 UI

每个工具对应一个独立的编辑器组件：

- `CropEditor.tsx` - 裁剪框选择器
- `AnnotateEditor.tsx` - 画笔工具条
- `SplitStoryboardEditor.tsx` - 网格配置器

### 执行器

`toolProcessor.ts` 根据工具类型调用对应的 API 端点：

```typescript
export async function processTool(
  toolId: string,
  imageUrl: string,
  annotation: ToolAnnotation
): Promise<ProcessedResult>
```

## 工具详细说明

### 裁剪工具

**功能**：
- 选择图片的局部区域
- 支持预设比例（1:1、4:3、16:9 等）
- 支持自定义比例

**编辑器参数**：
```typescript
interface CropAnnotation {
  x: number;      // 左上角 X 坐标（像素）
  y: number;      // 左上角 Y 坐标（像素）
  width: number;  // 裁剪宽度（像素）
  height: number; // 裁剪高度（像素）
}
```

**API 端点**: `/api/image/crop`

**输出**：
- 裁剪后的图片 URL
- 自动创建 `exportImageNode` 展示结果

---

### 标注工具

**功能**：
- 在图片上绘制标注
- 可调颜色、线宽、字号

**编辑器参数**：
```typescript
interface AnnotateAnnotation {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  texts: Array<{
    content: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  }>;
}
```

**API 端点**: `/api/image/annotate`（内部通过 sharp 渲染）

**输出**：
- 标注后的图片 URL
- 自动创建 `exportImageNode` 展示结果

---

### 分镜切割工具

**功能**：
- 将图片按网格切割为多个分镜
- 配置行数、列数、线宽

**编辑器参数**：
```typescript
interface SplitStoryboardAnnotation {
  rows: number;       // 行数（1-10）
  columns: number;    // 列数（1-10）
  lineWidth: number;  // 网格线宽度（像素）
}
```

**API 端点**: `/api/image/split`

**输出**：
- 多个分镜图片 URL
- 自动创建多个 `exportImageNode` 展示结果

## 工具使用流程

1. **选择节点**：点击画布上的图片节点
2. **打开工具对话框**：点击节点工具条上的"工具"按钮
3. **选择工具**：在对话框中选择一个工具
4. **配置参数**：通过编辑器 UI 调整参数
5. **预览效果**：实时预览（如果支持）
6. **执行处理**：点击"应用"按钮
7. **查看结果**：自动创建结果节点，显示处理后的图片

## 工具产物规则

**重要原则**：工具处理后生成新节点，不覆盖原节点。

**原因**：
- 保留原始数据，支持撤销
- 符合画布"流式处理"理念
- 便于对比处理前后的效果

**实现**：
- `toolProcessor.ts` 处理完成后返回新图片 URL
- 调用方（如 `NodeToolDialog`）负责创建新节点
- 新节点自动连线到原节点的下游

---

相关文档：
- `../extensions/add-tool.md` - 新增工具指南
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - 图片处理 API
- `../architecture/codebase-guide.md` - 工具代码位置
```

写入文件: `docs/product/tools.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "###" docs/product/tools.md`
Expected: 显示 3 个工具的详细说明

---

## Task 10: 创建 templates.md

**Files:**
- Create: `docs/product/templates.md`

- [ ] **Step 1: 创建模板系统文档**

```markdown
# 模板系统

本文档说明 IceZone Studio 的模板系统。

## 模板概览

模板是预配置的画布状态，包含：
- 节点配置（类型、位置、数据）
- 连线关系
- 布局结构

用户可以：
- 使用官方模板快速开始
- 保存自定义模板
- 分享模板给其他用户

## 官方模板

IceZone Studio 提供 3 个官方模板：

### 1. 小说转分镜

**用途**: 将小说/剧本转换为分镜序列

**节点组成**:
- `novelInputNode` - 输入小说文本
- 多个 `storyboardGenNode` - 为每个场景生成分镜

**适用场景**:
- 剧本可视化
- 漫画创作
- 动画预制

---

### 2. 视频拆解重制

**用途**: 分析视频并重新制作类似风格的内容

**节点组成**:
- `videoAnalysisNode` - 分析视频场景
- 多个 `imageNode` - 为关键帧生成新图片
- `videoGenNode` - 合成新视频

**适用场景**:
- 视频风格迁移
- 内容重制
- 参考学习

---

### 3. 批量图片生成

**用途**: 批量生成同系列图片

**节点组成**:
- 多个 `imageNode` - 使用相似提示词生成
- 批量导出节点

**适用场景**:
- 系列插画创作
- 产品图批量生成
- A/B 测试

## 用户自定义模板

### 保存模板

1. 在画布中完成布局和配置
2. 点击顶部工具栏的"保存为模板"
3. 填写模板信息：
   - 名称
   - 描述
   - 缩略图（自动生成）
4. 选择可见性：
   - 私有（仅自己可见）
   - 公开（所有用户可见）

### 加载模板

1. 点击"模板库"按钮
2. 浏览官方模板或我的模板
3. 点击"使用此模板"
4. 模板内容加载到当前画布

### 发布模板

私有模板可以发布为公开模板：

1. 在"我的模板"列表中选择模板
2. 点击"发布"按钮
3. 系统审核通过后，模板出现在"官方模板"区

### 分享模板

通过模板 ID 分享模板：

```
https://icezone.studio/templates/{template-id}
```

其他用户访问链接后可以：
- 预览模板
- 使用模板创建新项目

## 模板序列化

### 画布 → 模板

**序列化内容**:
```typescript
interface TemplateData {
  nodes: CanvasNode[];      // 节点配置
  edges: CanvasEdge[];      // 连线关系
  viewport: {               // 视口状态
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {               // 元数据
    name: string;
    description: string;
    thumbnail: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**图片去重**:
- 使用 `imagePool + __img_ref__` 编码
- 相同图片只存储一次
- 减少模板文件大小

**敏感数据清理**:
- 移除 API Key
- 移除用户 ID
- 移除项目 ID

### 模板 → 画布

**反序列化流程**:

1. 加载模板数据
2. 重新生成节点 ID（避免冲突）
3. 重新生成边 ID
4. 解码图片引用
5. 应用到画布

**位置调整**:
- 模板默认居中显示
- 用户可以拖拽调整

## 模板存储

### 数据库表结构

**templates 表**:
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API 端点

- `GET /api/templates` - 列出模板
- `GET /api/templates/{id}` - 获取模板详情
- `POST /api/templates` - 创建模板
- `PUT /api/templates/{id}` - 更新模板
- `DELETE /api/templates/{id}` - 删除模板
- `POST /api/templates/{id}/publish` - 发布模板
- `POST /api/templates/{id}/use` - 使用模板

## 模板最佳实践

### 创建模板时

1. **清理无关节点**：移除调试、测试节点
2. **重置敏感数据**：清空 API Key、个人信息
3. **添加说明节点**：使用 `textAnnotationNode` 添加使用说明
4. **合理命名**：节点使用描述性名称（而非"节点 1"、"节点 2"）
5. **测试可用性**：保存后重新加载，确保正常工作

### 使用模板时

1. **先预览再使用**：了解模板结构和用途
2. **逐步定制**：基于模板调整，而非全部重写
3. **保存为新模板**：定制后的版本可以另存为新模板

---

相关文档：
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - 模板 API 参考
- `../architecture/codebase-guide.md` - 模板代码位置
```

写入文件: `docs/product/templates.md`

- [ ] **Step 2: 验证文件创建**

Run: `wc -l docs/product/templates.md`
Expected: 显示约 200-250 行

---

## Task 11: 创建 endpoints.md

**Files:**
- Create: `docs/api/endpoints.md`

- [ ] **Step 1: 创建 API 端点参考文档**

此文档内容较长（约 300 行），包含 23+ 个端点的完整说明。从 CLAUDE.md 第 1.1 节提取所有 API 端点，按功能分组详细说明。

写入文件: `docs/api/endpoints.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "POST\|GET\|PUT\|DELETE\|PATCH" docs/api/endpoints.md | wc -l`
Expected: 显示约 25-30 个 HTTP 方法

---

## Task 12: 创建 authentication.md

**Files:**
- Create: `docs/api/authentication.md`

- [ ] **Step 1: 创建认证授权文档**

从 CLAUDE.md 提取认证相关内容，包括 Supabase Auth、BYOK、API Key 加密存储。

写入文件: `docs/api/authentication.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "AES-256-GCM" docs/api/authentication.md`
Expected: 显示加密算法说明

---

## Task 13: 创建 error-handling.md

**Files:**
- Create: `docs/api/error-handling.md`

- [ ] **Step 1: 创建错误处理文档**

从 CLAUDE.md 第 14 节提取 Known Pitfalls，按"症状-根因-修复-预防"格式组织。

写入文件: `docs/api/error-handling.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "症状\|根因\|修复\|预防" docs/api/error-handling.md | wc -l`
Expected: 显示约 8-12 个标记

---

## Task 14: 创建 code-quality.md

**Files:**
- Create: `docs/standards/code-quality.md`

- [ ] **Step 1: 创建代码质量标准文档**

从 CLAUDE.md 第 5.2/5.3/5.4/5.5 节提取代码质量规范。

写入文件: `docs/standards/code-quality.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "## " docs/standards/code-quality.md | wc -l`
Expected: 显示约 5-7 个二级标题

---

## Task 15: 创建 ui-guidelines.md

**Files:**
- Create: `docs/standards/ui-guidelines.md`

- [ ] **Step 1: 创建 UI 规范文档**

从 CLAUDE.md 第 6 节提取 UI/交互规范，包括组件复用、样式 token、节点控制条、明暗主题等。

写入文件: `docs/standards/ui-guidelines.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "rgba" docs/standards/ui-guidelines.md | wc -l`
Expected: 显示多个颜色值说明

---

## Task 16: 创建 testing.md

**Files:**
- Create: `docs/standards/testing.md`

- [ ] **Step 1: 创建测试规范文档**

从 CLAUDE.md 第 13 节提取测试规范，包括测试框架、TDD 工作流、测试分类、命名约定。

写入文件: `docs/standards/testing.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "Vitest\|Playwright" docs/standards/testing.md | wc -l`
Expected: 显示多处测试框架提及

---

## Task 17: 创建 i18n.md

**Files:**
- Create: `docs/standards/i18n.md`

- [ ] **Step 1: 创建国际化规范文档**

从 CLAUDE.md 第 12 节提取 i18n 规范，包括 Key 命名、新增流程、节点标题 i18n、动态值处理、验证标准。

写入文件: `docs/standards/i18n.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "zh.json\|en.json" docs/standards/i18n.md | wc -l`
Expected: 显示语言文件路径

---

## Task 18: 创建 persistence.md

**Files:**
- Create: `docs/standards/persistence.md`

- [ ] **Step 1: 创建持久化规范文档**

从 CLAUDE.md 第 10 节提取持久化规范，包括双写策略、冲突检测、视口持久化、图片去重、资产管理。

写入文件: `docs/standards/persistence.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "IndexedDB\|Supabase" docs/standards/persistence.md | wc -l`
Expected: 显示多处数据库提及

---

## Task 19: 创建 known-pitfalls.md

**Files:**
- Create: `docs/standards/known-pitfalls.md`

- [ ] **Step 1: 创建已知陷阱文档**

从 CLAUDE.md 第 14 节提取 Known Pitfalls，按"症状-根因-修复-预防"格式组织。

写入文件: `docs/standards/known-pitfalls.md`

- [ ] **Step 2: 验证文件创建**

Run: `wc -l docs/standards/known-pitfalls.md`
Expected: 显示约 80-120 行

---

## Task 20: 创建 layering.md

**Files:**
- Create: `docs/architecture/layering.md`

- [ ] **Step 1: 创建分层架构文档**

从 CLAUDE.md 第 5.1 节提取分层架构说明，详细阐述 Ports & Adapters 模式。

写入文件: `docs/architecture/layering.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "Ports\|Adapters" docs/architecture/layering.md | wc -l`
Expected: 显示架构模式提及

---

## Task 21: 创建 data-flow.md

**Files:**
- Create: `docs/architecture/data-flow.md`

- [ ] **Step 1: 创建数据流模式文档**

从 CLAUDE.md 第 4.3 + 5.4 节提取数据流说明，包括 UI → Store → 应用服务 → API Routes → Supabase/Provider 流程。

写入文件: `docs/architecture/data-flow.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "→" docs/architecture/data-flow.md | wc -l`
Expected: 显示数据流箭头

---

## Task 22: 创建 performance.md

**Files:**
- Create: `docs/architecture/performance.md`

- [ ] **Step 1: 创建性能优化文档**

从 CLAUDE.md 第 8 节提取性能实践，包括拖拽优化、图片处理、持久化防抖、viewport 优化。

写入文件: `docs/architecture/performance.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "防抖\|debounce" docs/architecture/performance.md | wc -l`
Expected: 显示防抖机制说明

---

## Task 23: 创建 add-node.md

**Files:**
- Create: `docs/extensions/add-node.md`

- [ ] **Step 1: 创建新增节点指南**

从 CLAUDE.md 第 9.5 节提取新增节点流程，7 步详细说明。

写入文件: `docs/extensions/add-node.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "canvasNodes.ts\|nodeRegistry.ts" docs/extensions/add-node.md | wc -l`
Expected: 显示核心文件路径

---

## Task 24: 创建 add-model.md

**Files:**
- Create: `docs/extensions/add-model.md`

- [ ] **Step 1: 创建新增模型指南**

从 CLAUDE.md 第 9.1/9.2 节提取新增模型流程，区分图片模型和视频模型。

写入文件: `docs/extensions/add-model.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "ImageModelDefinition\|VideoModelDefinition" docs/extensions/add-model.md | wc -l`
Expected: 显示模型类型定义

---

## Task 25: 创建 add-provider.md

**Files:**
- Create: `docs/extensions/add-provider.md`

- [ ] **Step 1: 创建新增 Provider 指南**

从 CLAUDE.md 第 9.3 节提取新增 Provider 流程，包括服务端接口实现、前端定义、任务模式、已接入 Provider 示例。

写入文件: `docs/extensions/add-provider.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "AIProvider\|VideoProvider" docs/extensions/add-provider.md | wc -l`
Expected: 显示 Provider 接口

---

## Task 26: 创建 add-tool.md

**Files:**
- Create: `docs/extensions/add-tool.md`

- [ ] **Step 1: 创建新增工具指南**

从 CLAUDE.md 第 9.4 节提取新增工具流程，4 步说明。

写入文件: `docs/extensions/add-tool.md`

- [ ] **Step 2: 验证文件创建**

Run: `grep "builtInTools.ts\|toolProcessor.ts" docs/extensions/add-tool.md | wc -l`
Expected: 显示核心文件路径

---

## Task 27: 重写 AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 备份现有 AGENTS.md**

```bash
cp AGENTS.md AGENTS.md.backup
```

- [ ] **Step 2: 重写 AGENTS.md**

内容见设计文档"示例 1: AGENTS.md（完整版本）"，完整替换文件内容。

写入文件: `AGENTS.md`

- [ ] **Step 3: 验证新文件**

Run: `wc -l AGENTS.md`
Expected: 显示约 70-90 行（精简版）

Run: `grep "## 完整文档索引" AGENTS.md`
Expected: 显示索引区块标题

---

## Task 28: 重写 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 备份现有 CLAUDE.md**

```bash
cp CLAUDE.md CLAUDE.md.backup
```

- [ ] **Step 2: 重写 CLAUDE.md**

内容见设计文档"示例 2: CLAUDE.md（完整版本）"，完整替换文件内容。

写入文件: `CLAUDE.md`

- [ ] **Step 3: 验证新文件**

Run: `wc -l CLAUDE.md`
Expected: 显示约 60-80 行（精简版）

Run: `grep "@AGENTS.md" CLAUDE.md`
Expected: 显示引用标记

---

## Task 29: 验证并提交

**Files:**
- All created/modified files

- [ ] **Step 1: 验证目录结构**

```bash
find docs -type f -name "*.md" | sort
```

Expected: 显示 5 个子目录的 24 个 .md 文件 + superpowers/ 下的文件

- [ ] **Step 2: 验证文档数量**

```bash
ls docs/architecture/*.md | wc -l
ls docs/product/*.md | wc -l
ls docs/api/*.md | wc -l
ls docs/standards/*.md | wc -l
ls docs/extensions/*.md | wc -l
```

Expected: 5, 5, 3, 7, 4

- [ ] **Step 3: 验证入口文档**

```bash
head -20 AGENTS.md
head -20 CLAUDE.md
```

Expected: 显示精简版内容，包含文档索引

- [ ] **Step 4: 检查交叉引用**

```bash
grep -r "\.\./\|相关文档" docs/{architecture,product,api,standards,extensions}/ | head -20
```

Expected: 显示交叉引用链接

- [ ] **Step 5: Git 状态检查**

```bash
git status
```

Expected: 显示删除 10 个旧文件、新增 24 个文件、修改 2 个文件

- [ ] **Step 6: Git 添加所有变更**

```bash
git add docs/ AGENTS.md CLAUDE.md
```

- [ ] **Step 7: Git 提交**

```bash
git commit -m "docs: 重构文档结构，拆分为分类子目录

- 清理 docs/ 下所有 planning 文件（10 个）
- 将 CLAUDE.md 和 AGENTS.md 精简为入口文档
- 拆分详细内容到 docs/{architecture,product,api,standards,extensions}
- AGENTS.md 作为主索引，提供完整文档导航
- 所有文档使用中文编写

新增 24 个详细文档：
- architecture/: 5 个文件（技术栈、分层、导航、数据流、性能）
- product/: 5 个文件（功能、节点、模型、工具、模板）
- api/: 3 个文件（端点、认证、错误处理）
- standards/: 7 个文件（工作流、代码质量、UI、测试、i18n、持久化、陷阱）
- extensions/: 4 个文件（新增节点、模型、Provider、工具）"
```

- [ ] **Step 8: 验证提交**

```bash
git log -1 --stat
```

Expected: 显示提交信息和变更统计

- [ ] **Step 9: 删除备份文件**

```bash
rm -f AGENTS.md.backup CLAUDE.md.backup
```

---

## 完成标准

- [x] 所有 24 个新文档已创建
- [x] AGENTS.md 和 CLAUDE.md 已精简并包含完整索引
- [x] docs/ 下旧 planning 文件已删除
- [x] 单次提交已完成
- [x] 备份文件已清理

---

## 注意事项

1. **文档内容完整性**: 所有步骤中标记为"从 CLAUDE.md 提取"的内容，需要完整复制相关章节，确保不遗漏技术细节
2. **中文表达**: 所有文档必须使用中文，保持术语翻译一致
3. **交叉引用**: 每个文档末尾添加"相关文档"区块，使用相对路径链接
4. **代码示例**: 保留所有代码示例，确保语法高亮标记正确
5. **验证步骤**: 每个任务的验证步骤必须执行，确保文件正确创建