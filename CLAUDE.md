# CLAUDE.md

## 1. 项目目标与技术栈

- 产品目标：基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）、视频生成的 Web SaaS 产品。
- 前端：Next.js 15 (App Router) + React 19 + TypeScript + Zustand 5 + @xyflow/react 12 + TailwindCSS 4。
- 后端：Supabase (Auth + Postgres + Storage + Realtime) + Next.js API Routes + sharp（图片处理）。
- 支付：PayPal + Alipay + WeChat Pay（全球 + 中国市场）。
- 认证：Supabase Auth（Email + Google + WeChat OAuth）。
- 测试：Vitest（单元/API）+ Playwright（E2E），TDD 流程。
- 关键原则：解耦、可扩展、可回归验证、自动持久化、交互性能优先。
- 多媒体支持：图片生成/编辑（同步/异步）、视频生成（异步轮询 + Realtime 推送）。

> **项目定位**：基于现有桌面版（本仓库 `Storyboard-Copilot`）升级扩展为 Web SaaS 产品。Web 版在独立仓库 `storyboard-copilot-web` 中开发，**尽可能沿用桌面版现有代码**（画布域逻辑、模型定义、工具体系、UI 组件等），重构基础设施层以适配 Web 架构。桌面版仓库保留，不做破坏性修改。

## 2. 依赖安装权限

- 允许使用 `npm install` 安装开发过程中需要的任何工具、库和依赖。
- 安装新依赖后应更新 `package.json`，确保 `package-lock.json` 同步。
- 优先选择社区主流、维护活跃的包；避免引入过大或过冷门的依赖。

## 3. 代码库浏览顺序

建议按以下顺序理解项目（Web 版结构）：

1. 入口与全局状态
- `app/(app)/layout.tsx`
- `src/stores/authStore.ts`
- `src/stores/projectStore.ts`
- `src/stores/canvasStore.ts`

2. 画布主流程
- `app/(app)/canvas/[id]/page.tsx`
- `src/features/canvas/Canvas.tsx`
- `src/features/canvas/domain/canvasNodes.ts`
- `src/features/canvas/domain/nodeRegistry.ts`
- `src/features/canvas/NodeSelectionMenu.tsx`

3. 节点与覆盖层
- `src/features/canvas/nodes/*.tsx`
- `src/features/canvas/nodes/ImageEditNode.tsx`
- `src/features/canvas/nodes/GroupNode.tsx`
- `src/features/canvas/ui/SelectedNodeOverlay.tsx`
- `src/features/canvas/ui/NodeActionToolbar.tsx`
- `src/features/canvas/ui/NodeToolDialog.tsx`
- `src/features/canvas/ui/nodeControlStyles.ts`
- `src/features/canvas/ui/nodeToolbarConfig.ts`

4. 工具体系（重点）
- `src/features/canvas/tools/types.ts`
- `src/features/canvas/tools/builtInTools.ts`
- `src/features/canvas/ui/tool-editors/*`
- `src/features/canvas/application/toolProcessor.ts`

5. 模型与供应商适配
- `src/features/canvas/models/types.ts`
- `src/features/canvas/models/registry.ts`（图片模型）
- `src/features/canvas/models/videoRegistry.ts`（视频模型）
- `src/features/canvas/models/image/*`
- `src/features/canvas/models/video/*`
- `src/features/canvas/models/providers/*`

6. 迁移接缝（Ports & Adapters）
- `src/features/canvas/application/ports.ts`（核心接口定义）
- `src/features/canvas/application/canvasServices.ts`（适配器接线）
- `src/features/canvas/infrastructure/webAiGateway.ts`
- `src/features/canvas/infrastructure/webVideoGateway.ts`
- `src/features/canvas/infrastructure/webImageSplitGateway.ts`
- `src/features/canvas/infrastructure/webImagePersistence.ts`

7. 服务端（API Routes + Server Logic）
- `app/api/projects/`（项目 CRUD）
- `app/api/projects/[id]/draft/`（草稿读写）
- `app/api/assets/`（资产上传/管理）
- `app/api/ai/`（AI 图片/视频生成）
- `app/api/image/`（图片处理：split/crop/merge）
- `app/api/jobs/[id]/`（任务状态轮询）
- `app/api/billing/`（支付）
- `app/api/settings/`（API Key 管理）
- `src/server/ai/`（AI Provider 实现）
- `src/server/video/`（视频 Provider 实现）
- `src/server/image/`（sharp 图片处理）
- `src/server/jobs/`（任务编排）
- `src/server/billing/`（支付集成）

8. 数据库
- `supabase/migrations/`（SQL 迁移文件）
- `src/lib/supabase/client.ts`（浏览器端 Supabase 客户端）
- `src/lib/supabase/server.ts`（服务端 Supabase 客户端）

## 4. 开发工作流

1. 明确变更范围
- 先界定是 UI 变更、节点行为变更、工具逻辑变更、模型适配变更、API 路由变更，还是持久化/性能变更。

2. TDD 流程
- 先写失败的测试，描述期望行为。
- 实现最少代码使测试通过。
- 重构，保持测试绿色。
- 提交前运行完整测试套件。

3. 沿着数据流改动
- UI 输入 -> Store -> 应用服务 -> API Routes -> Supabase/Provider。
- 禁止跨层"偷改"状态；尽量只在对应层处理对应职责。

4. 小步提交与即时验证
- 每次改动后做轻量检查（见第 7 节），通过后再继续。

5. 本地浏览器验证优先
- 功能开发阶段以本地 `npm run dev` + 浏览器验证为主。
- 确保功能在本地完全可用后再考虑部署。

6. 最后做一次完整构建
- 在功能收尾或大改合并前运行完整构建。

7. 发布快捷口令
- 当用户明确说"推送更新"时，默认执行一次补丁版本发布：基于上一个 release/tag 自动递增 patch 版本号，汇总代码变动生成 Markdown 更新日志，完成版本同步、发布提交、annotated tag 与远端推送；如用户额外指定 minor/major 或自定义说明，则按用户要求覆盖默认行为。
- 自动生成的更新日志正文只保留 `## 新增`、`## 优化`、`## 修复` 等二级标题分组与对应列表项；不要额外输出 `# vx.y.z` 标题、`基于某个 tag 之后的若干提交整理` 说明或 `## 完整提交` 区块，空分组可省略。

## 5. 架构与解耦标准

### 5.1 依赖与边界

- 模块间优先依赖接口/类型，不直接依赖具体实现细节。
- 跨模块通信优先使用事件总线或明确的 service/port。
- 展示层（UI）不直接耦合基础设施层（API 调用）；通过应用层中转。
- 迁移接缝：`ports.ts` 定义核心接口（`AiGateway`、`VideoAiGateway`、`ImageSplitGateway`），`canvasServices.ts` 接线 Web 适配器。

### 5.2 单一职责

- 一个文件只做一个业务概念；无法用三句话说清职责就应拆分。
- 工具 UI、工具数据结构、工具执行逻辑应分离（已采用：editor / annotation codec / processor）。

### 5.3 文件规模控制

- 舒适区：类 <= 400 行，脚本 <= 300 行。
- 警戒线：800 行，必须评估拆分。
- 强制拆分：1000 行（纯数据定义除外）。

### 5.4 层间通信

- 使用 DTO/纯数据对象，避免双向引用。
- Store 不应直接承担重业务逻辑；业务逻辑放应用层。

### 5.5 文档边界

- 本文档定位为"技术开发规范文档"，优先记录稳定的架构约束、分层规则、扩展流程、验证标准。
- 不记录易变的具体 UI 操作步骤、临时交互文案或产品走查细节（这些应放在需求文档/设计稿/任务说明中）。
- 当实现变化仅影响交互细节而不影响技术约束时，可不更新本文档。

### 5.6 节点注册单一真相源

- 节点类型、默认数据、菜单展示、连线能力统一在 `domain/nodeRegistry.ts` 声明，不在 `Canvas.tsx` / `canvasStore.ts` 重复硬编码。
- `connectivity` 为连线能力配置源：
  - `sourceHandle` / `targetHandle`：是否具备输入输出端口。
  - `connectMenu.fromSource` / `connectMenu.fromTarget`：从输出端或输入端拉线时，是否允许出现在"创建节点菜单"。
- 菜单候选节点必须由注册表函数统一推导（如 `getConnectMenuNodeTypes`），禁止在 UI 层手写类型白名单。
- 内部衍生节点（如切割结果 `storyboardSplit`、导出节点）默认 `connectMenu` 关闭，只能由应用流程自动创建。

## 6. UI/交互规范

- 复用统一 UI 组件：`src/components/ui/primitives.tsx`。
- 风格统一使用设计变量和 token（`index.css`），避免散落硬编码样式。
- 输入框、工具条、弹窗保持与节点对齐，交互动画保持一致。
- 节点底部控制条（模型/比例/生成/导出等）尺寸样式统一从 `src/features/canvas/ui/nodeControlStyles.ts` 引用，禁止在各节点散落硬编码一套新尺寸。
- 节点工具条（NodeToolbar）位置、对齐、偏移统一从 `src/features/canvas/ui/nodeToolbarConfig.ts` 引用；禁止通过 `left/translate` 等绝对定位覆盖跟随逻辑。
- 选中覆盖层 `SelectedNodeOverlay` 只承载轻量通用覆盖能力（如工具条），节点核心业务输入区应内聚到节点组件本体（例如 `ImageEditNode`）。
- 对话框支持"打开/关闭"过渡，避免突兀闪烁。
- 明暗主题要可读，避免高饱和蓝色抢占焦点（导航图已优化为灰黑系）。
- 节点外边框颜色必须同时适配明暗主题：明亮模式使用 `rgba(15,23,42,0.45)`，暗黑模式使用 `dark:border-[rgba(255,255,255,0.22)]`。节点内部边框同理：明亮模式 `rgba(15,23,42,0.15)`，暗黑模式 `dark:border-[rgba(255,255,255,0.1)]`。禁止仅写 `rgba(255,255,255,...)` 不带 `dark:` 前缀。
- 多选节点时画布上方显示 `MultiSelectToolbar`（`src/features/canvas/ui/MultiSelectToolbar.tsx`），提供"编组"等批量操作。
- 画布支持右键拖拽框选节点（Canvas.tsx 中的 `handleRightMouseDown/Move/Up`），浏览器默认右键菜单已禁用。
- 快捷键应避开输入态（`input/textarea/contentEditable`）避免误触。

## 7. 命令与验证

### 7.1 常用开发命令

```bash
# 启动开发服务器（本地浏览器验证）
npm run dev

# 运行单元测试
npx vitest run

# 运行单元测试（watch 模式）
npx vitest

# 运行 E2E 测试
npx playwright test

# 运行特定测试文件
npx vitest run __tests__/unit/xxx.test.ts
npx playwright test __tests__/e2e/xxx.spec.ts

# Supabase 本地开发
npx supabase start
npx supabase db reset        # 重置并重跑迁移
npx supabase migration new <name>  # 创建新迁移
```

### 7.2 快速检查（优先执行）

```bash
# TS 类型检查
npx tsc --noEmit

# 单元测试
npx vitest run

# lint 检查
npm run lint
```

### 7.3 收尾检查

```bash
# 前端完整构建
npm run build

# 全量 E2E 测试
npx playwright test

# 触发一次正式发布
npm run release -- patch --notes-file docs/releases/vx.y.z.md
```

说明：
- 日常迭代以 `tsc --noEmit` + `vitest run` + 浏览器手测为主。
- 影响打包、依赖、入口、API 路由时，执行完整构建。
- E2E 测试在合并前运行。
- 发布说明优先落到 `docs/releases/vx.y.z.md`，再通过 `npm run release` 或"推送更新"口令触发发布。
- `docs/releases/vx.y.z.md` 的默认格式同样只保留二级标题分组和列表正文，不写额外总标题、范围说明和完整提交清单。

## 8. 性能实践

- 禁止在拖拽每一帧执行重持久化或重计算。
- 节点拖拽中不要写盘；拖拽结束再保存。
- 大图片场景避免重复 `dataURL` 转换；节点渲染优先使用 `previewImageUrl`，模型/工具处理使用原图 `imageUrl`。
- 项目整量持久化（nodes/edges/history）使用防抖 + `requestIdleCallback` 队列，避免与交互争用主线程。
- viewport 持久化走独立轻量队列与独立 API（`PATCH /api/projects/[id]/draft/viewport`），不回退到整项目 PUT。
- 视口更新要做归一化与阈值比较（epsilon），过滤微小抖动写入。
- 优先使用 `useMemo/useCallback` 控制重渲染；避免把大对象直接塞进依赖导致抖动。
- 画布交互优先"流畅"而非"实时全量持久化"，可使用短延迟合并保存。
- Canvas 组件必须标记 `'use client'`，保持 @xyflow/react 纯客户端渲染。

## 9. 模型与工具扩展规范

### 9.1 新图片模型接入

- 一模型一文件，放到 `src/features/canvas/models/image/<provider>/`。
- 在模型定义中声明：
  - `displayName`
  - `providerId`
  - 支持分辨率/比例
  - 默认参数
  - 请求映射函数 `resolveRequest`

### 9.2 新视频模型接入

- 一模型一文件，放到 `src/features/canvas/models/video/<provider>/`。
- 文件必须导出 `videoModel: VideoModelDefinition`（供自动发现机制识别）。
- 在模型定义中声明：
  - `id`：格式为 `{provider}/{model}`（如 `kling/kling-3.0`）
  - `mediaType: 'video'`
  - `displayName`、`providerId`、`description`
  - `eta`、`expectedDurationMs`（用于前端进度条估算）
  - `durations`：支持的时长选项（如 3s、5s、10s、15s）
  - `aspectRatios`：支持的宽高比选项（如 16:9、9:16、1:1）
  - `supportsAudio`、`supportsSeed`、`supportsImageToVideo`：功能开关
  - `extraParamsSchema`：额外参数定义（如 multi_shots、kling_elements）
  - `defaultExtraParams`：默认值

### 9.3 新 Provider 接入（服务端 TypeScript）

1. 创建 `src/server/ai/providers/{provider}.ts`（图片）或 `src/server/video/providers/{provider}.ts`（视频）。
2. 实现对应接口（`AIProvider` 或 `VideoProvider`）。
3. 在 `registry.ts` 中注册。
4. 为异步 Provider 实现任务模式：
   - `submitJob()` 提交任务，返回 `jobId`
   - `pollJob()` 轮询状态
   - 完成时注册输出资产

**前端模型定义**：
1. 创建 `src/features/canvas/models/providers/{provider}.ts`，导出 `ModelProviderDefinition`。
2. 创建对应模型文件，导出模型定义。

**已接入 Provider（基于 KIE API）：**

所有三个 Provider 共享 KIE API 基础设施（`src/server/video/providers/kie-common.ts`）：
- 统一 API Key 管理
- 共享图片上传逻辑（支持 http://、data:、base64）
- 共享状态轮询逻辑

**Kling 3.0**: 模型 `kling/kling-3.0`，时长 3s/5s/10s/15s，宽高比 16:9/9:16/1:1
**Sora2**: 模型 `sora2/sora-2-image-to-video`，时长 10s/15s，duration→n_frames 映射
**Veo 3.1**: 模型 `veo/veo3`/`veo/veo3_fast`，seed 10000-99999 自动 clamp

### 9.4 新工具接入

1. 在 `tools/types.ts` 声明能力（如 editor kind）。
2. 在 `tools/builtInTools.ts` 注册插件。
3. 在 `ui/tool-editors/` 新增对应编辑器。
4. 在 `application/toolProcessor.ts` 接入执行逻辑。
5. 保证产物仍走"处理后生成新节点"链路，不覆盖原节点。

### 9.5 新节点接入

1. 在 `domain/canvasNodes.ts` 增加类型与数据结构（必要时增加类型守卫）。
2. 在 `domain/nodeRegistry.ts` 注册定义：`createDefaultData`、`capabilities`、`connectivity`。
3. 在 `nodes/index.ts` 注册渲染组件。
4. 明确手动创建策略：
   - 可手动创建：配置 `connectMenu.fromSource/fromTarget`。
   - 仅流程创建：关闭 `connectMenu`，由工具/应用服务触发。
5. 如新增分组/父子节点行为，必须同步验证删除、解组、连线清理与历史快照。
6. 节点内控制条优先复用 `nodeControlStyles.ts` 里的统一尺寸 token。
7. 节点工具条必须复用 `nodeToolbarConfig.ts`。

## 10. 持久化规范

- 项目数据通过 `projectStore` 自动持久化到 Supabase Postgres，不要求手动保存。
- 持久化后端：Supabase Postgres（`project_drafts` 表），本地缓存 IndexedDB（`idb-keyval`）。
- 双写策略：每次保存同时写入 IndexedDB（即时）+ Supabase（防抖 1s）。
- 加载策略：比较 IndexedDB 与 Supabase 的时间戳，本地更新则提示恢复。
- 保存状态枚举：`saving | saved | unsynced | offline | conflict`。
- 冲突检测：基于 `revision` 列，客户端保存时携带 `expectedRevision`，服务端不匹配返回 409。
- 重复标签检测：使用 `BroadcastChannel` API。
- 前端持久化采用双通道：
  - 整项目快照：`PUT /api/projects/[id]/draft`（防抖 + idle 调度）。
  - 视口快照：`PATCH /api/projects/[id]/draft/viewport`（轻量更新、独立防抖）。
- 图片字段通过 `imagePool + __img_ref__` 做去重编码；新增图片字段（如 `previewImageUrl`）需同步编码/解码映射。
- 资产管理：所有上传/生成的媒体文件通过 `project_assets` 表跟踪，存储在 Supabase Storage。

## 11. 提交前检查清单

- 功能路径可用（至少手测 1 条主路径 + 1 条异常路径）。
- 无明显性能回退（拖拽、缩放、输入响应）。
- 轻量检查通过：`npx tsc --noEmit` + `npx vitest run`。
- 大改或发布前：`npm run build` + `npx playwright test`。
- 如为正式发布，确认 `docs/releases/vx.y.z.md` 已更新，并与本次 tag/版本号一致。
- 新增约束/行为变化需同步更新文档。

## 12. i18n 规范

- i18n 入口：`src/i18n/index.ts`
- 语言文件：`src/i18n/locales/zh.json`、`src/i18n/locales/en.json`
- 组件中统一使用 `useTranslation()` + `t('key.path')`，避免硬编码中英文文案。

### 12.1 Key 命名

- 使用模块化层级命名：`project.title`、`node.menu.uploadImage`、`common.save`。
- 避免把中文句子直接作为 key；key 必须稳定、可复用、可检索。
- 通用文案优先放 `common.*`，页面专属文案放对应模块前缀。

### 12.2 新增文案流程

1. 先在 `zh.json` 增加新 key。
2. 同步在 `en.json` 增加相同 key（不要缺语言键）。
3. 代码里只引用 key，不写 fallback 字面量。

### 12.3 节点默认标题 i18n

- 节点默认显示名定义在 `src/features/canvas/domain/nodeDisplay.ts`。
- `resolveNodeDisplayName(type, data, t?)` 接受可选 `t` 函数；节点组件中必须传入 `t` 以实现运行时语言切换。
- i18n key 统一放在 `nodeDisplayName.*`（如 `nodeDisplayName.group`、`nodeDisplayName.videoGen`）。

### 12.4 动态值与复数

- 动态值用插值：`t('xxx', { count, name })`。
- 数量相关场景使用 i18next 复数规则，不手写字符串拼接。
- 数字/时间等先格式化，再传给 `t`。

### 12.5 最低验证

- 切换中英文后，不出现未翻译 key 泄露（例如直接显示 `project.title`）。
- 新增 key 在中英语言包均存在。
- 关键按钮、提示、错误文案在两种语言下都可读不截断。

## 13. 测试规范

### 13.1 测试框架

- 单元测试 / API 测试：Vitest
- E2E 测试：Playwright

### 13.2 TDD 工作流（每个任务）

1. 先写描述期望行为的失败测试。
2. 实现最少代码使测试通过。
3. 重构，保持测试绿色。
4. 提交前运行完整测试套件。

### 13.3 测试分类

| 类别 | 工具 | 位置 | 运行时机 |
|------|------|------|---------|
| 单元 | Vitest | `__tests__/unit/` 或同位 `*.test.ts` | 每次提交 |
| API | Vitest | `__tests__/api/` | 每次提交 |
| E2E | Playwright | `__tests__/e2e/` | 合并前 |

### 13.4 测试命名

- 单元测试：`describe('模块名') > it('应该做什么')`
- E2E 测试：`test.describe('用户流程') > test('步骤描述')`

---

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
