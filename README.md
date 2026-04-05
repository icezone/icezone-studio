<div align="center">

# IceZone Studio

### AI Creative Studio / AI 创意工作室

[![CI](https://github.com/icezone/icezone-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/icezone/icezone-studio/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[English](#english)** | **[中文](#中文)**

[Live Demo](https://icezone.studio) · [Changelog](CHANGELOG.md)

</div>

---

<a id="english"></a>

## English

> Your all-in-one AI creative workspace for image generation, video production, and storyboard design.

### What is IceZone Studio?

IceZone Studio is a **node-based AI creative platform** where you can visually connect different creative tasks — from uploading images, generating AI art, producing videos, to building complete storyboards — all in one interactive canvas.

Think of it as a visual creative workbench: each task is a "node" on the canvas, and you connect them together to build your creative pipeline. No coding required. Just drag, drop, connect, and create.

### Who is it for?

- **Content Creators** — Generate and edit AI images, produce short videos, batch-create social media content
- **Filmmakers & Animators** — Break down scripts into storyboards, analyze video shots, extract keyframes
- **Writers & Storytellers** — Convert novels and scripts into visual storyboard sequences automatically
- **Designers** — Crop, annotate, and process images with built-in tools, then feed them into AI generation
- **Teams** — Share workflow templates with the community, collaborate on projects with real-time sync

### Key Features

#### Canvas Workspace

The heart of IceZone Studio is the **interactive node canvas**. Everything you do happens on a flexible, zoomable workspace where you can:

- **Drag & drop** nodes to build creative workflows
- **Connect nodes** to pass images, prompts, and results between steps
- **Multi-select & group** nodes to organize complex projects
- **Undo/redo** any action with full history tracking
- **Auto-save** — your work is always safe, even if you close the browser

#### AI Image Generation

Create stunning images with **7 AI models** from 4 providers:

- Choose your preferred model and provider
- Set aspect ratio, quality, and style parameters
- Use reference images to guide generation
- View results instantly on the canvas
- Supports both **Standard** and **Professional** modes

#### AI Video Generation

Turn text descriptions or images into videos with **5 video models** from 3 providers:

- **Text-to-Video** — Describe a scene and watch it come to life
- **Image-to-Video** — Animate a still image into a video clip
- Duration options from **3 seconds to 15 seconds**
- Multi-shot support for complex sequences
- Audio generation support (select models)

#### AI Analysis Suite

Let AI understand your creative content:

| Feature | What it does |
|---------|-------------|
| **Video Analysis** | Upload a video → automatically detect scenes and extract keyframes |
| **Reverse Prompt** | Upload an image → AI generates the prompt that could recreate it |
| **Shot Analysis** | Upload a frame → get professional analysis of camera angle, lighting, composition, and mood |
| **Novel Splitting** | Paste a story → AI splits it into scenes with character extraction, ready for storyboarding |

#### Storyboard Creation

Build professional storyboards with ease:

- **Grid Layout** — Configure rows, columns, and aspect ratios
- **Batch Generation** — Generate all frames at once with AI
- **Novel-to-Storyboard** — Paste your script, AI splits it into scenes, then batch-generate storyboard frames
- **Video-to-Storyboard** — Extract keyframes from existing video and rebuild storyboards
- **Export** — Download individual frames or complete storyboard sheets

#### Built-in Image Tools

Process your images without leaving the canvas:

- **Crop** — Precisely trim images to any size
- **Annotate** — Add text, markers, and highlights
- **Split** — Divide storyboard sheets into individual frames

#### Template System

Don't start from scratch — use templates:

- **3 official templates**: Novel-to-Storyboard, Video Rebuild, Batch Image Generation
- **Save your own** workflows as reusable templates
- **Share with the community** — publish templates for others to discover and use
- **Import/Export** — share templates as JSON files

#### Bring Your Own Key (BYOK)

Use your own API keys for maximum flexibility:

- Support for **6 providers**: KIE, PPIO, GRSAI, FAL, OpenAI, Anthropic
- Keys are **AES-256-GCM encrypted** — we never see your raw keys
- Add **multiple keys per provider** with automatic rotation
- Automatic failover when a key hits rate limits

#### Multi-Language Support

- Full **Chinese** and **English** interface
- Switch languages anytime from settings
- All UI elements, tooltips, and messages are localized

### Workflow Examples

#### From Novel to Storyboard

```
Novel Input → AI Scene Splitting → Storyboard Gen (Batch) → Export
```

1. Paste your novel or script text into a **Novel Input** node
2. Click **Smart Split** — AI breaks it into scenes with character descriptions
3. Select scenes and click **Batch Generate Storyboards**
4. AI generates visual frames for each scene
5. Export the complete storyboard

#### Video Analysis & Rebuild

```
Video Analysis → Keyframe Extraction → AI Image Enhancement → Storyboard Export
```

1. Upload a video to a **Video Analysis** node
2. AI detects scenes and extracts keyframes
3. Export keyframes to the canvas as individual images
4. Use **Reverse Prompt** or **Shot Analysis** to understand each frame
5. Regenerate or enhance frames with AI

#### Batch Image Generation

```
AI Image Node × N → Group → Export
```

1. Add multiple **AI Image** nodes with different prompts
2. Connect reference images for style consistency
3. Generate all images in batch
4. Group results and export

### Getting Started

1. Visit [icezone.studio](https://icezone.studio)
2. Create an account (Email or Google sign-in)
3. Go to **Settings → API Keys** and add your provider keys
4. Click **New Project** from the dashboard
5. Double-click the canvas or use the left toolbar to add nodes — start creating!

### Self-Hosting

```bash
git clone https://github.com/icezone/icezone-studio.git
cd icezone-studio
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Requires: Node.js >= 18, npm >= 9, and a [Supabase](https://supabase.com) project.

### Tech Overview

Built with Next.js 15, React 19, TypeScript, Zustand, @xyflow/react, TailwindCSS 4, and Supabase. Full CI/CD with GitHub Actions. See [AGENTS.md](AGENTS.md) for architecture details.

### Contributing

We welcome contributions! Please follow the TDD workflow (write tests first), use conventional commits, and ensure all checks pass before submitting a PR.

### License

MIT License — see [LICENSE](LICENSE) for details.

---

<a id="中文"></a>

## 中文

> 集 AI 图片生成、视频制作、分镜设计于一体的全能创意工作平台。

### IceZone Studio 是什么？

IceZone Studio 是一个**基于节点画布的 AI 创作平台**，你可以在交互式画布上，通过连接不同的创作节点，完成从图片上传、AI 生图、视频制作到分镜设计的完整创意工作流。

把它想象成一个可视化的创意工作台：每个任务都是画布上的一个"节点"，你把它们连接起来就能搭建自己的创作流水线。无需编程，拖拽、连接、创作，就是这么简单。

### 适合谁用？

- **内容创作者** — AI 生成和编辑图片、制作短视频、批量创建社交媒体素材
- **影视工作者** — 将剧本拆解为分镜、分析镜头画面、提取视频关键帧
- **作家与编剧** — 将小说和剧本自动转化为可视化分镜序列
- **设计师** — 使用内置工具裁剪、标注、处理图片，再接入 AI 生成
- **团队协作** — 分享工作流模板到社区，项目实时同步协作

### 核心功能

#### 画布工作区

IceZone Studio 的核心是**交互式节点画布**。所有操作都在一个灵活、可缩放的工作区中完成：

- **拖拽放置** 节点，构建创意工作流
- **连接节点**，在步骤之间传递图片、提示词和结果
- **多选与编组**，组织复杂项目
- **撤销/重做**，完整的操作历史
- **自动保存** — 你的工作始终安全，即使关闭浏览器

#### AI 图片生成

使用来自 4 个供应商的 **7 个 AI 模型**创作精彩图片：

- 选择你喜欢的模型和供应商
- 设置宽高比、质量和风格参数
- 使用参考图引导生成方向
- 在画布上即时查看结果
- 支持**标准**和**专业**两种模式

#### AI 视频生成

用文字描述或图片生成视频，来自 3 个供应商的 **5 个视频模型**：

- **文字生视频** — 描述一个场景，观看它变成现实
- **图片生视频** — 将静态图片转化为视频片段
- 时长选项从 **3 秒到 15 秒**
- 支持多镜头组合
- 部分模型支持音频生成

#### AI 分析套件

让 AI 理解你的创作内容：

| 功能 | 说明 |
|------|------|
| **视频分析** | 上传视频 → 自动检测场景并提取关键帧 |
| **反向提示词** | 上传图片 → AI 生成能重现该图片的提示词 |
| **镜头分析** | 上传画面 → 获取专业的景别、运镜、灯光、构图和氛围分析 |
| **小说拆分** | 粘贴故事文本 → AI 拆分为场景并提取角色，可直接生成分镜 |

#### 分镜创建

轻松制作专业分镜：

- **网格布局** — 配置行数、列数和宽高比
- **批量生成** — 一次性用 AI 生成所有画面
- **小说转分镜** — 粘贴剧本，AI 拆分场景，然后批量生成分镜画面
- **视频转分镜** — 从现有视频提取关键帧重建分镜
- **导出** — 下载单帧或完整分镜表

#### 内置图片工具

无需离开画布即可处理图片：

- **裁剪** — 精确裁切到任意尺寸
- **标注** — 添加文字、标记和高亮
- **分割** — 将分镜表拆分为独立画面

#### 模板系统

不必从零开始 — 使用模板：

- **3 个官方模板**：小说转分镜、视频重建、批量图片生成
- **保存自己的** 工作流为可复用模板
- **分享到社区** — 发布模板让其他人发现和使用
- **导入/导出** — 以 JSON 文件分享模板

#### 自带密钥 (BYOK)

使用自己的 API 密钥，获得最大灵活性：

- 支持 **6 个供应商**：KIE、PPIO、GRSAI、FAL、OpenAI、Anthropic
- 密钥采用 **AES-256-GCM 加密存储** — 我们永远看不到你的原始密钥
- 每个供应商可添加**多个密钥**，自动轮换
- 密钥触及限额时自动故障转移

#### 多语言支持

- 完整的**中文**和**英文**界面
- 随时在设置中切换语言
- 所有界面元素、提示和消息均已本地化

### 工作流示例

#### 从小说到分镜

```
小说输入 → AI 场景拆分 → 分镜批量生成 → 导出
```

1. 将小说或剧本文本粘贴到**小说输入**节点
2. 点击**智能拆分** — AI 将文本分解为场景并描述角色
3. 选择场景，点击**批量生成分镜**
4. AI 为每个场景生成视觉画面
5. 导出完整的分镜

#### 视频分析与重建

```
视频分析 → 关键帧提取 → AI 图片增强 → 分镜导出
```

1. 将视频上传到**视频分析**节点
2. AI 检测场景并提取关键帧
3. 将关键帧导出到画布作为独立图片
4. 使用**反向提示词**或**镜头分析**理解每一帧
5. 用 AI 重新生成或增强画面

#### 批量图片生成

```
AI 图片节点 × N → 编组 → 导出
```

1. 添加多个**AI 图片**节点，填入不同提示词
2. 连接参考图确保风格一致性
3. 批量生成所有图片
4. 编组结果并导出

### 快速开始

1. 访问 [icezone.studio](https://icezone.studio)
2. 注册账号（邮箱或 Google 登录）
3. 前往 **设置 → API Keys**，添加你的供应商密钥
4. 在控制台点击**新建项目**
5. 双击画布或使用左侧工具栏添加节点 — 开始创作！

### 本地部署

```bash
git clone https://github.com/icezone/icezone-studio.git
cd icezone-studio
npm install
cp .env.example .env.local
# 在 .env.local 中填入你的 Supabase 凭据
npm run dev
```

需要：Node.js >= 18、npm >= 9，以及一个 [Supabase](https://supabase.com) 项目。

### 技术概览

基于 Next.js 15、React 19、TypeScript、Zustand、@xyflow/react、TailwindCSS 4 和 Supabase 构建。完整的 GitHub Actions CI/CD。详见 [AGENTS.md](AGENTS.md) 了解架构细节。

### 参与贡献

欢迎贡献代码！请遵循 TDD 工作流（先写测试）、使用约定式提交、确保所有检查通过后再提交 PR。

### 许可证

MIT 许可证 — 详见 [LICENSE](LICENSE)。

---

<div align="center">
  <sub>IceZone Studio &copy; 2026</sub>
</div>
