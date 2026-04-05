# Changelog / 更新日志

**[English](#changelog)** | **[中文](#更新日志)**

---

<a id="changelog"></a>

## Changelog

All notable changes to IceZone Studio will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

### [Unreleased]

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
