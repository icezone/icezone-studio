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

- **N1: 视频分析（MVP，已上线）**: 签名上传 → 场景检测 + 关键帧抽取 → 自动镜头语言分析 + 逐帧反推提示词（EN/中文）→ 选中场景一键 fan-out 为 upload / storyboard 节点
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
