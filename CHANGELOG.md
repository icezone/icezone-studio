# Changelog / 更新日志

**[English](#changelog)** | **[中文](#更新日志)**

---

<a id="changelog"></a>

## Changelog

All notable changes to IceZone Studio will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

### [Unreleased]

### [0.6.0] - 2026-04-15

#### Added
- **Vercel CI/CD pipeline** — GitHub Actions now auto-deploys on every push to `main` (production) and on every PR (preview URL commented on PR)
- **Preview deployment job** (`deploy-preview`) — builds and deploys a Vercel preview on PRs, posts the URL as a PR comment
- **Production deployment job** (`deploy-production`) — builds and deploys to Vercel production after all checks pass on `main`

#### Changed
- `vercel.json` — reduced to single region (`sin1`) for free-tier compatibility (removed `sfo1`)

### [0.5.0] - 2026-04-15

#### Added
- **ModelMarquee** — frosted-glass ticker strip with AI model logos (Nano Banana, Sora, Kling, Grok, Veo, ElevenLabs, Seed); infinite-scroll marquee with white-filtered SVG logos and model names; positioned between VideoHero and LiveCanvasShowcase
- **WhyIceZone** — 3-column feature cards section with SVG icons (gradient blue→violet), glassmorphism cards with hover effects; 4-column image wall background with `rotateX` lean-back effect and scroll-driven parallax
- **SceneShowcase** — vidu-style frameless video carousel (ads/anime/film/content/photo); autoplay, muted, no controls; 5s auto-advance with tab labels; video reflection effect; left/right edge shade gradients
- **TemplateShowcase** — scattered absolute-positioned template cards on desktop (grid on mobile); full-screen template browser modal with category filtering; navigates to `/login?template=<id>` on template selection
- **StartCreating** — immersive CTA section with animated gradient background, 6 floating gallery images with per-card tilt angles and staggered `float-card` animation, gradient CTA buttons
- New CSS keyframes: `@keyframes marquee-x` and `@keyframes float-card` in `globals.css`
- New i18n keys: `landing.models.*`, `landing.why.*`, `landing.scenes.*`, `landing.templates.*` (including modal), `landing.startCreating.*` in both `zh.json` and `en.json`

#### Changed
- **Landing page order**: `VideoHero → ModelMarquee → LiveCanvasShowcase → WhyIceZone → SceneShowcase → TemplateShowcase → StartCreating → LandingFooter`
- **Nav "Start Free" button** — replaced amber with blue→violet gradient, matching CTA buttons below
- **Hero "Start Creating Free" button** — replaced amber with blue→violet gradient
- **"Studio" in logo** — replaced amber text with blue→violet gradient text
- Archived `FeatureShowcase.tsx` and `CallToAction.tsx` to `src/components/landing/_archive/`

#### Fixed
- `WhyIceZone` had `* { animation: none !important }` in a `<style jsx>` block that intermittently killed all animations on the page — removed
- `StartCreating` floating images missing `will-change: transform` and `position: relative` on animated container — fixed
- Next.js Image warnings: `fill` images in `StartCreating` now have a `position: relative` parent; `LOGO.png` now includes `style={{ height: 'auto' }}`

### [0.4.0] - 2026-04-12

#### Added
- Database security infrastructure with RLS validation and deployment tools
- Automated migration validation in CI/CD pipeline to enforce RLS policies
- Comprehensive RLS documentation with 6 common access patterns
- Migration template with RLS boilerplate for future database changes
- **Canvas Light/Dark Theme System** — 15 CSS design tokens (`--canvas-*`) for node backgrounds, borders, shadows, headers, and overlays; all 35+ canvas components migrated from hardcoded `rgba()` values to CSS custom properties

#### Fixed
- Critical security vulnerability: enabled Row-Level Security on plans table
- Added performance indexes on user_id columns for RLS policy optimization
- **Canvas edge delete button** — delete button now renders above SVG edge path with proper z-index and circular background, making it reliably clickable
- **Node price badge removed** — removed `NodePriceBadge` from ImageEditNode and StoryboardGenNode headers
- **Storyboard grid fills panel** — frame grid now uses `1fr` columns and rows filling the full node width/height; no more blank margins in 2-column layout
- **Storyboard textarea theme color** — cell background uses `var(--canvas-node-section-bg)` and border uses `var(--canvas-node-border)` for correct light/dark appearance
- **Unified initial node sizes** — AI image (imageEdit) and AI video (videoGen) both default to 560×560; VideoAnalysis and NovelInput both default to 560×420

#### Changed
- Canvas nodes and UI components now respond instantly to global theme switching (`data-theme="light"` / `data-theme="dark"`) without page refresh

### [0.3.0] - 2026-04-05

#### Added
- Renamed project to **IceZone Studio** with new branding across all pages
- **Video Analysis** — Upload video, auto-detect scenes, extract keyframes
- **Reverse Prompt** — Upload image, AI generates the prompt to recreate it (Gemini Vision)
- **Shot Analysis** — Professional camera angle, lighting, composition, and mood analysis
- **Novel/Script Splitting** — Paste text, AI splits into scenes with character extraction
- **Template System** — 3 official templates + user custom templates + community sharing
- **Batch Storyboard Generation** — Generate all storyboard frames at once
- **Multi API Key Rotation** — Add multiple keys per provider with automatic failover
- Comprehensive E2E test coverage for all major features

#### Fixed
- Template save button and error handling
- E2E test selectors matching actual UI components
- Landing page branding updated to IceZone Studio

#### Changed
- Project documentation fully updated with current feature inventory

### [0.2.0] - 2026-04-04

#### Added
- Canvas sidebar with node menu, layers, history, and zoom controls
- Dark mode support with theme-aware interface
- Node visual refinements and interaction improvements
- Project name display in canvas header
- Real-time save status indicators

#### Fixed
- Project name occasionally lost during auto-save
- Multiple project cards causing display issues

### [0.1.0] - 2026-04-03

#### Added
- **Interactive Node Canvas** — Drag-and-drop workspace with zoom, pan, multi-select, and grouping
- **11 Node Types** — Upload, AI Image, Export, Text Annotation, Group, Storyboard, Storyboard Gen, AI Video, Video Result, Novel Input, Video Analysis
- **7 AI Image Models** across 4 providers (KIE, FAL, GRSAI, PPIO)
- **5 AI Video Models** across 3 providers (Kling 3.0, Sora2, VEO 3)
- **Built-in Tools** — Crop, Annotate, Storyboard Split
- **User Authentication** — Email and Google sign-in via Supabase
- **Project Dashboard** — Create, rename, delete, and manage projects
- **Auto-Save** — Dual-write to cloud and local storage with conflict detection
- **BYOK API Key Management** — Encrypted storage for 6 AI providers
- **23+ API Endpoints** — AI generation, image processing, projects, templates, settings
- **Bilingual Interface** — Full Chinese and English support
- **CI/CD Pipeline** — Automated testing and deployment via GitHub Actions

#### Fixed
- Canvas initialization and provider wrapping
- Authentication flow and middleware routing
- Dashboard display timing issues

#### Maintenance Guidelines

When updating this project, add entries under `[Unreleased]`:
- **Added** — New features
- **Changed** — Changes to existing features
- **Fixed** — Bug fixes
- **Removed** — Removed features
- **Security** — Security-related changes

Move entries to a versioned section when releasing a new version.

---

<a id="更新日志"></a>

## 更新日志

IceZone Studio 的所有重要变更都记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

### [未发布]

### [0.4.0] - 2026-04-12

#### 新增
- 数据库安全基础设施，包含 RLS 验证和部署工具
- CI/CD 中的自动迁移验证，强制执行 RLS 策略
- 完整的 RLS 文档，包含 6 种常见访问模式
- 带有 RLS 样板代码的迁移模板，用于未来的数据库变更
- **Canvas 明暗主题系统** — 新增 15 个 `--canvas-*` CSS 设计 token（节点背景、边框、阴影、头部、遮罩等），35+ 个 canvas 组件从硬编码 `rgba()` 颜色迁移至 CSS 自定义属性

#### 修复
- 关键安全漏洞：在 plans 表上启用行级安全（Row-Level Security）
- 在 user_id 列上添加性能索引，优化 RLS 策略执行
- **连线删除按钮** — 删除按钮现在正确显示在 SVG 边之上，添加圆形背景和 z-index，点击可靠生效
- **移除节点价格标注** — 从 AI 图片节点和分镜生成节点头部移除 `NodePriceBadge`
- **分镜网格填满面板** — 帧网格改用 `1fr` 列宽和行高，填满节点完整宽高，2列布局不再留白
- **分镜 textarea 主题颜色** — 格子背景改用 `var(--canvas-node-section-bg)`，边框改用 `var(--canvas-node-border)`，亮色/暗色主题下均正确显示
- **统一节点初始尺寸** — AI 图片（imageEdit）与 AI 视频（videoGen）均默认 560×560；视频分析与剧本输入均默认 560×420

#### 变更
- Canvas 节点及 UI 组件现在可即时响应全局主题切换（`data-theme="light"` / `data-theme="dark"`），无需刷新页面

### [0.3.0] - 2026-04-05

#### 新增
- 项目更名为 **IceZone Studio**，全站品牌更新
- **视频分析** — 上传视频，自动检测场景，提取关键帧
- **反向提示词** — 上传图片，AI 生成能重现该图片的提示词（Gemini Vision）
- **镜头分析** — 专业的景别、运镜、灯光、构图和氛围分析
- **小说/剧本拆分** — 粘贴文本，AI 拆分为场景并提取角色
- **模板系统** — 3 个官方模板 + 用户自定义模板 + 社区分享
- **分镜批量生成** — 一次性生成所有分镜画面
- **多密钥轮换** — 每个供应商可添加多个密钥，自动故障转移
- 所有主要功能的 E2E 测试覆盖

#### 修复
- 模板保存按钮及错误处理
- E2E 测试选择器与实际 UI 组件匹配
- 落地页品牌更新为 IceZone Studio

#### 变更
- 项目文档全面更新，反映当前功能清单

### [0.2.0] - 2026-04-04

#### 新增
- 画布侧边栏，含节点菜单、图层、历史记录和缩放控制
- 暗色模式支持，主题自适应界面
- 节点视觉优化与交互改进
- 画布顶部显示项目名称
- 实时保存状态指示器

#### 修复
- 自动保存时偶尔丢失项目名称
- 多个项目卡片导致的显示问题

### [0.1.0] - 2026-04-03

#### 新增
- **交互式节点画布** — 拖拽式工作区，支持缩放、平移、多选和编组
- **11 种节点类型** — 上传、AI 图片、导出、文字标注、编组、分镜、分镜生成、AI 视频、视频结果、小说输入、视频分析
- **7 个 AI 图片模型**，来自 4 个供应商（KIE、FAL、GRSAI、PPIO）
- **5 个 AI 视频模型**，来自 3 个供应商（Kling 3.0、Sora2、VEO 3）
- **内置工具** — 裁剪、标注、分镜分割
- **用户认证** — 邮箱和 Google 登录（Supabase）
- **项目控制台** — 创建、重命名、删除和管理项目
- **自动保存** — 云端和本地双写存储，冲突检测
- **BYOK 密钥管理** — 6 个 AI 供应商的加密密钥存储
- **23+ API 接口** — AI 生成、图片处理、项目、模板、设置
- **双语界面** — 完整的中文和英文支持
- **CI/CD 流水线** — GitHub Actions 自动测试和部署

#### 修复
- 画布初始化与 Provider 包装
- 认证流程和中间件路由
- 控制台显示时序问题

#### 维护指南

更新项目时，在 `[未发布]` 下添加条目：
- **新增** — 新功能
- **变更** — 现有功能的变更
- **修复** — Bug 修复
- **移除** — 移除的功能
- **安全** — 安全相关变更

发布新版本时，将条目从 `[未发布]` 移至带版本号的区块。

---

<div align="center">
  <sub>IceZone Studio &copy; 2026</sub>
</div>
