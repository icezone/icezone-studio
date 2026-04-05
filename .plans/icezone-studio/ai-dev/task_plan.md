# ai-dev - 任务计划

> 角色: Phase 2 工作流 D — 服务端 AI Provider
> 状态: blocked（等待 db-dev 完成 B.1，含 005_ai_jobs.sql）
> worktree: D:/ws-ai-providers（分支 ws/ai-providers）
> 创建: 2026-03-25

## 目标

在 ws-ai-providers worktree 中完成 Phase 2 工作流 D：
服务端 AI Provider 体系（ppio/grsai/kie/fal），含任务服务、积分管理和 API 路由。
**完成后通知 team-lead，解锁 video-dev（E 依赖 KIE Common + Job Service）**。

## 详细步骤

### D.1 AI Provider 接口 + 注册表
- [ ] src/server/ai/types.ts — AIProvider 接口定义
- [ ] src/server/ai/registry.ts — Provider 注册表

### D.2 实现 Provider（每个一文件）
- [ ] src/server/ai/providers/ppio.ts — 同步 POST
- [ ] src/server/ai/providers/grsai.ts — submit + poll
- [ ] src/server/ai/providers/kie.ts — 文件上传 + submit + poll
- [ ] src/server/ai/providers/fal.ts — 队列 API

**先写测试：**
- __tests__/unit/ai-ppio.test.ts
- __tests__/unit/ai-grsai.test.ts
- __tests__/unit/ai-kie.test.ts
- __tests__/unit/ai-fal.test.ts

### D.3 任务服务（video-dev 依赖此模块）
- [ ] src/server/jobs/jobService.ts — 创建、积分预扣、轮询、完成、失败、退款
- [ ] src/server/jobs/worker.ts — 后台轮询逻辑

**先写测试：**
- __tests__/unit/jobService.test.ts — 积分预扣/消费/退款
- __tests__/integration/job-lifecycle.test.ts — 模拟 provider 全生命周期

→ **完成 D.1+D.3 后通知 team-lead（video-dev 可解锁）**

### D.4 API 路由
- [ ] app/api/ai/image/generate/route.ts
- [ ] app/api/jobs/[id]/route.ts
- [ ] app/api/ai/models/route.ts

**先写测试：**
- __tests__/api/ai-generate.test.ts — 提交生成、积分不足 402、未认证 401
- __tests__/api/job-status.test.ts — 轮询返回状态

### D.5 Web AI Gateway
- [ ] src/features/canvas/infrastructure/webAiGateway.ts 完整实现（可与 canvas-dev 协调）

## 验证门控（完成后检查）
- [ ] Provider 单元测试全部通过
- [ ] 任务生命周期集成测试通过
- [ ] 积分逻辑正确（扣减/退款）
- [ ] API 路由 401/402/500 边界处理正确

## 涉及文件（主要）
- src/server/ai/types.ts, registry.ts
- src/server/ai/providers/ppio.ts, grsai.ts, kie.ts, fal.ts
- src/server/jobs/jobService.ts, worker.ts
- app/api/ai/image/generate/route.ts
- app/api/jobs/[id]/route.ts
- app/api/ai/models/route.ts
- __tests__/unit/ai-*.test.ts, jobService.test.ts
- __tests__/integration/job-lifecycle.test.ts
- __tests__/api/ai-generate.test.ts, job-status.test.ts

## 备注
- 必须先 rebase 到 main（包含 db-dev 的 005_ai_jobs.sql）
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- D.3 完成后立即通知 team-lead 解锁 video-dev
- 完成后提 PR: ws/ai-providers → main
