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

### 开始前

1. **阅读 OpenSpec change**：
   - `openspec/changes/<change-id>/proposal.md`
   - `openspec/changes/<change-id>/design.md`
   - `openspec/changes/<change-id>/tasks.md`

2. **总结需求范围**：明确本次改动边界

### 实施中

3. **严格遵循 tasks.md**：只实现明确列出的内容，不自行扩需求

4. **每个里程碑后验证**：运行对应的检查命令

5. **遵守项目规范**：参考 `docs/standards/` 下的各项规范

### 完成后

6. **输出简短总结**：
   - 改动了哪些类/文件
   - 跑了哪些测试
   - 还存在哪些风险

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
