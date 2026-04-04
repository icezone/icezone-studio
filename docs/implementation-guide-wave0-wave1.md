# Implementation Guide — Wave 0 + Wave 1

> 基于 `feature-design-wave0-wave1.md` 设计文档的详细实施指南。
> 采用 Agent Team 并行开发 + TDD 流程。

---

## 目录

- [Agent Team 分工](#agent-team-分工)
- [TDD 开发流程](#tdd-开发流程)
- [Wave 0 实施](#wave-0-实施)
  - [N1: 视频智能分析节点](#n1-视频智能分析节点)
  - [N2: 反向提示词生成](#n2-反向提示词生成)
  - [N3: 导演级镜头分析](#n3-导演级镜头分析)
- [Wave 1 实施](#wave-1-实施)
  - [N4: 小说/剧本输入节点](#n4-小说剧本输入节点)
  - [N5: 工作流模板系统](#n5-工作流模板系统)
  - [N6: 用户模板分享](#n6-用户模板分享)
  - [N7: 智能分镜批量生成增强](#n7-智能分镜批量生成增强)
  - [N8: 多 API Key 轮转](#n8-多-api-key-轮转)
- [并行策略与解锁条件](#并行策略与解锁条件)
- [CI/CD 检查清单](#cicd-检查清单)

---

## Agent Team 分工

### 角色定义

| Agent 名称 | 角色 | 负责需求 | worktree | 核心能力 |
|------------|------|---------|----------|---------|
| **llm-dev** | LLM 基础设施 + 分析服务 | N2, N3, N4 (后端) | `ws-llm-analysis` | Gemini/OpenAI 接入、Prompt 工程、分析服务 |
| **video-analysis-dev** | 视频分析后端 | N1 (后端) | `ws-video-analysis` | ffmpeg 集成、场景检测算法、帧提取 |
| **canvas-dev** | 画布前端节点 | N1, N2, N3, N4 (前端) | `ws-canvas-nodes-v2` | 新节点组件、UI、前端 Gateway |
| **template-dev** | 模板系统全栈 | N5, N6 | `ws-templates` | DB Schema、API、模板库 UI |
| **storyboard-dev** | 分镜增强 | N7 | `ws-storyboard-enhance` | StoryboardGenNode 增强 |
| **infra-dev** | API Key 轮转 | N8 | `ws-key-rotation` | Key 管理、轮转算法、设置 UI |
| **reviewer** | 代码审查 | 全部 | 主仓库 | 安全/质量/性能审查 |

### Team Lead 职责

- 任务分发与优先级排序
- 跨 Agent 依赖协调
- 阶段性集成验证
- 冲突解决与代码合并

---

## TDD 开发流程

每个需求的每个子任务必须严格遵循 TDD 三步走：

### 标准流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. RED      │ ──→ │  2. GREEN   │ ──→ │  3. REFACTOR│
│  写失败测试  │     │  最少代码通过│     │  重构优化   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       └───────────── 循环 ◄──────────────────┘
```

### 测试分层要求

| 层级 | 框架 | 位置 | 每个需求最少 |
|------|------|------|-------------|
| 单元测试 | Vitest | `__tests__/unit/` | 5 个 test cases |
| API 测试 | Vitest | `__tests__/api/` | 3 个 test cases |
| E2E 测试 | Playwright | `__tests__/e2e/` | 1 个 user flow |

### TDD 执行模板

每个 Agent 开始子任务时，按以下模板执行：

```bash
# Step 1: RED — 写失败测试
# 创建/编辑测试文件
# 运行测试确认失败
npx vitest run __tests__/unit/xxx.test.ts

# Step 2: GREEN — 实现最少代码
# 编写实现代码
# 运行测试确认通过
npx vitest run __tests__/unit/xxx.test.ts

# Step 3: REFACTOR — 重构
# 优化代码，保持测试绿色
npx vitest run

# Step 4: 类型检查
npx tsc --noEmit

# Step 5: 提交
git add <specific-files> && git commit -m "feat(scope): description"
```

---

## Wave 0 实施

### 并行启动图

```
┌──────────────────────────────────────────────────────┐
│ Wave 0                                               │
│                                                      │
│  video-analysis-dev ──── N1 后端 (场景检测/帧提取)   │
│         │                                            │
│  llm-dev ────────────── N2+N3 后端 (LLM 基础设施)   │
│         │                    │                       │
│         └────────────────────┘                       │
│                  │                                   │
│  canvas-dev ──── N1+N2+N3 前端 (等后端 API 就绪)    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### N1: 视频智能分析节点

#### 任务分解

##### N1.1 — 后端：场景检测服务 (video-analysis-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/video/sceneDetector.test.ts
describe('SceneDetector', () => {
  it('应该对空视频 URL 返回错误', async () => {})
  it('应该检测单场景视频返回 1 个场景', async () => {})
  it('应该根据灵敏度阈值调整检测结果数量', async () => {})
  it('应该遵守 maxKeyframes 限制', async () => {})
  it('应该返回正确的时间戳范围', async () => {})
  it('应该遵守 minSceneDurationMs 过滤短场景', async () => {})
})

// __tests__/unit/video/frameExtractor.test.ts
describe('FrameExtractor', () => {
  it('应该从指定时间点提取帧图片', async () => {})
  it('应该将提取的帧上传到 Storage 并返回 URL', async () => {})
  it('应该生成缩略图 previewUrl', async () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/video/analysis/types.ts` | 定义 SceneDetectOptions, SceneDetectResult 类型 |
| 2 | `src/server/video/analysis/sceneDetector.ts` | ffmpeg scene filter 封装 |
| 3 | `src/server/video/analysis/frameExtractor.ts` | ffmpeg 帧提取 + sharp 缩略图 |
| 4 | `package.json` | 添加 `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` |

**关键实现：**

```typescript
// sceneDetector.ts 核心逻辑
import ffmpeg from 'fluent-ffmpeg'

export async function detectScenes(
  videoPath: string,
  options: SceneDetectOptions
): Promise<SceneDetectResult[]> {
  // 1. ffprobe 获取视频元数据（时长、fps）
  // 2. ffmpeg -vf "select='gt(scene,{threshold})',showinfo" 检测场景
  // 3. 解析 showinfo 输出，提取时间戳
  // 4. 过滤 minSceneDuration，限制 maxKeyframes
  // 5. 为每个场景切换点提取关键帧
}
```

##### N1.2 — 后端：API Route (video-analysis-dev)

**TDD Tests First:**

```typescript
// __tests__/api/video-analyze.test.ts
describe('POST /api/video/analyze', () => {
  it('应该对无认证请求返回 401', async () => {})
  it('应该对缺少 videoUrl 返回 400', async () => {})
  it('应该创建 Job 并返回 jobId', async () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/app/api/video/analyze/route.ts` | POST handler：认证→校验→创建 Job→异步分析 |
| 2 | 修改 `src/app/api/jobs/[id]/route.ts` | 扩展 Job 类型支持 video_analysis |

##### N1.3 — 前端：节点类型与注册 (canvas-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/videoAnalysisNode.test.ts
describe('VideoAnalysisNode Registration', () => {
  it('应该在 nodeRegistry 中注册 videoAnalysisNode', () => {})
  it('应该在菜单中可见', () => {})
  it('应该有 source 和 target handle', () => {})
  it('createDefaultData 应该返回正确的默认值', () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/domain/canvasNodes.ts` | 新增 VideoAnalysisNodeData 类型 |
| 2 | `src/features/canvas/domain/nodeRegistry.ts` | 注册 videoAnalysisNodeDefinition |
| 3 | `src/features/canvas/nodes/VideoAnalysisNode.tsx` | 节点组件 |
| 4 | `src/features/canvas/nodes/index.ts` | 导出节点 |
| 5 | `src/i18n/locales/zh.json` + `en.json` | i18n 文案 |

##### N1.4 — 前端：Gateway 集成 (canvas-dev)

**依赖：N1.2 API 就绪**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/application/ports.ts` | 新增 VideoAnalysisGateway 接口 |
| 2 | `src/features/canvas/infrastructure/webVideoAnalysisGateway.ts` | 实现 |
| 3 | `src/features/canvas/application/canvasServices.ts` | 接线 |

##### N1.5 — E2E 测试 (canvas-dev)

```typescript
// __tests__/e2e/video-analysis.spec.ts
test.describe('视频分析节点', () => {
  test('用户可以添加视频分析节点并上传视频', async ({ page }) => {
    // 1. 登录 → 创建项目 → 进入画布
    // 2. 添加视频分析节点
    // 3. 上传测试视频
    // 4. 点击"开始分析"
    // 5. 等待分析完成
    // 6. 验证场景列表显示
  })
})
```

---

### N2: 反向提示词生成

#### 任务分解

##### N2.1 — 后端：LLM 基础设施 (llm-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/ai/analysis/geminiAnalysis.test.ts
describe('GeminiAnalysisProvider', () => {
  it('应该正确构造多模态请求', async () => {})
  it('应该处理 API 错误并返回友好信息', async () => {})
  it('应该在无 API Key 时抛出配置错误', async () => {})
})

// __tests__/unit/ai/analysis/reversePromptService.test.ts
describe('ReversePromptService', () => {
  it('应该对 generic 风格返回英文 prompt', async () => {})
  it('应该对 chinese 风格返回中文 prompt', async () => {})
  it('应该包含 tags 和 negativePrompt', async () => {})
  it('应该在 LLM 返回非 JSON 时优雅降级', async () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/ai/analysis/types.ts` | LLM 分析相关类型定义 |
| 2 | `src/server/ai/analysis/providers/geminiAnalysis.ts` | Gemini 3.1 Pro 多模态调用封装 |
| 3 | `src/server/ai/analysis/providers/openaiAnalysis.ts` | GPT-4V 备选实现 |
| 4 | `src/server/ai/analysis/prompts/reversePromptGeneric.ts` | 通用风格 System Prompt |
| 5 | `src/server/ai/analysis/prompts/reversePromptChinese.ts` | 中文风格 System Prompt |
| 6 | `src/server/ai/analysis/reversePromptService.ts` | 反向提示词业务逻辑 |
| 7 | `package.json` | 添加 `@google/generative-ai` |

##### N2.2 — 后端：API Route (llm-dev)

**TDD Tests First:**

```typescript
// __tests__/api/reverse-prompt.test.ts
describe('POST /api/ai/reverse-prompt', () => {
  it('应该对无认证请求返回 401', async () => {})
  it('应该对缺少 imageUrl 返回 400', async () => {})
  it('应该返回结构化的 prompt 结果', async () => {})
  it('应该支持 generic 和 chinese 两种风格', async () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/app/api/ai/reverse-prompt/route.ts` | POST handler |

##### N2.3 — 前端：UI + Gateway (canvas-dev)

**依赖：N2.2 API 就绪**

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/reversePromptDialog.test.ts
describe('ReversePromptDialog', () => {
  it('应该在图片节点工具栏中显示反向提示词按钮', () => {})
  it('应该在无图片时隐藏按钮', () => {})
  it('应该在弹窗中显示生成结果', () => {})
  it('应该支持复制到剪贴板', () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/application/ports.ts` | 新增 LlmAnalysisGateway |
| 2 | `src/features/canvas/infrastructure/webLlmAnalysisGateway.ts` | 实现 |
| 3 | `src/features/canvas/application/canvasServices.ts` | 接线 |
| 4 | `src/features/canvas/ui/ReversePromptDialog.tsx` | 弹窗组件 |
| 5 | `src/features/canvas/ui/nodeToolbarConfig.ts` | 添加工具栏按钮 |

---

### N3: 导演级镜头分析

#### 任务分解

##### N3.1 — 后端：镜头分析服务 (llm-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/ai/analysis/shotAnalysisService.test.ts
describe('ShotAnalysisService', () => {
  it('应该返回结构化的镜头分析结果', async () => {})
  it('应该支持中文和英文输出', async () => {})
  it('应该包含镜头类型、运动、光照等所有字段', async () => {})
  it('应该在多帧输入时分析镜头运动', async () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/ai/analysis/prompts/shotAnalysis.ts` | 镜头分析 System Prompt |
| 2 | `src/server/ai/analysis/shotAnalysisService.ts` | 镜头分析业务逻辑 |
| 3 | `src/app/api/ai/shot-analysis/route.ts` | API Route |

##### N3.2 — 前端：镜头分析弹窗 (canvas-dev)

**依赖：N3.1 API 就绪**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/ui/ShotAnalysisDialog.tsx` | 分析结果展示弹窗 |
| 2 | `src/features/canvas/ui/nodeToolbarConfig.ts` | 添加"镜头分析"工具栏按钮 |
| 3 | `src/i18n/locales/zh.json` + `en.json` | i18n |

---

## Wave 1 实施

### 并行启动图

```
┌──────────────────────────────────────────────────────┐
│ Wave 1 (Wave 0 的 LLM 基础设施就绪后启动)            │
│                                                      │
│  llm-dev ────────── N4 后端 (小说分析服务)            │
│        │                                             │
│  canvas-dev ─────── N4 前端 (小说输入节点)            │
│                                                      │
│  template-dev ───── N5 + N6 (模板系统全栈，独立并行)  │
│                                                      │
│  storyboard-dev ─── N7 (分镜增强，独立并行)           │
│                                                      │
│  infra-dev ──────── N8 (Key 轮转，独立并行)           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### N4: 小说/剧本输入节点

#### 任务分解

##### N4.1 — 后端：小说分析服务 (llm-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/ai/analysis/novelAnalysisService.test.ts
describe('NovelAnalysisService', () => {
  it('应该从短文本中提取角色', async () => {})
  it('应该拆分场景并生成视觉提示词', async () => {})
  it('应该遵守 maxScenes 限制', async () => {})
  it('应该支持不同粒度 (coarse/medium/fine)', async () => {})
  it('应该自动检测中英文', async () => {})
  it('应该对超长文本（>10000字）返回错误', async () => {})
})

// __tests__/api/novel-analyze.test.ts
describe('POST /api/ai/novel-analyze', () => {
  it('应该对空文本返回 400', async () => {})
  it('应该对超长文本返回 400', async () => {})
  it('应该返回角色列表和场景列表', async () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/ai/analysis/prompts/novelAnalysis.ts` | 小说分析 System Prompt |
| 2 | `src/server/ai/analysis/novelAnalysisService.ts` | 角色提取 + 场景拆分 |
| 3 | `src/app/api/ai/novel-analyze/route.ts` | API Route |

##### N4.2 — 前端：小说输入节点 (canvas-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/novelInputNode.test.ts
describe('NovelInputNode Registration', () => {
  it('应该在 nodeRegistry 中注册 novelInputNode', () => {})
  it('应该在菜单中可见', () => {})
  it('应该只有 sourceHandle（无 targetHandle）', () => {})
  it('createDefaultData 应该返回空文本和默认参数', () => {})
})

describe('NovelInputNode Component', () => {
  it('应该显示文本输入框', () => {})
  it('应该显示字符计数', () => {})
  it('应该在超过 10000 字时禁用分析按钮', () => {})
  it('应该在分析完成后显示角色表和场景列表', () => {})
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/domain/canvasNodes.ts` | 新增 NovelInputNodeData |
| 2 | `src/features/canvas/domain/nodeRegistry.ts` | 注册 novelInputNodeDefinition |
| 3 | `src/features/canvas/nodes/NovelInputNode.tsx` | 组件实现 |
| 4 | `src/features/canvas/nodes/index.ts` | 导出 |
| 5 | i18n 文件 | 中英文文案 |

##### N4.3 — 前端：批量生成分镜联动 (canvas-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/novelBatchGenerate.test.ts
describe('Novel Batch Generate Storyboards', () => {
  it('应该为每个选中的场景创建 storyboardGenNode', () => {})
  it('应该自动创建 Edge 连接', () => {})
  it('应该正确布局新节点位置', () => {})
  it('应该将 visualPrompt 填充到分镜描述', () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/application/novelToStoryboard.ts` | 批量创建逻辑 |
| 2 | `NovelInputNode.tsx` | 集成"批量生成分镜"按钮 |

---

### N5: 工作流模板系统

#### 任务分解

##### N5.1 — 数据库 (template-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `supabase/migrations/00X_workflow_templates.sql` | 建表 + RLS + 索引 |

##### N5.2 — 后端：模板 API (template-dev)

**TDD Tests First:**

```typescript
// __tests__/api/templates.test.ts
describe('Templates API', () => {
  describe('GET /api/templates', () => {
    it('应该返回用户自己的模板', async () => {})
    it('应该返回官方模板', async () => {})
    it('应该支持 category 过滤', async () => {})
  })
  describe('POST /api/templates', () => {
    it('应该创建新模板', async () => {})
    it('应该对缺少 name 返回 400', async () => {})
    it('应该对缺少 templateData 返回 400', async () => {})
  })
  describe('DELETE /api/templates/[id]', () => {
    it('应该删除用户自己的模板', async () => {})
    it('应该拒绝删除他人模板', async () => {})
  })
  describe('POST /api/templates/[id]/use', () => {
    it('应该递增 use_count', async () => {})
  })
})
```

**实现步骤：**

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/app/api/templates/route.ts` | GET (列表) + POST (创建) |
| 2 | `src/app/api/templates/[id]/route.ts` | GET (详情) + DELETE (删除) |
| 3 | `src/app/api/templates/[id]/use/route.ts` | POST (使用计数) |

##### N5.3 — 前端：模板序列化 (template-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/templates/templateSerializer.test.ts
describe('TemplateSerializer', () => {
  describe('serializeCanvasToTemplate', () => {
    it('应该清除运行时数据（imageUrl, isGenerating 等）', () => {})
    it('应该保留结构数据（prompt, model, gridRows 等）', () => {})
    it('应该生成正确的元数据', () => {})
    it('应该统计 requiredNodeTypes', () => {})
  })
  describe('deserializeTemplateToCanvas', () => {
    it('应该重新生成所有节点 ID', () => {})
    it('应该修正 Edge 中的 source/target 引用', () => {})
    it('应该修正 Group 中的 parentId 引用', () => {})
    it('应该应用位置偏移', () => {})
    it('应该恢复默认运行时状态', () => {})
  })
  describe('JSON Import/Export', () => {
    it('导出后导入应该保持结构一致', () => {})
    it('应该拒绝无效的 JSON 格式', () => {})
    it('应该拒绝不兼容的版本', () => {})
  })
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/application/templateSerializer.ts` | 序列化/反序列化逻辑 |

##### N5.4 — 前端：模板库 UI (template-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/templates/TemplateCard.tsx` | 模板卡片组件 |
| 2 | `src/features/templates/TemplateLibrary.tsx` | 模板库面板（官方/我的） |
| 3 | `src/features/templates/SaveTemplateDialog.tsx` | 保存为模板弹窗 |
| 4 | `src/features/canvas/ui/CanvasSidebar.tsx` | 侧边栏新增模板按钮 |
| 5 | `src/app/(app)/dashboard/page.tsx` | Dashboard 模板入口 |
| 6 | i18n 文件 | 中英文文案 |

##### N5.5 — 预置官方模板 (template-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/templates/officialTemplates/novelToStoryboard.json` | 小说→分镜模板 |
| 2 | `src/features/templates/officialTemplates/videoRebuild.json` | 视频拆解重制模板 |
| 3 | `src/features/templates/officialTemplates/batchImageGen.json` | 批量图片生成模板 |
| 4 | `supabase/migrations/00X_seed_official_templates.sql` | 种子数据 |

---

### N6: 用户模板分享

#### 任务分解

**依赖：N5 完成**

##### N6.1 — 后端 (template-dev)

**TDD Tests First:**

```typescript
// __tests__/api/template-share.test.ts
describe('Template Sharing', () => {
  describe('PATCH /api/templates/[id]/publish', () => {
    it('应该将用户模板设为公开', async () => {})
    it('应该拒绝发布他人模板', async () => {})
  })
  describe('GET /api/templates?category=shared', () => {
    it('应该返回所有公开模板', async () => {})
    it('应该支持按 popular/newest 排序', async () => {})
    it('应该支持 tag 过滤', async () => {})
  })
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/app/api/templates/[id]/publish/route.ts` | PATCH publish/unpublish |
| 2 | 修改 `src/app/api/templates/route.ts` | 扩展 GET 支持社区浏览 |
| 3 | 修改 `supabase/migrations/00X_workflow_templates.sql` | 补充共享相关索引 |

##### N6.2 — 前端 (template-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/templates/CommunityTemplates.tsx` | 社区模板浏览页 |
| 2 | `src/features/templates/PublishTemplateDialog.tsx` | 发布弹窗 |
| 3 | 修改 `src/features/templates/TemplateLibrary.tsx` | 新增"社区"标签页 |
| 4 | i18n 文件 | 中英文文案 |

---

### N7: 智能分镜批量生成增强

#### 任务分解

##### N7.1 — 数据结构扩展 (storyboard-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/storyboardGenEnhance.test.ts
describe('StoryboardGenFrameItem Enhancement', () => {
  it('应该支持 startFrameUrl 和 endFrameUrl', () => {})
  it('应该支持 referenceImageUrls 数组', () => {})
  it('应该支持 referenceWeights 权重', () => {})
  it('默认 startFrameMode 应该是 none', () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/domain/canvasNodes.ts` | 扩展 StoryboardGenFrameItem |

##### N7.2 — 批量生成逻辑 (storyboard-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/canvas/storyboardBatchGenerate.test.ts
describe('Batch Generate', () => {
  it('应该并行提交所有帧的生成 Job', async () => {})
  it('应该并行轮询所有 Job 状态', async () => {})
  it('应该正确跟踪批量进度', async () => {})
  it('应该在部分失败时继续其他帧', async () => {})
  it('应该将首末帧参数传给 API', async () => {})
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/features/canvas/nodes/StoryboardGenNode.tsx` | 批量生成逻辑 + UI |
| 2 | `src/features/canvas/ui/FrameReferenceEditor.tsx` | 多图参考编辑器 |
| 3 | `src/features/canvas/ui/FrameControlEditor.tsx` | 首末帧编辑器 |
| 4 | i18n 文件 | 中英文文案 |

---

### N8: 多 API Key 轮转

#### 任务分解

##### N8.1 — 数据库迁移 (infra-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `supabase/migrations/00X_api_keys_multi.sql` | 表结构扩展 |

##### N8.2 — 轮转算法 (infra-dev)

**TDD Tests First:**

```typescript
// __tests__/unit/ai/keyRotation.test.ts
describe('ApiKeyRotator', () => {
  describe('getNextKey', () => {
    it('应该 Round-Robin 轮转 key', () => {})
    it('应该跳过黑名单中的 key', () => {})
    it('应该在所有 key 不可用时抛出错误', () => {})
  })
  describe('reportError', () => {
    it('应该将 quota_exhausted 的 key 加入黑名单', () => {})
    it('应该将 invalid 的 key 永久标记', () => {})
    it('应该对 rate_limited 暂停 60 秒后恢复', () => {})
    it('应该在 3 次 unknown 错误后黑名单', () => {})
  })
  describe('classifyError', () => {
    it('应该将 429 分类为 rate_limited', () => {})
    it('应该将 402 分类为 quota_exhausted', () => {})
    it('应该将 401/403 分类为 invalid', () => {})
    it('应该将 5xx 分类为 server_error', () => {})
  })
})
```

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/ai/keyRotation.ts` | 轮转算法实现 |

##### N8.3 — API 集成 (infra-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | 修改 `src/app/api/settings/api-keys/route.ts` | 多 key CRUD |
| 2 | 修改 `src/app/api/ai/image/generate/route.ts` | 集成轮转 |
| 3 | 修改 `src/app/api/ai/video/generate/route.ts` | 集成轮转 |

##### N8.4 — 前端：设置 UI (infra-dev)

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | 修改 `src/stores/settingsStore.ts` | ProviderApiKeys 改为数组 |
| 2 | 修改 `src/features/settings/SettingsDialog.tsx` | 多 key 管理 UI |
| 3 | i18n 文件 | 中英文文案 |

---

## 并行策略与解锁条件

### Wave 0

```
同时启动:
  video-analysis-dev (N1 后端)  ← 独立
  llm-dev (N2+N3 后端)          ← 独立

等待后启动:
  canvas-dev (N1+N2+N3 前端)    ← 等 video-analysis-dev + llm-dev API 就绪
```

**解锁条件：**

| 条件 | 触发者 | 解锁 |
|------|--------|------|
| N1 后端 API 就绪 | video-analysis-dev | canvas-dev 可开始 N1 前端 |
| N2+N3 后端 API 就绪 | llm-dev | canvas-dev 可开始 N2+N3 前端 |
| Wave 0 全部完成 | team-lead 确认 | llm-dev 开始 N4 后端 |

### Wave 1

```
同时启动（Wave 0 LLM 基础设施就绪后）:
  llm-dev (N4 后端)             ← 复用 Wave 0 的 LLM 基础设施
  canvas-dev (N4 前端)          ← 等 N4 后端 API
  template-dev (N5 → N6)       ← 完全独立
  storyboard-dev (N7)          ← 完全独立
  infra-dev (N8)               ← 完全独立
```

**解锁条件：**

| 条件 | 触发者 | 解锁 |
|------|--------|------|
| N4 后端 API 就绪 | llm-dev | canvas-dev 开始 N4 前端 |
| N5 模板基础完成 | template-dev | template-dev 开始 N6 |

---

## CI/CD 检查清单

### 每次提交

```bash
rtk npx tsc --noEmit       # 类型检查
rtk npx vitest run          # 单元 + API 测试
rtk npm run lint            # lint 检查
```

### 每个需求完成

```bash
rtk npm run build           # 完整构建
rtk npx playwright test     # E2E 测试
```

### 合并前

- [ ] 所有 TDD 测试通过
- [ ] 类型检查零错误
- [ ] 构建成功
- [ ] E2E 关键路径通过
- [ ] i18n 中英文均有对应 key
- [ ] reviewer 代码审查通过
- [ ] CI/CD 无错误

### 集成测试矩阵

| 测试场景 | 涉及需求 | 验证点 |
|---------|---------|--------|
| 视频→分析→提示词→生图 | N1 + N2 | 全链路打通 |
| 图片→镜头分析→导出 | N3 | 分析结果专业性 |
| 小说→拆分→批量分镜 | N4 + N7 | 文本到视觉链路 |
| 模板保存→发布→他人使用 | N5 + N6 | 社区分享流程 |
| 多 Key 轮转→失败自动切换 | N8 | 可靠性 |
