# 文档重构设计 — IceZone Studio

**日期**: 2026-04-08  
**状态**: 已批准  
**设计者**: Claude Code

## 目标

将现有的 CLAUDE.md（519行）和 AGENTS.md（205行）重构为精简入口文档 + 分类详细文档的结构，提升文档可维护性和可查找性。

## 问题陈述

**当前状态**：
- CLAUDE.md：519 行，包含项目目标、技术栈、功能清单、架构规范、UI 规范、测试规范等所有内容
- AGENTS.md：205 行，包含项目概览、功能清单、工作流程等内容
- docs/：10 个 planning/implementation 文件，缺乏统一组织

**存在的问题**：
1. 文档过长，查找特定内容困难
2. 职责不清，一个文档包含多个主题
3. 维护困难，修改某个小节需要编辑大文件
4. 不利于新人学习，无法按需渐进式阅读
5. 与项目解耦、单一职责原则不一致

## 设计方案

### 整体架构

```
根目录/
├── AGENTS.md              # 精简版（50-80 行）：项目说明 + 工作规则 + 文档索引
├── CLAUDE.md              # 精简版（50-80 行）：角色定位 + 快速参考 + 文档链接
└── docs/
    ├── architecture/      # 架构设计（5 个文件）
    ├── product/           # 产品功能（5 个文件）
    ├── api/               # API 参考（3 个文件）
    ├── standards/         # 开发规范（7 个文件）
    └── extensions/        # 扩展指南（4 个文件）
```

### 文档分类与职责

#### 1. docs/architecture/ （架构设计）

| 文件名 | 来源 | 内容 |
|--------|------|------|
| `tech-stack.md` | CLAUDE.md 第 1 节 | 技术栈、依赖、项目定位 |
| `layering.md` | CLAUDE.md 第 5.1 节 | 分层架构、Ports & Adapters |
| `codebase-guide.md` | CLAUDE.md 第 3 节 | 代码库导航顺序（8 层） |
| `data-flow.md` | CLAUDE.md 第 4.3 + 5.4 节 | 数据流模式、层间通信 |
| `performance.md` | CLAUDE.md 第 8 节 | 性能优化模式 |

#### 2. docs/product/ （产品功能）

| 文件名 | 来源 | 内容 |
|--------|------|------|
| `features-overview.md` | CLAUDE.md 第 1.1 节 | 功能概览、产品定位 |
| `nodes.md` | CLAUDE.md 第 1.1 节 + 5.6 节 | 节点类型清单、注册规则 |
| `models.md` | CLAUDE.md 第 1.1 节 | AI 模型清单（图片/视频/分析）、BYOK |
| `tools.md` | CLAUDE.md 第 1.1 节 | 工具体系（裁剪/标注/分镜） |
| `templates.md` | CLAUDE.md 第 1.1 节 | 模板系统 |

#### 3. docs/api/ （API 参考）

| 文件名 | 来源 | 内容 |
|--------|------|------|
| `endpoints.md` | CLAUDE.md 第 1.1 节 | API 端点参考（23+） |
| `authentication.md` | CLAUDE.md 第 1 节 + 1.1 节 | 认证授权、BYOK |
| `error-handling.md` | CLAUDE.md 第 14 节 | 错误处理、已知问题 |

#### 4. docs/standards/ （开发规范）

| 文件名 | 来源 | 内容 |
|--------|------|------|
| `development-workflow.md` | CLAUDE.md 第 4 + 7 节 | TDD、验证命令、发布流程 |
| `code-quality.md` | CLAUDE.md 第 5.2/5.3/5.4 节 | 单一职责、文件规模、层间通信 |
| `ui-guidelines.md` | CLAUDE.md 第 6 节 | UI/交互规范 |
| `testing.md` | CLAUDE.md 第 13 节 | 测试规范 |
| `i18n.md` | CLAUDE.md 第 12 节 | 国际化规范 |
| `persistence.md` | CLAUDE.md 第 10 节 | 持久化规范 |
| `known-pitfalls.md` | CLAUDE.md 第 14 节 | 已知陷阱 |

#### 5. docs/extensions/ （扩展指南）

| 文件名 | 来源 | 内容 |
|--------|------|------|
| `add-node.md` | CLAUDE.md 第 9.5 节 | 新增节点指南 |
| `add-model.md` | CLAUDE.md 第 9.1/9.2 节 | 新增模型指南 |
| `add-provider.md` | CLAUDE.md 第 9.3 节 | 新增 Provider 指南 |
| `add-tool.md` | CLAUDE.md 第 9.4 节 | 新增工具指南 |

### AGENTS.md 结构

```markdown
# AGENTS.md — IceZone Studio

## 项目说明
- Harness 风格工作流
- OpenSpec + Claude Code

## 首先阅读
三步阅读路径：
1. 了解项目（tech-stack, features-overview, codebase-guide）
2. 掌握规范（development-workflow, code-quality, testing）
3. 查看任务（openspec/specs, openspec/changes）

## 工作规则
强制要求列表

## 完整文档索引
按 5 个目录分类列出所有 24 个文档

## 快速查找
场景化索引（"我需要..." → 对应文档）
```

### CLAUDE.md 结构

```markdown
# CLAUDE.md — IceZone Studio

@AGENTS.md

## 你的角色
- Harness 工作流代理

## 必须遵守的工作流程
1. 阅读 OpenSpec change
2. 总结需求范围
3. 严格遵循 tasks.md
4. 每个里程碑后验证
5. 输出简短总结

## 快速参考
- 架构相关（4 个链接）
- 开发规范（4 个链接）
- API 与扩展（2 个链接）
- 常用命令

详细索引查看 AGENTS.md
```

## 实施计划

### 前置清理

**删除现有 docs/ 下的 planning 文件**（10 个）：
```bash
rm docs/WAVE0-WAVE1-IMPLEMENTATION-SUMMARY.md
rm docs/implementation-guide-wave0-wave1.md
rm docs/N1-IMPLEMENTATION.md
rm docs/N1-N8-IMPLEMENTATION-STATUS.md
rm docs/N2-IMPLEMENTATION.md
rm docs/N3-IMPLEMENTATION.md
rm docs/feature-design-wave0-wave1.md
rm docs/implementation-plan.md
rm docs/migration-plan-v2.md
rm docs/system-design-plan.md
```

### 创建目录结构

```bash
mkdir -p docs/{architecture,product,api,standards,extensions}
```

### 文档创建顺序

**高优先级**（核心导航）：
1. `docs/architecture/tech-stack.md`
2. `docs/architecture/codebase-guide.md`
3. `docs/standards/development-workflow.md`

**中优先级**（常用规范）：
4. `docs/product/features-overview.md`
5. `docs/standards/code-quality.md`
6. `docs/standards/ui-guidelines.md`
7. `docs/standards/testing.md`
8. `docs/architecture/layering.md`
9. `docs/architecture/data-flow.md`

**低优先级**（详细参考）：
10-24. 剩余所有文档

### 更新入口文档

25. 重写 `AGENTS.md`（带完整索引）
26. 重写 `CLAUDE.md`（简洁引用）

### Git 提交策略

**单次大提交**（用户要求）：

```bash
git add docs/ AGENTS.md CLAUDE.md
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

## 技术细节

### 文档编写规范

**统一格式**：
```markdown
# 文档标题

简短介绍（1-2 段）

## 主要章节

内容...

### 子章节

内容...

---

相关文档：
- `code-quality.md` - 代码质量标准
- `../architecture/layering.md` - 分层架构说明
```

**交叉引用**：
- 使用相对路径
- 格式：`[代码质量标准](code-quality.md)` 或 `[分层架构](../architecture/layering.md)`
- 页尾统一添加"相关文档"区块

**代码示例**：
```markdown
✅ 正确示例：
```typescript
const result = await service.process();
```

❌ 错误示例：
```typescript
const result = await fetch('/api');
```
```

**清单与表格**：
- 使用 Markdown 表格
- 使用 emoji 标记（✅ ❌ ⚠️）
- 保持格式对齐

### 内容迁移原则

**完整性**：
- 确保 CLAUDE.md 和 AGENTS.md 的所有内容都迁移到新文档
- 不丢失任何技术细节或约束
- 保留所有代码示例和命令

**一致性**：
- 所有文档使用中文
- 统一术语翻译
- 保持格式风格一致

**可维护性**：
- 每个文档单一主题
- 避免内容重复
- 通过交叉引用建立关联

## 验证标准

**完成标准**：
- [ ] 所有 24 个新文档已创建
- [ ] AGENTS.md 和 CLAUDE.md 已精简并包含完整索引
- [ ] 所有内部链接可用
- [ ] docs/ 下旧 planning 文件已删除
- [ ] 单次提交已完成

**质量标准**：
- [ ] 每个文档职责清晰
- [ ] 无内容遗漏
- [ ] 无内容重复
- [ ] 格式统一
- [ ] 中文表达准确

**功能验证**：
- [ ] 通过 AGENTS.md 索引能找到所有文档
- [ ] 相关文档间的交叉引用正确
- [ ] 新人能按"首先阅读"顺序理解项目

## 风险与缓解

**风险 1：内容遗漏**
- **缓解**：使用 checklist 逐节对照 CLAUDE.md 和 AGENTS.md，确保所有章节都有对应的新文档

**风险 2：链接失效**
- **缓解**：完成后遍历所有文档，验证交叉引用链接

**风险 3：格式不一致**
- **缓解**：使用统一的文档模板，每个文档遵循相同结构

**风险 4：中文术语不一致**
- **缓解**：保持 CLAUDE.md 中的术语翻译，不自创新译法

## 后续维护

**新增功能时**：
1. 在对应的 `docs/product/*.md` 更新功能清单
2. 如涉及新的扩展类型，在 `docs/extensions/` 添加指南
3. 如涉及 API 变更，更新 `docs/api/endpoints.md`

**修改规范时**：
1. 直接修改对应的 `docs/standards/*.md`
2. 不需要修改 AGENTS.md 或 CLAUDE.md（除非索引结构变化）

**架构变更时**：
1. 修改对应的 `docs/architecture/*.md`
2. 如影响数据流或分层，同步更新相关文档

## 成功指标

**重构前**：
```
CLAUDE.md (519 行) - 包含所有内容
AGENTS.md (205 行) - 重复部分内容
docs/ (10 个 planning 文件) - 无组织
```

**重构后**：
```
AGENTS.md (~70 行) - 工作规则 + 完整索引
CLAUDE.md (~60 行) - 角色定位 + 快速引用
docs/ (24 个分类文件，共约 1500-2000 行) - 职责清晰
```

**期望效果**：
- ✅ 职责清晰，每个文档单一主题
- ✅ 易于维护，修改局部不影响全局
- ✅ 便于查找，通过 AGENTS.md 快速定位
- ✅ 支持渐进式学习，按需阅读
- ✅ 符合解耦原则，文档架构与代码架构一致

---

**设计批准日期**: 2026-04-08  
**实施开始日期**: 2026-04-08
