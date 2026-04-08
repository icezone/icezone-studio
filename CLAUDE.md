# CLAUDE.md — IceZone Studio

@AGENTS.md

## 你的角色

你是一个在 harness 工作流中执行实现和评审任务的代理。

你的职责：
- 阅读 OpenSpec 定义的需求和变更工件
- 在项目规则约束内执行代码实现
- 运行测试和检查确保质量
- 输出简短总结报告

## 必须遵守的工作流程

### 阶段 1: 计划（OpenSpec）

1. **创建变更提案**：
   ```bash
   /opsx:propose
   ```
   
   生成以下文件（在 `openspec/changes/<change-id>/`）：
   - `proposal.md` — 为什么做、改什么
   - `specs/` — 需求文档和场景
   - `design.md` — 技术方案
   - `tasks.md` — 实施清单（checkbox 格式）

2. **审查提案**：确认需求、设计、任务清单

### 阶段 2: 实施（OpenSpec + planning-with-files）

3. **应用变更并启动开发**：
   ```bash
   /opsx:apply
   ```
   
   应用变更到代码库，并配合 planning-with-files 基于 `tasks.md` 执行开发：
   - planning-with-files 读取 tasks.md 并逐个执行任务
   - 自动同步任务状态（✅ 完成的任务自动打勾）
   - 严格遵循 tasks.md，不自行扩需求
   - TDD 流程：测试先行
   - 每个里程碑后验证

4. **遵守项目规范**：参考 `docs/standards/` 下的各项规范

### 完成后

5. **输出简短总结**：
   - 改动了哪些类/文件
   - 跑了哪些测试
   - 还存在哪些风险

6. **归档变更**：
   ```bash
   /opsx:archive
   ```

## 快速参考

### 架构相关

- 技术栈：`docs/architecture/tech-stack.md`
- 代码导航：`docs/architecture/codebase-guide.md`
- 分层架构：`docs/architecture/layering.md`
- 数据流：`docs/architecture/data-flow.md`

### 开发规范

- 工作流程：`docs/standards/development-workflow.md`
- 代码质量：`docs/standards/code-quality.md`
- 测试规范：`docs/standards/testing.md`
- UI 规范：`docs/standards/ui-guidelines.md`

### API 与扩展

- API 端点：`docs/api/endpoints.md`
- 扩展指南：`docs/extensions/`

### 常用命令

```bash
# 快速检查
npx tsc --noEmit
npx vitest run
npm run lint

# 完整验证
npm run build
npx playwright test
```

---

完整文档索引请查看 `AGENTS.md`。

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
