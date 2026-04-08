<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md — IceZone Studio

## 项目说明

本仓库采用 harness 风格工作流：
- **OpenSpec** 负责定义需求与变更工件
- **planning-with-files** 负责执行开发任务
- 实现与评审分离

## 标准工作流

### 阶段 1: 计划（使用 OpenSpec）

使用 `/opsx:propose` 在 `openspec/changes/<change-id>/` 生成：
- `proposal.md` — 为什么做这个变更，改什么
- `specs/` — 需求文档和场景说明
- `design.md` — 技术方案与架构决策
- `tasks.md` — 实施任务清单（checkbox 格式）

### 阶段 2: 实施（使用 planning-with-files）

使用 `/plan` 基于 `tasks.md` 执行开发：
- 自动同步 tasks.md 中的任务状态
- TDD 流程：测试先行
- 每个里程碑后运行验证
- 遵守项目规范

## 首先阅读

必读文档（按顺序）：

1. `docs/architecture/tech-stack.md` - 了解技术栈
2. `docs/architecture/codebase-guide.md` - 理解代码组织
3. `docs/standards/development-workflow.md` - 掌握 OpenSpec + planning-with-files 工作流
4. `openspec/specs/` - 查看当前需求规格
5. `openspec/changes/<change-id>/` - 查看具体变更任务（proposal → design → tasks）

## 工作规则

**强制要求**：
- ❌ 没有 OpenSpec change，不允许直接开始开发
- ❌ 不允许超出 `tasks.md` 自行扩需求
- ✅ 使用 `/opsx:propose` 创建变更提案
- ✅ 使用 `/plan` 基于 tasks.md 执行开发
- ✅ 每完成一个里程碑，必须运行相关检查
- ✅ 修改数据库、配置、高风险业务时，必须明确说明影响范围
- ✅ 合并前必须经过 review 和 verify

**工作流命令**：
- `/opsx:propose` - 创建新的变更提案（生成 proposal/specs/design/tasks）
- `/opsx:explore` - 浏览现有变更
- `/plan` - 基于 tasks.md 执行开发任务

## 完整文档索引

### 📐 架构设计 (docs/architecture/)

- `tech-stack.md` - 技术栈与依赖
- `layering.md` - 分层架构（Ports & Adapters）
- `codebase-guide.md` - 代码库导航顺序
- `data-flow.md` - 数据流模式
- `performance.md` - 性能优化模式

### 🎨 产品功能 (docs/product/)

- `features-overview.md` - 功能概览与成熟度
- `nodes.md` - 节点类型清单（11 种）
- `models.md` - AI 模型清单（图片/视频/分析）
- `tools.md` - 工具体系（裁剪/标注/分镜）
- `templates.md` - 模板系统

### 🔌 API 参考 (docs/api/)

- `endpoints.md` - API 端点参考（23+）
- `authentication.md` - 认证授权与 BYOK
- `error-handling.md` - 错误处理与已知问题

### 📋 开发规范 (docs/standards/)

- `development-workflow.md` - 开发工作流（TDD）
- `code-quality.md` - 代码质量标准
- `ui-guidelines.md` - UI/交互规范
- `testing.md` - 测试规范
- `i18n.md` - 国际化规范
- `persistence.md` - 持久化规范
- `known-pitfalls.md` - 已知陷阱

### 🔧 扩展指南 (docs/extensions/)

- `add-node.md` - 新增节点指南
- `add-model.md` - 新增模型指南
- `add-provider.md` - 新增 Provider 指南
- `add-tool.md` - 新增工具指南

## 快速查找

**我需要...**

- 了解整体架构？ → `docs/architecture/layering.md`
- 找到某个文件？ → `docs/architecture/codebase-guide.md`
- 开始开发任务？ → `docs/standards/development-workflow.md`
- 添加新功能？ → `docs/extensions/`
- 查看 API？ → `docs/api/endpoints.md`
- 解决测试问题？ → `docs/standards/testing.md`
- 修复 UI 问题？ → `docs/standards/ui-guidelines.md`
- 添加多语言？ → `docs/standards/i18n.md`

---

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
