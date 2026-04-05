# db-dev - 任务计划

> 角色: Phase 1 工作流 B — 数据库 Schema + 项目持久化
> 状态: in_progress
> worktree: D:/ws-project-persistence（分支 ws/project-persistence）
> 创建: 2026-03-25

## 目标

在 ws-project-persistence worktree 中完成 Phase 1 工作流 B：
完整数据库 schema、项目 CRUD API、草稿 API（含冲突检测）、Web ProjectStore。

**重要**：B.2（项目CRUD API）和 B.3（草稿API）完成后，通知 team-lead 解锁 canvas-dev。
B.1 包含 005_ai_jobs.sql 后，通知 team-lead 解锁 ai-dev。

## 详细步骤

### B.1 数据库迁移
- [ ] supabase/migrations/002_projects.sql — projects 表
- [ ] supabase/migrations/003_project_drafts.sql — 草稿表
- [ ] supabase/migrations/004_project_assets.sql — 资产表
- [ ] supabase/migrations/005_ai_jobs.sql — 任务表（ai-dev 依赖此表）
- [ ] supabase/migrations/006_credit_ledger.sql — 积分账本
- [ ] supabase/migrations/007_plans_payments.sql — 套餐 + 支付
- [ ] supabase/migrations/008_user_api_keys.sql — BYOK 加密存储
- [ ] supabase/migrations/009_rls_policies.sql — RLS 策略
- [ ] supabase/migrations/010_triggers.sql — updated_at 触发器

**先写测试：**
- __tests__/api/rls-isolation.test.ts — 用户 A 无法读取用户 B 的项目
- __tests__/api/rls-public.test.ts — 公开项目任何人可读

→ **完成 B.1 后通知 team-lead（ai-dev 可解锁）**

### B.2 项目 CRUD API
- [ ] app/api/projects/route.ts — GET（列表）、POST（创建）
- [ ] app/api/projects/[id]/route.ts — GET、PATCH、DELETE

**先写测试：**
- __tests__/api/projects-crud.test.ts — 创建/列表/重命名/删除/401

→ **完成 B.2 + B.3 后通知 team-lead（canvas-dev 可解锁）**

### B.3 草稿 API
- [ ] app/api/projects/[id]/draft/route.ts — GET（加载）、PUT（保存 + revision 检查）
- [ ] app/api/projects/[id]/draft/viewport/route.ts — PATCH
- [ ] 冲突检测：revision 不匹配返回 409

**先写测试：**
- __tests__/api/draft-save-load.test.ts — 保存后加载一致
- __tests__/api/draft-conflict.test.ts — 并发保存返回 409
- __tests__/unit/image-pool-codec.test.ts — imagePool 编解码往返

### B.4 Web ProjectStore
- [ ] src/stores/projectStore.ts — Supabase + IndexedDB 双写
- [ ] 安装 idb-keyval
- [ ] 保存状态：saving | saved | unsynced | offline | conflict
- [ ] 防抖保存（1s）+ 独立 viewport 保存

**先写测试：**
- __tests__/unit/projectStore-save.test.ts — 防抖批量保存
- __tests__/unit/projectStore-offline.test.ts — 网络错误转 offline
- __tests__/unit/projectStore-conflict.test.ts — 409 转 conflict

### B.5 重复标签检测
- [ ] 在 projectStore 中集成 BroadcastChannel API

## 验证门控（完成后检查）
- [ ] 迁移在干净 Supabase 实例上正常应用（npx supabase db reset）
- [ ] RLS 隔离测试通过
- [ ] 草稿保存/加载 + 冲突检测可用
- [ ] 全部 vitest 测试通过

## 涉及文件（主要）
- supabase/migrations/002_*.sql ～ 010_*.sql
- app/api/projects/route.ts, [id]/route.ts
- app/api/projects/[id]/draft/route.ts, viewport/route.ts
- src/stores/projectStore.ts
- __tests__/api/rls-*.test.ts, projects-crud.test.ts, draft-*.test.ts
- __tests__/unit/projectStore-*.test.ts, image-pool-codec.test.ts

## 备注
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- 禁止在此工作流改动 src/features/canvas/ 或 app/(auth)/
- 里程碑通知：B.1完成 → 通知解锁 ai-dev；B.2+B.3完成 → 通知解锁 canvas-dev
- 完成后提 PR: ws/project-persistence → main
