# IceZone Studio — Feature Design Document

> 基于竞品 Tapnow Studio PP 分析，提炼 Wave 0 + Wave 1 新需求的详细设计。

---

## 目录

- [Wave 0: 核心差异化](#wave-0-核心差异化)
  - [N1: 视频智能分析节点](#n1-视频智能分析节点)
  - [N2: 反向提示词生成](#n2-反向提示词生成reverse-prompt)
  - [N3: 导演级镜头分析](#n3-导演级镜头分析)
- [Wave 1: 竞争力提升](#wave-1-竞争力提升)
  - [N4: 小说/剧本输入节点](#n4-小说剧本输入节点)
  - [N5: 工作流模板系统](#n5-工作流模板系统)
  - [N6: 用户模板分享](#n6-用户模板分享)
  - [N7: 智能分镜批量生成增强](#n7-智能分镜批量生成增强)
  - [N8: 多 API Key 轮转与智能管理](#n8-多-api-key-轮转与智能管理)
- [数据库迁移汇总](#数据库迁移汇总)
- [验证计划](#验证计划)

---

# Wave 0: 核心差异化

## N1: 视频智能分析节点

### 1.1 需求概述

新增 `videoAnalysisNode`，用户上传视频或从 `videoResultNode` 接入视频，自动检测场景切换点并提取关键帧图片。输出为一组带时间戳的关键帧，可直接连线到下游图片节点或分镜节点。

### 1.2 用户故事

1. 用户拖入一段视频 → 节点自动分析 → 显示检测到的场景列表（缩略图 + 时间码）
2. 用户可调整灵敏度阈值，重新分析
3. 用户点击"导出关键帧" → 每个关键帧生成一个 `uploadNode` 或直接输出到连接的下游节点
4. 关键帧可直接传给 N2（反向提示词）或 N3（镜头分析）

### 1.3 节点定义

#### 类型注册 — `canvasNodes.ts`

```typescript
// 新增到 CANVAS_NODE_TYPES
videoAnalysis: 'videoAnalysisNode'

// 新增数据结构
interface VideoAnalysisNodeData extends NodeDisplayData {
  // 输入
  videoUrl: string | null
  videoFileName?: string | null

  // 分析参数
  sensitivityThreshold: number  // 0.1 ~ 1.0, 默认 0.3
  minSceneDurationMs: number    // 最小场景时长（ms），默认 500
  maxKeyframes: number          // 最大关键帧数，默认 50

  // 分析状态
  isAnalyzing: boolean
  analysisProgress: number      // 0 ~ 100
  errorMessage: string | null

  // 分析结果
  scenes: VideoScene[]
}

interface VideoScene {
  id: string
  startTimeMs: number
  endTimeMs: number
  keyframeUrl: string           // 已上传到 Supabase Storage 的 URL
  previewUrl?: string           // 缩略图 URL
  confidence: number            // 场景切换置信度 0~1
  selected: boolean             // 用户是否勾选导出
}
```

#### 节点注册 — `nodeRegistry.ts`

```typescript
const videoAnalysisNodeDefinition: CanvasNodeDefinition<VideoAnalysisNodeData> = {
  type: CANVAS_NODE_TYPES.videoAnalysis,
  menuLabelKey: 'node.menu.videoAnalysis',
  menuIcon: 'video',            // 复用现有 video icon
  visibleInMenu: true,
  capabilities: { toolbar: true, promptInput: false },
  connectivity: {
    sourceHandle: true,          // 输出关键帧
    targetHandle: true,          // 接收视频输入
    connectMenu: { fromSource: true, fromTarget: true }
  },
  createDefaultData: () => ({
    displayName: '',
    videoUrl: null,
    sensitivityThreshold: 0.3,
    minSceneDurationMs: 500,
    maxKeyframes: 50,
    isAnalyzing: false,
    analysisProgress: 0,
    errorMessage: null,
    scenes: []
  })
}
```

### 1.4 前端组件 — `VideoAnalysisNode.tsx`

```
┌─────────────────────────────────────────┐
│  [NodeHeader: 视频分析]                  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  视频预览区 / 拖拽上传          │    │
│  │  (video 标签 or 上传占位)       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  灵敏度: [━━━━━●━━━] 0.3               │
│  最小场景时长: [500ms ▾]                │
│  最大关键帧: [50]                       │
│                                         │
│  [🔍 开始分析]  [进度条: 45%]           │
│                                         │
│  ── 检测到 12 个场景 ──                 │
│  ┌───┬───┬───┬───┐                     │
│  │☑ 1│☑ 2│☑ 3│☑ 4│  (缩略图网格)      │
│  │0:02│0:05│0:08│0:12│                  │
│  └───┴───┴───┴───┘                     │
│  ... (可滚动)                           │
│                                         │
│  [全选] [反选]  [导出选中关键帧 (8)]    │
├─────────────────────────────────────────┤
│  ○ target handle    source handle ○     │
└─────────────────────────────────────────┘
```

### 1.5 后端 API

#### `POST /api/video/analyze` — 场景检测

```typescript
// 请求
interface VideoAnalyzeRequest {
  videoUrl: string
  sensitivityThreshold?: number   // default 0.3
  minSceneDurationMs?: number     // default 500
  maxKeyframes?: number           // default 50
  projectId: string
}

// 响应（异步 Job）
interface VideoAnalyzeResponse {
  jobId: string
}

// Job 完成后的结果（通过 GET /api/jobs/{id} 获取）
interface VideoAnalyzeResult {
  scenes: {
    startTimeMs: number
    endTimeMs: number
    keyframeUrl: string
    confidence: number
  }[]
  totalDurationMs: number
  fps: number
}
```

#### 服务端实现 — `src/server/video/analysis/`

```
src/server/video/analysis/
├── sceneDetector.ts       # 场景检测核心算法
├── frameExtractor.ts      # 关键帧提取（ffmpeg / Canvas API）
└── types.ts               # 分析相关类型
```

**技术方案**：
- **方案 A（推荐）**：服务端 `fluent-ffmpeg` + `ffprobe`
  - `ffmpeg -i input.mp4 -vf "select='gt(scene,0.3)',showinfo" -vsync vfr` 提取场景切换帧
  - 优点：准确、高效、支持大文件
  - 依赖：需要服务器安装 ffmpeg（Vercel 可用 `@ffmpeg-installer/ffmpeg`）
- **方案 B（备选）**：前端 Canvas API 帧差分析
  - 使用 `<video>` + `<canvas>` 逐帧读取，计算像素差异
  - 优点：无服务端依赖
  - 缺点：大视频性能差，受浏览器内存限制

**推荐混合方案**：
- 短视频（<30s）：前端 Canvas API 直接分析，零服务端成本
- 长视频（>30s）：上传到服务端，ffmpeg 异步分析，Job 轮询结果

### 1.6 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/features/canvas/nodes/VideoAnalysisNode.tsx` |
| 新增 | `src/features/canvas/domain/videoAnalysisTypes.ts` |
| 新增 | `src/app/api/video/analyze/route.ts` |
| 新增 | `src/server/video/analysis/sceneDetector.ts` |
| 新增 | `src/server/video/analysis/frameExtractor.ts` |
| 修改 | `src/features/canvas/domain/canvasNodes.ts` — 新增类型 |
| 修改 | `src/features/canvas/domain/nodeRegistry.ts` — 注册节点 |
| 修改 | `src/features/canvas/nodes/index.ts` — 导出组件 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` — i18n |
| 新增 | `package.json` — `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` |

---

## N2: 反向提示词生成（Reverse Prompt）

### 2.1 需求概述

对图片或视频关键帧调用多模态 LLM，自动生成高精度提示词。支持多种输出格式（通用、Midjourney 风格、中文风格），可直接填充到下游生成节点的 prompt 字段。

### 2.2 用户故事

1. 用户右键点击任意图片节点 → 工具栏出现"生成提示词"按钮
2. 点击后选择输出风格（通用 / MJ / 中文描述）
3. LLM 返回结构化提示词 → 显示在弹窗中，可一键复制或填充到连接的下游节点
4. 从 N1 视频分析节点的关键帧 → 批量生成提示词

### 2.3 架构设计

反向提示词不作为独立节点，而是作为**节点操作（Node Action）** 集成到现有节点工具栏中，同时提供独立的 API 供批量调用。

#### 新增 Port 接口 — `ports.ts`

```typescript
interface LlmAnalysisGateway {
  reversePrompt(payload: ReversePromptPayload): Promise<ReversePromptResult>
  analyzeShot(payload: ShotAnalysisPayload): Promise<ShotAnalysisResult>
}

interface ReversePromptPayload {
  imageUrl: string
  style: 'generic' | 'midjourney' | 'chinese'
  additionalContext?: string       // 用户补充说明
}

interface ReversePromptResult {
  prompt: string
  negativePrompt?: string
  tags?: string[]                  // 关键词标签
  confidence: number
}
```

#### 前端 Gateway — `webLlmAnalysisGateway.ts`

```typescript
class WebLlmAnalysisGateway implements LlmAnalysisGateway {
  async reversePrompt(payload: ReversePromptPayload): Promise<ReversePromptResult> {
    // POST /api/ai/reverse-prompt
  }
  async analyzeShot(payload: ShotAnalysisPayload): Promise<ShotAnalysisResult> {
    // POST /api/ai/shot-analysis
  }
}
```

### 2.4 后端 API

#### `POST /api/ai/reverse-prompt`

```typescript
// 请求
interface ReversePromptRequest {
  imageUrl: string
  style: 'generic' | 'midjourney' | 'chinese'
  additionalContext?: string
  projectId?: string
}

// 响应（同步，LLM 通常 3-10 秒）
interface ReversePromptResponse {
  prompt: string
  negativePrompt?: string
  tags?: string[]
}
```

#### 服务端实现 — `src/server/ai/analysis/`

```
src/server/ai/analysis/
├── reversePromptService.ts    # 反向提示词服务
├── shotAnalysisService.ts     # 镜头分析服务（N3 共用）
├── prompts/
│   ├── reversePromptGeneric.ts    # 通用 prompt 模板
│   └── reversePromptChinese.ts    # 中文风格模板
└── providers/
    ├── geminiAnalysis.ts      # Gemini 3.1 Pro 多模态
    └── openaiAnalysis.ts      # GPT-4V 备选
```

**LLM Provider 选择**：
- **首选**：Gemini 3.1 Pro（多模态能力强、成本低）
- **备选**：OpenAI GPT-4V（兼容性好）
- 通过 `LLM_ANALYSIS_PROVIDER` 环境变量切换

**System Prompt 设计（通用风格示例）**：

```
You are an expert AI image prompt engineer. Analyze the given image and generate a detailed,
precise text prompt that could recreate this image using an AI image generator.

Output format:
- prompt: A detailed description covering subject, composition, lighting, color palette,
  style, mood, and technical details
- negative_prompt: Elements to avoid
- tags: 5-10 keyword tags

Be specific about: camera angle, focal length, lighting direction, color grading,
artistic style, medium (photography/illustration/3D render), and atmosphere.
```

### 2.5 UI 集成点

#### 节点工具栏扩展 — `nodeToolbarConfig.ts`

在支持图片的节点（`uploadNode`, `imageNode`, `exportImageNode`, `storyboardNode`）工具栏中新增"反向提示词"按钮。

```typescript
// 新增工具栏动作
interface NodeToolbarAction {
  id: string
  icon: LucideIcon
  labelKey: string
  handler: (nodeId: string, nodeData: CanvasNodeData) => void
  visible: (nodeData: CanvasNodeData) => boolean
}

// 反向提示词动作
{
  id: 'reverse-prompt',
  icon: Wand2,                    // lucide-react
  labelKey: 'node.toolbar.reversePrompt',
  handler: (nodeId, data) => openReversePromptDialog(nodeId, data),
  visible: (data) => 'imageUrl' in data && data.imageUrl != null
}
```

#### 反向提示词弹窗 — `ReversePromptDialog.tsx`

```
┌──────────────────────────────────────┐
│  反向提示词生成                       │
├──────────────────────────────────────┤
│  [图片预览缩略图]                     │
│                                      │
│  输出风格:                           │
│  [● 通用] [○ 中文]                    │
│                                      │
│  补充说明 (可选):                     │
│  [________________________]          │
│                                      │
│  [✨ 生成提示词]                      │
│                                      │
│  ── 生成结果 ──                      │
│  ┌────────────────────────────────┐  │
│  │ A cinematic wide shot of a    │  │
│  │ solitary figure standing on   │  │
│  │ a cliff edge, backlit by...   │  │
│  └────────────────────────────────┘  │
│  反向提示词:                         │
│  ┌────────────────────────────────┐  │
│  │ blurry, low quality, text...  │  │
│  └────────────────────────────────┘  │
│  标签: [cinematic] [landscape] ...   │
│                                      │
│  [📋 复制] [📥 填充到下游节点] [关闭] │
└──────────────────────────────────────┘
```

### 2.6 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/features/canvas/ui/ReversePromptDialog.tsx` |
| 新增 | `src/features/canvas/infrastructure/webLlmAnalysisGateway.ts` |
| 新增 | `src/app/api/ai/reverse-prompt/route.ts` |
| 新增 | `src/server/ai/analysis/reversePromptService.ts` |
| 新增 | `src/server/ai/analysis/prompts/reversePromptGeneric.ts` |
| 新增 | `src/server/ai/analysis/prompts/reversePromptChinese.ts` |
| 新增 | `src/server/ai/analysis/providers/geminiAnalysis.ts` |
| 修改 | `src/features/canvas/application/ports.ts` — 新增 LlmAnalysisGateway |
| 修改 | `src/features/canvas/application/canvasServices.ts` — 接线 |
| 修改 | `src/features/canvas/ui/nodeToolbarConfig.ts` — 新增工具栏按钮 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |
| 新增 | `package.json` — `@google/generative-ai`（Gemini SDK） |

---

## N3: 导演级镜头分析

### 3.1 需求概述

对视频片段或图片进行专业镜头语言分析，输出结构化的导演级信息：镜头类型、运动方式、主体动态、光照氛围、情绪色调。与 N2 共享 LLM 基础设施。

### 3.2 用户故事

1. 用户在视频分析节点（N1）的关键帧上点击"镜头分析"
2. 或在任意图片节点工具栏点击"镜头分析"
3. 返回结构化分析卡片，包含镜头类型、运动、光照等维度
4. 分析结果可导出为分镜脚本格式（表格）

### 3.3 数据结构

```typescript
interface ShotAnalysisPayload {
  imageUrl: string
  // 如果是视频片段，可提供多帧用于运动分析
  additionalFrameUrls?: string[]
  language: 'zh' | 'en'
}

interface ShotAnalysisResult {
  // 镜头类型
  shotType: string              // 特写/中景/全景/远景/鸟瞰 等
  shotTypeConfidence: number

  // 镜头运动（多帧时可分析）
  cameraMovement: string        // 推/拉/摇/移/升/降/固定/手持 等
  movementDescription: string

  // 主体
  subject: string               // 主体描述
  subjectAction: string         // 主体动作

  // 光照
  lightingType: string          // 自然光/人工光/逆光/侧光/顶光 等
  lightingMood: string          // 温暖/冷冽/柔和/硬朗

  // 色调与情绪
  colorPalette: string[]        // 主色调 hex 值
  mood: string                  // 紧张/宁静/欢快/忧郁 等

  // 构图
  composition: string           // 三分法/对称/引导线/框架 等

  // 综合描述
  directorNote: string          // 导演笔记风格的综合描述
}
```

### 3.4 后端 API

#### `POST /api/ai/shot-analysis`

```typescript
// 请求
interface ShotAnalysisRequest {
  imageUrl: string
  additionalFrameUrls?: string[]
  language?: 'zh' | 'en'        // 默认跟随用户语言设置
  projectId?: string
}

// 响应（同步）
interface ShotAnalysisResponse extends ShotAnalysisResult {}
```

#### System Prompt

```
You are a professional film director and cinematographer. Analyze the given image(s)
and provide a detailed shot analysis covering:

1. Shot Type (ECU/CU/MCU/MS/MLS/LS/ELS/Aerial)
2. Camera Movement (if multiple frames: push/pull/pan/tilt/dolly/crane/handheld/static)
3. Subject & Action
4. Lighting (type, direction, quality, mood)
5. Color Palette (dominant colors as hex codes)
6. Mood/Atmosphere
7. Composition technique
8. Director's Note (a concise production description)

Output as structured JSON matching the provided schema.
```

### 3.5 UI — `ShotAnalysisDialog.tsx`

```
┌──────────────────────────────────────┐
│  镜头分析                            │
├──────────────────────────────────────┤
│  [图片预览]                          │
│                                      │
│  ┌──────────┬───────────────────┐    │
│  │ 镜头类型 │ 全景 (Long Shot)   │    │
│  │ 镜头运动 │ 缓慢推进 (Dolly)  │    │
│  │ 主体     │ 孤独身影站在悬崖   │    │
│  │ 动作     │ 面向远方凝视       │    │
│  │ 光照     │ 逆光·金色暖调     │    │
│  │ 色调     │ [■][■][■][■][■]   │    │
│  │ 情绪     │ 孤独·壮阔·史诗    │    │
│  │ 构图     │ 三分法·引导线     │    │
│  └──────────┴───────────────────┘    │
│                                      │
│  ── 导演笔记 ──                      │
│  日落余晖中，镜头从低角度缓慢推进... │
│                                      │
│  [📋 复制] [📄 导出分镜] [关闭]       │
└──────────────────────────────────────┘
```

### 3.6 与 N1/N2 的集成

- N1 → N3：视频分析提取关键帧后，可批量发起镜头分析
- N2 + N3 可并行调用同一 LLM（Gemini 支持多模态批量请求）
- 共享 `LlmAnalysisGateway` 接口和 Gemini/OpenAI provider

### 3.7 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/features/canvas/ui/ShotAnalysisDialog.tsx` |
| 新增 | `src/app/api/ai/shot-analysis/route.ts` |
| 新增 | `src/server/ai/analysis/shotAnalysisService.ts` |
| 新增 | `src/server/ai/analysis/prompts/shotAnalysis.ts` |
| 修改 | `src/features/canvas/ui/nodeToolbarConfig.ts` — 新增"镜头分析"按钮 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

# Wave 1: 竞争力提升

## N4: 小说/剧本输入节点

### 4.1 需求概述

新增 `novelInputNode`，支持粘贴或输入万字级文本（小说、剧本、脚本），通过 LLM 自动拆分场景、提取角色信息，输出结构化的场景列表。每个场景可连接到下游分镜生成节点，打通"文本 → 分镜 → 视频"全链路。

### 4.2 用户故事

1. 用户从菜单添加"小说/剧本输入"节点
2. 在大文本框中粘贴小说片段（支持最多 10,000 字符）
3. 点击"智能拆分" → LLM 分析文本 → 输出场景列表和角色表
4. 每个场景自动生成描述和视觉提示词
5. 用户可选择场景 → "批量生成分镜" → 自动为每个场景创建 StoryboardGenNode

### 4.3 节点定义

#### 类型 — `canvasNodes.ts`

```typescript
// CANVAS_NODE_TYPES 新增
novelInput: 'novelInputNode'

interface NovelInputNodeData extends NodeDisplayData {
  // 输入文本
  text: string
  textLength: number               // 实时字符计数

  // 分析参数
  language: 'auto' | 'zh' | 'en'
  maxScenes: number                // 最大场景数，默认 20
  sceneGranularity: 'coarse' | 'medium' | 'fine'  // 拆分粒度

  // 分析状态
  isAnalyzing: boolean
  errorMessage: string | null

  // 分析结果
  characters: NovelCharacter[]
  scenes: NovelScene[]
}

interface NovelCharacter {
  id: string
  name: string
  description: string              // 外貌、性格等
  aliases?: string[]               // 别名
}

interface NovelScene {
  id: string
  order: number
  title: string                    // 场景标题
  summary: string                  // 场景概要
  visualPrompt: string             // 自动生成的视觉提示词
  characters: string[]             // 出场角色 ID
  location: string                 // 场景地点
  mood: string                     // 情绪基调
  timeOfDay?: string               // 时间段（白天/夜晚/黄昏...）
  sourceTextRange?: { start: number; end: number }  // 原文定位
  selected: boolean                // 用户是否勾选
}
```

#### 节点注册 — `nodeRegistry.ts`

```typescript
const novelInputNodeDefinition: CanvasNodeDefinition<NovelInputNodeData> = {
  type: CANVAS_NODE_TYPES.novelInput,
  menuLabelKey: 'node.menu.novelInput',
  menuIcon: 'text',               // 复用 text icon
  visibleInMenu: true,
  capabilities: { toolbar: true, promptInput: false },
  connectivity: {
    sourceHandle: true,            // 输出场景到下游
    targetHandle: false,           // 纯输入节点，无上游
    connectMenu: { fromSource: true, fromTarget: false }
  },
  createDefaultData: () => ({
    displayName: '',
    text: '',
    textLength: 0,
    language: 'auto',
    maxScenes: 20,
    sceneGranularity: 'medium',
    isAnalyzing: false,
    errorMessage: null,
    characters: [],
    scenes: []
  })
}
```

### 4.4 前端组件 — `NovelInputNode.tsx`

```
┌─────────────────────────────────────────┐
│  [NodeHeader: 小说/剧本输入]              │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  (大文本框, 可滚动)             │    │
│  │  placeholder: 粘贴小说或剧本... │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  字符: 3,256 / 10,000                   │
│                                         │
│  拆分粒度: [粗略] [● 中等] [精细]       │
│  语言: [自动检测 ▾]                     │
│                                         │
│  [🔍 智能拆分]                          │
│                                         │
│  ── 角色表 (3) ──                       │
│  • 李明 — 30岁，沉默寡言的侦探          │
│  • 小雪 — 李明的搭档，性格开朗          │
│  • 张老板 — 酒吧老板，神秘人物          │
│                                         │
│  ── 场景列表 (8) ──                     │
│  ☑ S1: 雨夜酒吧 — 李明独坐角落...      │
│  ☑ S2: 凌晨巷口 — 追踪可疑人影...      │
│  ☐ S3: 警局办公室 — 分析线索...        │
│  ... (可滚动)                           │
│                                         │
│  [全选] [反选] [批量生成分镜 (5)]       │
├─────────────────────────────────────────┤
│                       source handle ○   │
└─────────────────────────────────────────┘
```

### 4.5 后端 API

#### `POST /api/ai/novel-analyze`

```typescript
interface NovelAnalyzeRequest {
  text: string                     // 最大 10,000 字符
  language?: 'auto' | 'zh' | 'en'
  maxScenes?: number
  sceneGranularity?: 'coarse' | 'medium' | 'fine'
  projectId?: string
}

interface NovelAnalyzeResponse {
  characters: NovelCharacter[]
  scenes: NovelScene[]
}
```

**实现**：复用 N2/N3 的 `LlmAnalysisGateway`，新增 `novelAnalysisService.ts`。

System Prompt 核心要求：
- 提取所有命名角色及其外貌描述
- 按叙事节奏拆分场景
- 每个场景生成可用于 AI 图片生成的视觉提示词（英文）
- 输出严格 JSON 格式

### 4.6 "批量生成分镜"流程

用户点击"批量生成分镜"后：
1. 遍历 `selected` 场景
2. 为每个场景调用 `canvasStore.addNode('storyboardGenNode', position, { ... })`
3. 自动设置每个分镜节点的描述为场景的 `visualPrompt`
4. 自动创建 Edge 连接 novelInputNode → 各个 storyboardGenNode
5. 节点布局：从小说节点右侧起，垂直排列

### 4.7 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/features/canvas/nodes/NovelInputNode.tsx` |
| 新增 | `src/app/api/ai/novel-analyze/route.ts` |
| 新增 | `src/server/ai/analysis/novelAnalysisService.ts` |
| 新增 | `src/server/ai/analysis/prompts/novelAnalysis.ts` |
| 修改 | `src/features/canvas/domain/canvasNodes.ts` |
| 修改 | `src/features/canvas/domain/nodeRegistry.ts` |
| 修改 | `src/features/canvas/nodes/index.ts` |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

## N5: 工作流模板系统

### 5.1 需求概述

支持将画布当前状态（节点、连线、配置）保存为可复用的工作流模板，提供预置模板库和 JSON 导入/导出功能。

### 5.2 用户故事

1. 用户在画布上构建好工作流 → 点击"保存为模板" → 输入模板名称和描述
2. 模板保存到用户私有库
3. 新建项目时，可从模板库选择模板 → 一键加载工作流
4. 支持 JSON 导入/导出（本地文件交换）
5. 预置官方模板：小说转分镜、视频拆解重制、批量图片生成等

### 5.3 数据库设计

#### 新增迁移 — `supabase/migrations/00X_workflow_templates.sql`

```sql
-- 工作流模板表
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,         -- NULL = 官方预置模板
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'custom',              -- 'official' | 'custom' | 'shared'
  tags text[] DEFAULT '{}',
  thumbnail_url text,                          -- 模板预览图
  template_data jsonb NOT NULL,                -- { nodes, edges, metadata }
  node_count integer DEFAULT 0,
  is_public boolean DEFAULT false,             -- N6 分享用
  use_count integer DEFAULT 0,                 -- 使用次数统计
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS 策略
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- 用户只能管理自己的模板
CREATE POLICY "Users manage own templates"
  ON public.workflow_templates FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL OR is_public = true);

-- 索引
CREATE INDEX idx_templates_user ON public.workflow_templates(user_id);
CREATE INDEX idx_templates_category ON public.workflow_templates(category);
CREATE INDEX idx_templates_public ON public.workflow_templates(is_public) WHERE is_public = true;
```

### 5.4 模板数据格式

```typescript
interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'official' | 'custom' | 'shared'
  tags: string[]
  thumbnailUrl?: string
  nodeCount: number
  useCount: number
  createdAt: string
  updatedAt: string
}

interface WorkflowTemplateData {
  version: 1                       // 模板格式版本
  nodes: SerializedNode[]          // 节点（去除运行时状态）
  edges: SerializedEdge[]          // 连线
  metadata: {
    name: string
    description: string
    author?: string
    createdWith: string            // app version
    requiredNodeTypes: string[]    // 依赖的节点类型列表
  }
}

// 序列化节点：清除运行时数据，保留结构
interface SerializedNode {
  id: string
  type: CanvasNodeType
  position: { x: number; y: number }
  data: Record<string, unknown>    // 清除 imageUrl、videoUrl 等运行时数据
  width?: number
  height?: number
  parentId?: string
}
```

### 5.5 模板序列化/反序列化

```typescript
// src/features/canvas/application/templateSerializer.ts

function serializeCanvasToTemplate(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  metadata: { name: string; description: string }
): WorkflowTemplateData {
  // 1. 深拷贝节点
  // 2. 清除运行时数据（imageUrl, videoUrl, isGenerating, jobId 等）
  // 3. 保留结构性数据（prompt, model, size, gridRows 等）
  // 4. 重新生成 ID（避免与画布现有节点冲突）
  // 5. 生成元数据
}

function deserializeTemplateToCanvas(
  template: WorkflowTemplateData,
  offsetPosition?: { x: number; y: number }
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  // 1. 验证模板版本兼容性
  // 2. 重新生成所有节点/边 ID
  // 3. 修正 ID 引用（edges 的 source/target, group 的 parentId）
  // 4. 应用位置偏移
  // 5. 恢复默认运行时状态
}
```

### 5.6 API Routes

#### `GET /api/templates` — 模板列表

```typescript
// Query params: ?category=official|custom|shared
interface TemplateListResponse {
  templates: WorkflowTemplate[]
}
```

#### `POST /api/templates` — 保存模板

```typescript
interface CreateTemplateRequest {
  name: string
  description?: string
  tags?: string[]
  templateData: WorkflowTemplateData
}
```

#### `GET /api/templates/[id]` — 获取模板详情（含 templateData）

#### `DELETE /api/templates/[id]` — 删除用户模板

#### `POST /api/templates/[id]/use` — 使用模板（递增 use_count）

### 5.7 前端 UI — 模板库面板

在 Dashboard 新建项目流程中集成模板选择，同时在画布侧边栏提供"模板"按钮。

#### Dashboard 模板入口

```
┌─────────────────────────────────────────────────┐
│  我的项目                          [+ 新建项目]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ── 从模板开始 ──                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ 📝→🎬│ │ 🎥→📋│ │ 🖼→🖼│ │ + 导入│          │
│  │小说→ │ │视频→ │ │批量  │ │ JSON │          │
│  │分镜  │ │分镜  │ │生成  │ │      │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  ── 最近项目 ──                                 │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

#### 画布内"保存为模板"

侧边栏新增"模板"按钮，点击打开模板管理面板：
- "保存当前画布为模板"
- "从模板库加载"
- "导入 JSON"
- "导出当前画布为 JSON"

### 5.8 JSON 导入/导出

```typescript
// 导出
function exportTemplateAsJson(template: WorkflowTemplateData): void {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  // 使用 link.click() 下载
}

// 导入
function importTemplateFromJson(file: File): Promise<WorkflowTemplateData> {
  const text = await file.text()
  const data = JSON.parse(text)
  // 验证 schema（version, nodes, edges 必须存在）
  return data
}
```

### 5.9 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `supabase/migrations/00X_workflow_templates.sql` |
| 新增 | `src/features/canvas/application/templateSerializer.ts` |
| 新增 | `src/features/templates/TemplateLibrary.tsx` |
| 新增 | `src/features/templates/SaveTemplateDialog.tsx` |
| 新增 | `src/features/templates/TemplateCard.tsx` |
| 新增 | `src/app/api/templates/route.ts` |
| 新增 | `src/app/api/templates/[id]/route.ts` |
| 新增 | `src/app/api/templates/[id]/use/route.ts` |
| 修改 | `src/features/canvas/ui/CanvasSidebar.tsx` — 新增模板按钮 |
| 修改 | `src/app/(app)/dashboard/page.tsx` — 模板入口 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

## N6: 用户模板分享

### 6.1 需求概述

基于 N5 的模板系统，允许用户将自己的模板发布为"公开模板"，其他用户可以在模板库中浏览和使用社区分享的模板。

### 6.2 用户故事

1. 用户保存模板后，在"我的模板"中可点击"发布到社区"
2. 发布时需填写描述、标签，上传预览图
3. 其他用户在模板库"社区"标签页浏览公开模板
4. 按热度（使用次数）、最新、标签筛选
5. 点击"使用此模板" → 在新项目中加载

### 6.3 数据库扩展

复用 N5 的 `workflow_templates` 表，通过 `is_public` 和 `category = 'shared'` 字段区分：

```sql
-- 额外索引
CREATE INDEX idx_templates_shared_popular
  ON public.workflow_templates(use_count DESC)
  WHERE is_public = true AND category = 'shared';

-- 额外 RLS：所有人可读公开模板
CREATE POLICY "Anyone can read public templates"
  ON public.workflow_templates FOR SELECT
  USING (is_public = true OR user_id = auth.uid() OR user_id IS NULL);
```

### 6.4 API 扩展

#### `PATCH /api/templates/[id]/publish` — 发布模板

```typescript
interface PublishTemplateRequest {
  description?: string
  tags?: string[]
  thumbnailUrl?: string
}
// 设置 is_public = true, category = 'shared'
```

#### `PATCH /api/templates/[id]/unpublish` — 取消发布

#### `GET /api/templates?category=shared&sort=popular|newest&tag=xxx` — 社区浏览

### 6.5 前端 UI — 社区模板库

```
┌─────────────────────────────────────────────────┐
│  模板库                                         │
│  [官方] [● 社区] [我的]                          │
├─────────────────────────────────────────────────┤
│  排序: [热门 ▾]   标签: [分镜] [视频] [小说]...  │
│                                                 │
│  ┌──────────────┐ ┌──────────────┐              │
│  │ [预览图]     │ │ [预览图]     │              │
│  │ 小说转分镜流程│ │ 角色一致性   │              │
│  │ by UserA     │ │ by UserB     │              │
│  │ ⭐ 128次使用 │ │ ⭐ 85次使用  │              │
│  │ [使用模板]   │ │ [使用模板]   │              │
│  └──────────────┘ └──────────────┘              │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

### 6.6 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `src/features/templates/CommunityTemplates.tsx` |
| 新增 | `src/features/templates/PublishTemplateDialog.tsx` |
| 新增 | `src/app/api/templates/[id]/publish/route.ts` |
| 修改 | `src/features/templates/TemplateLibrary.tsx` — 新增社区标签页 |
| 修改 | `supabase/migrations/00X_workflow_templates.sql` — 补充索引 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

## N7: 智能分镜批量生成增强

### 7.1 需求概述

增强现有 `StoryboardGenNode`，支持首帧/末帧控制、多图参考输入、批量一键生成，对标 Tapnow v3.6 的分镜系统能力。

### 7.2 增强点详述

#### 7.2.1 首帧/末帧控制

在 `StoryboardGenFrameItem` 中增加帧控制：

```typescript
interface StoryboardGenFrameItem {
  id: string
  description: string
  referenceIndex: number | null

  // 新增：帧控制
  startFrameUrl?: string | null    // 首帧参考图
  endFrameUrl?: string | null      // 末帧参考图
  startFrameMode?: 'none' | 'reference' | 'strict'   // 首帧模式
  endFrameMode?: 'none' | 'reference' | 'strict'     // 末帧模式
}
```

UI 变化：每个分镜格子左下角和右下角增加小图标，点击可上传/选择首帧和末帧参考图。

#### 7.2.2 多图参考输入

当前 `StoryboardGenNode` 已支持 `referenceIndex`（单图参考），增强为多图参考：

```typescript
interface StoryboardGenFrameItem {
  // 现有
  referenceIndex: number | null

  // 新增：多图参考
  referenceImageUrls?: string[]     // 多张参考图 URL
  referenceWeights?: number[]       // 各参考图权重 0~1
}
```

UI 变化：参考图区域从单图变为可添加多张的图片列表，每张可设权重。

#### 7.2.3 批量一键生成

当前逐帧生成，新增批量模式：

```typescript
// 在 StoryboardGenNode 的生成逻辑中
async function batchGenerate(frames: StoryboardGenFrameItem[]) {
  // 1. 并行提交所有帧的生成 Job
  const jobs = await Promise.all(
    frames.map(frame => canvasAiGateway.submitGenerateImageJob({
      prompt: frame.description,
      model: nodeData.model,
      size: nodeData.size,
      aspectRatio: nodeData.requestAspectRatio,
      referenceImages: frame.referenceImageUrls,
      extraParams: {
        startFrame: frame.startFrameUrl,
        endFrame: frame.endFrameUrl,
        ...nodeData.extraParams
      }
    }))
  )
  // 2. 并行轮询所有 Job
  // 3. 结果逐帧回填到 grid
}
```

UI 变化：生成按钮旁增加"批量生成全部"按钮，带并行进度指示器。

### 7.3 UI 变化示意

```
┌─────────────────────────────────────────┐
│  [NodeHeader: 分镜生成]                  │
├─────────────────────────────────────────┤
│  3x3 Grid:                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ [首帧]  │ │         │ │         │  │
│  │ S1 描述 │ │ S2 描述 │ │ S3 描述 │  │
│  │ [末帧]  │ │ [ref×2] │ │         │  │
│  │ [🖼×2]  │ │ ■■□□ 50%│ │ [生成]  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│  ...                                    │
│                                         │
│  [单帧生成] [⚡ 批量生成全部 (9帧)]     │
│  批量进度: ████████░░ 6/9               │
└─────────────────────────────────────────┘
```

### 7.4 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 修改 | `src/features/canvas/domain/canvasNodes.ts` — 扩展 StoryboardGenFrameItem |
| 修改 | `src/features/canvas/nodes/StoryboardGenNode.tsx` — UI + 批量逻辑 |
| 新增 | `src/features/canvas/ui/FrameReferenceEditor.tsx` — 多图参考编辑器 |
| 新增 | `src/features/canvas/ui/FrameControlEditor.tsx` — 首末帧编辑器 |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

## N8: 多 API Key 轮转与智能管理

### 8.1 需求概述

允许同一 Provider 配置多个 API Key，请求时自动轮转使用，Key 额度耗尽或失效时自动切换到下一个，保障大批量生成任务不中断。

### 8.2 数据模型变更

#### 数据库 — `user_api_keys` 表扩展

```sql
-- 新增迁移
ALTER TABLE public.user_api_keys
  ADD COLUMN key_index integer DEFAULT 0,        -- 同 provider 的 key 序号
  ADD COLUMN status text DEFAULT 'active',       -- 'active' | 'exhausted' | 'invalid'
  ADD COLUMN last_error text,                    -- 最后一次错误信息
  ADD COLUMN last_used_at timestamptz,
  ADD COLUMN error_count integer DEFAULT 0;

-- 移除旧唯一约束，改为支持多 key
DROP INDEX IF EXISTS idx_user_api_keys_unique;
CREATE UNIQUE INDEX idx_user_api_keys_multi
  ON public.user_api_keys(user_id, provider, key_index);
```

#### 前端 Store — `settingsStore.ts`

```typescript
// 从单 key 改为 key 数组
type ProviderApiKeys = Record<string, string[]>    // provider → key[]

// 新增轮转状态
interface KeyRotationState {
  currentIndex: Record<string, number>             // provider → 当前使用的 key index
  blacklist: Record<string, Set<number>>           // provider → 被黑名单的 key index 集合
}
```

### 8.3 Key 轮转算法

```typescript
// src/server/ai/keyRotation.ts

class ApiKeyRotator {
  // Round-Robin 轮转，跳过黑名单 key
  getNextKey(provider: string, userId: string): { key: string; index: number }

  // 标记 key 异常
  reportError(provider: string, userId: string, keyIndex: number, error: ApiKeyError): void

  // 错误分类
  classifyError(statusCode: number, errorBody: string): ApiKeyErrorType
}

type ApiKeyErrorType =
  | 'rate_limited'     // 429 — 暂时跳过，稍后恢复
  | 'quota_exhausted'  // 402/1006 — 加入黑名单
  | 'invalid'          // 401/403 — 永久黑名单
  | 'server_error'     // 5xx — 暂时跳过
  | 'unknown'          // 其他 — 计数，3次后黑名单
```

**轮转策略**：
1. **Round-Robin**：每次请求使用下一个 key
2. **Rate Limit 退避**：429 错误的 key 暂停 60 秒
3. **额度耗尽**：402/1006 的 key 加入黑名单，直到用户手动恢复
4. **无效 Key**：401/403 永久标记为 invalid
5. **3-Strike**：未知错误连续 3 次后黑名单
6. **全部不可用时**：返回明确错误信息，引导用户检查 key 配置

### 8.4 前端 UI 变更

#### 设置页 API Key 管理

```
┌──────────────────────────────────────────┐
│  API Keys — KIE                          │
├──────────────────────────────────────────┤
│  Key 1: sk-xxxx...xxxx  ✅ 活跃  [🗑]   │
│  Key 2: sk-yyyy...yyyy  ⚠️ 限速  [🗑]   │
│  Key 3: sk-zzzz...zzzz  ❌ 耗尽  [🔄🗑] │
│                                          │
│  [+ 添加新 Key]                          │
│                                          │
│  轮转策略: [Round-Robin ▾]              │
│  自动恢复: [60秒后重试限速Key]           │
└──────────────────────────────────────────┘
```

### 8.5 后端集成

在 `src/app/api/ai/image/generate/route.ts` 和 `src/app/api/ai/video/generate/route.ts` 中，将当前的单 key 获取逻辑替换为 `ApiKeyRotator.getNextKey()`。

生成失败时调用 `ApiKeyRotator.reportError()` 标记 key 状态。

### 8.6 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 新增 | `supabase/migrations/00X_api_keys_multi.sql` |
| 新增 | `src/server/ai/keyRotation.ts` |
| 修改 | `src/stores/settingsStore.ts` — ProviderApiKeys 改为数组 |
| 修改 | `src/app/api/settings/api-keys/route.ts` — 支持多 key CRUD |
| 修改 | `src/app/api/ai/image/generate/route.ts` — 集成轮转 |
| 修改 | `src/app/api/ai/video/generate/route.ts` — 集成轮转 |
| 修改 | `src/features/settings/SettingsDialog.tsx` — 多 key UI |
| 修改 | `src/i18n/locales/zh.json` + `en.json` |

---

# 数据库迁移汇总

| 迁移文件 | 功能 | Wave |
|---------|------|------|
| `00X_workflow_templates.sql` | 工作流模板表 + 社区分享索引 | N5 + N6 |
| `00X_api_keys_multi.sql` | API Key 多 key 支持扩展 | N8 |

---

# 验证计划

### Wave 0 验证

| 需求 | 验证方式 |
|------|---------|
| N1 视频分析 | 上传 30s 测试视频 → 验证场景检测数量合理 → 关键帧可查看 → 导出到画布 |
| N2 反向提示词 | 上传风格明确的图片 → 生成提示词 → 用该提示词生图 → 对比相似度 |
| N3 镜头分析 | 提供不同镜头类型图片 → 验证分析结果专业性 → 中英文输出正确 |

### Wave 1 验证

| 需求 | 验证方式 |
|------|---------|
| N4 小说输入 | 粘贴 5000 字小说 → 场景拆分合理 → 角色提取正确 → 批量生成分镜可用 |
| N5 模板系统 | 创建复杂画布 → 保存模板 → 新项目加载 → 结构完整 → JSON 导入/导出 |
| N6 模板分享 | 发布模板 → 其他账号可见 → 使用模板 → use_count 递增 |
| N7 分镜增强 | 设置首末帧 → 多图参考 → 批量生成 → 进度准确 → 结果回填正确 |
| N8 Key 轮转 | 配置 3 个 key → 模拟 key 1 耗尽 → 自动切换 key 2 → UI 状态正确 |

### 通用检查

- `npx tsc --noEmit` 类型检查通过
- `npx vitest run` 单元测试通过
- `npm run build` 构建通过
- 中英文切换无 key 泄露
- CI/CD 无错误
