# Changelog / 更新日志

**[English](#changelog)** | **[中文](#更新日志)**

---

<a id="changelog"></a>

## Changelog

All notable changes to IceZone Studio will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

### [Unreleased]

### [0.7.0] - 2026-04-19

#### Added
- **Preset Prompts** — New settings section to create, tag, and manage reusable prompt snippets; BookmarkIcon picker button integrated into VideoGen, ImageEdit, NovelInput, StoryboardNode frame cards, and StoryboardGenNode; inserts at cursor position
- **Template Cover Image** — Auto-selects first canvas image (imageNode + uploadNode) as default cover; click to upload a custom cover via `POST /api/templates/upload-cover` backed by Supabase Storage (bucket auto-created with service role key)
- **Template Update Flow** — Per-card "Update" (pencil) button in My Templates tab opens SaveTemplateDialog pre-filled with existing template data; `PATCH /api/templates/[id]` endpoint for sparse updates
- **Publish to Community Toggle** — SaveTemplateDialog now has a "Publish to Community" checkbox; sets `is_public` and `category=shared` on save
- **Custom Delete Confirmation** — Replaces browser `window.confirm()` with an in-app modal dialog (red trash icon, Cancel / Delete buttons)
- **Cover Image Required Validation** — Save is blocked and an error message shown if no cover image is selected

#### Changed
- **My Templates tab** — Now returns all templates owned by the user regardless of `is_public` / category, so published templates remain visible and deletable in the tab
- **TemplateCard button order** — Publish/Unpublish → Update → Delete (left to right)
- **SaveTemplateDialog cover preview** — Height increased from `h-28` to `h-48` for better image visibility
- **Overwrite mode removed from new-template flow** — Overwrite dropdown replaced by the Update button on existing cards

#### Fixed
- **VideoGenNode preset picker** — Clicking a preset collapsed the description panel; fixed by adding `stopPropagation` on both `mousedown` and `click` on the picker popover
- **Template loading crash** — `Cannot read properties of undefined (reading 'nodes')` caused by accessing camelCase `templateData` instead of snake_case `template_data` returned by Supabase
- **Template overwrite dropdown dark mode** — Native `<select>` options unstyled in dark mode; replaced with custom `UiSelect` component
- **Cover upload "Bucket not found"** — Upload route now uses Supabase service role admin client to auto-create the `template-covers` bucket; real error messages surfaced to the UI instead of a generic string
- **VideoGenNode content clipping** — Start frame, end frame, and dropdown menus clipped by `overflow-hidden`; root div changed to `overflow: visible` with `minHeight` so all sections render fully

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

### [0.7.0] - 2026-04-19

#### 新增
- **预设提示词** — 设置页面新增预设提示词管理区，可创建、添加标签和管理可复用的提示词片段；VideoGen、ImageEdit、NovelInput、分镜节点帧卡片及分镜生成节点均集成书签图标选取按钮，插入至光标位置
- **模板封面图片** — 自动选取画布中第一张图片（imageNode + uploadNode）作为默认封面；点击可上传自定义封面，通过 `POST /api/templates/upload-cover` 存储至 Supabase Storage（使用 service role 密钥自动创建 bucket）
- **模板更新流程** — "我的模板" tab 中每个模板卡片新增"更新"（铅笔）按钮，点击打开预填充现有数据的保存对话框；新增 `PATCH /api/templates/[id]` 端点支持稀疏更新
- **发布到社区开关** — 保存模板对话框新增"发布到社区"勾选框，保存时设置 `is_public` 并将 `category` 标记为 `shared`
- **自定义删除确认弹窗** — 替换浏览器原生 `window.confirm()`，改为应用内自定义弹窗（红色垃圾桶图标，取消 / 删除按钮）
- **封面图片必填校验** — 未选择封面时阻止保存并显示错误提示

#### 变更
- **我的模板 tab** — 现返回用户所有模板，不再按 `is_public` / category 过滤，已发布模板在该 tab 中仍可见且可删除
- **模板卡片按钮顺序** — 发布/取消发布 → 更新 → 删除（从左至右）
- **保存模板封面预览** — 高度从 `h-28` 增至 `h-48`，图片显示更完整
- **新建模板移除覆盖模式** — 覆盖下拉选择改为在现有卡片上点击"更新"按钮操作

#### 修复
- **AI 视频节点预设选取器** — 选取预设提示词后描述面板自动收起；在弹出层容器上同时添加 `mousedown` 和 `click` 的 `stopPropagation` 修复
- **使用模板时 runtime 崩溃** — `Cannot read properties of undefined (reading 'nodes')`，原因是访问 camelCase `templateData` 而 Supabase 返回 snake_case `template_data`
- **覆盖模板下拉暗色模式样式** — 原生 `<select>` 在暗色模式下 option 颜色异常，替换为自定义 `UiSelect` 组件
- **封面上传 "Bucket not found"** — 上传路由改用 Supabase service role admin client 自动创建 `template-covers` bucket；实际错误信息透传至前端
- **AI 视频节点内容被裁剪** — 起始帧、结束帧及下拉菜单被 `overflow-hidden` 遮挡；根 div 改为 `overflow: visible` + `minHeight`，所有组件完整显示

### [0.6.0] - 2026-04-15

#### 新增
- **Vercel CI/CD 流水线** — GitHub Actions 在每次推送到 `main`（生产环境）和每个 PR 时自动部署
- **预览部署任务**（`deploy-preview`）— 在 PR 上构建并部署 Vercel 预览，将 URL 作为 PR 评论发布
- **生产部署任务**（`deploy-production`）— 在 `main` 上所有检查通过后构建并部署到 Vercel 生产环境

#### 变更
- `vercel.json` — 简化为单区域（`sin1`）以兼容免费套餐（移除 `sfo1`）

### [0.5.0] - 2026-04-15

#### 新增
- **ModelMarquee** — 磨砂玻璃风格 AI 模型 logo 滚动条（Nano Banana、Sora、Kling、Grok、Veo、ElevenLabs、Seed）；无限循环 marquee，白色滤镜 SVG logo；位于 VideoHero 和 LiveCanvasShowcase 之间
- **WhyIceZone** — 3 列功能卡片区（蓝→紫渐变 SVG 图标，玻璃拟态卡片悬停效果）；4 列图片墙背景，`rotateX` 后仰效果和滚动视差
- **SceneShowcase** — vidu 风格无边框视频轮播（广告/动漫/电影/内容/摄影）；自动播放，静音，无控件；5 秒自动切换，Tab 标签；视频倒影效果；左右边缘渐变遮罩
- **TemplateShowcase** — 桌面端散乱绝对定位模板卡片（移动端网格）；全屏模板浏览弹窗，分类筛选；选中模板跳转 `/login?template=<id>`
- **StartCreating** — 沉浸式 CTA 区，动态渐变背景，6 张浮动画廊图片（独立倾斜角度和交错 `float-card` 动画），渐变 CTA 按钮
- `globals.css` 新增 `@keyframes marquee-x` 和 `@keyframes float-card`
- zh.json 和 en.json 新增 `landing.models.*`、`landing.why.*`、`landing.scenes.*`、`landing.templates.*`（含弹窗）、`landing.startCreating.*` 国际化键

#### 变更
- **落地页顺序**：`VideoHero → ModelMarquee → LiveCanvasShowcase → WhyIceZone → SceneShowcase → TemplateShowcase → StartCreating → LandingFooter`
- **导航"免费开始"按钮** — 琥珀色改为蓝→紫渐变，与下方 CTA 按钮一致
- **Hero "立即免费创作"按钮** — 琥珀色改为蓝→紫渐变
- **Logo 中的"Studio"** — 琥珀色文字改为蓝→紫渐变文字
- `FeatureShowcase.tsx` 和 `CallToAction.tsx` 归档至 `src/components/landing/_archive/`

#### 修复
- `WhyIceZone` 中 `<style jsx>` 块包含 `* { animation: none !important }` 偶发性禁用全站动画 — 已移除
- `StartCreating` 浮动图片缺少 `will-change: transform` 和动画容器的 `position: relative` — 已修复
- Next.js Image 警告：`StartCreating` 中 `fill` 图片补充 `position: relative` 父容器；`LOGO.png` 添加 `style={{ height: 'auto' }}`

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
