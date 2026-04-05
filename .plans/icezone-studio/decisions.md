# icezone-studio - 架构决策记录

> 记录每个决策及其理由。

---

## D1: 最大化并行度 — Wave 1 包含 Phase 1 的 DB 工作流 B

- 日期: 2026-03-25
- 决策: Wave 1 同时启动 auth-dev（工作流A）+ image-dev（工作流F）+ db-dev（工作流B）
- 理由: 工作流 B（DB schema + SQL 迁移）与 A/F 操作完全不同的文件集，无写冲突；提前完成 B 可更快解锁 canvas-dev 和 ai-dev
- 考虑过的替代方案: 严格按 Phase 0→1→2 串行执行（等待时间长，不必要）

## D2: canvas-dev 等待 B.2+B.3 再启动

- 日期: 2026-03-25
- 决策: canvas-dev（工作流C）在 db-dev 完成 B.2（项目CRUD API）和 B.3（草稿API）后再启动
- 理由: 画布页面需要项目加载/保存API；早于此启动会导致大量 Mock 返工
- 考虑过的替代方案: 用 Mock API 先行开发（引入额外复杂度和返工风险）

## D3: worktree 分支命名约定

- 日期: 2026-03-25
- 决策: 分支命名 ws/<workflow>，如 ws/auth-shell, ws/image-processing 等
- 理由: 清晰标识为 worktree 工作分支，与功能分支区分

## D4: 代码复用优先策略

- 日期: 2026-03-25
- 决策: domain/models/tools/ui/edges/hooks 从桌面版直接复制，只重写基础设施层
- 理由: 桌面版已验证核心画布工作流，重用降低风险，聚焦 Web 适配工作
