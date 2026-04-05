# video-dev - 任务计划

> 角色: Phase 2 工作流 E — 服务端视频 Provider
> 状态: blocked（等待 ai-dev 完成 D.1+D.3 KIE Common + Job Service）
> worktree: D:/ws-video-providers（分支 ws/video-providers）
> 创建: 2026-03-25

## 目标

在 ws-video-providers worktree 中完成 Phase 2 工作流 E：
Kling/Sora2/Veo 视频生成 Provider，含 Supabase Realtime 状态推送和结果节点创建。
**前置条件**：ai-dev 的 KIE Common + Job Service 已合并到 main。

## 详细步骤

### E.1 视频 Provider 接口 + 注册表
- [ ] src/server/video/types.ts — VideoProvider 接口
- [ ] src/server/video/registry.ts — Provider 注册表

### E.2 KIE 共享基础设施
- [ ] src/server/video/providers/kie-common.ts — API 客户端、图片上传、状态轮询

### E.3 实现视频 Provider
- [ ] src/server/video/providers/kling.ts — multi_shots、kling_elements 支持
- [ ] src/server/video/providers/sora2.ts — duration→n_frames 映射
- [ ] src/server/video/providers/veo.ts — seed 校验（10000-99999 自动 clamp），不同端点

**先写测试：**
- __tests__/unit/video-kling.test.ts — 参数映射
- __tests__/unit/video-sora2.test.ts — 时长转帧数
- __tests__/unit/video-veo.test.ts — seed 范围 clamp
- __tests__/unit/video-kie-common.test.ts — 上传、轮询

### E.4 视频 API + Realtime
- [ ] app/api/ai/video/generate/route.ts
- [ ] Supabase Realtime 推送任务状态更新（通过 ai_jobs 表变更）
- [ ] src/features/canvas/infrastructure/webVideoGateway.ts 完整实现

**先写测试：**
- __tests__/api/video-generate.test.ts — 提交视频生成
- __tests__/integration/video-lifecycle.test.ts — 全生命周期
- __tests__/e2e/video-gen.spec.ts — 生成流程、进度、结果节点

### E.5 视频结果处理
- [ ] 任务完成后注册为 project_asset
- [ ] 创建 VideoResultNode（在 canvasStore 中触发）

## 验证门控（完成后检查）
- [ ] Provider 测试全部通过
- [ ] 视频任务生命周期可用（submit→poll→complete）
- [ ] Realtime 推送到客户端
- [ ] 结果节点创建且视频可播放
- [ ] seed clamp 逻辑正确（Veo）

## 涉及文件（主要）
- src/server/video/types.ts, registry.ts
- src/server/video/providers/kie-common.ts, kling.ts, sora2.ts, veo.ts
- app/api/ai/video/generate/route.ts
- __tests__/unit/video-*.test.ts
- __tests__/api/video-generate.test.ts
- __tests__/integration/video-lifecycle.test.ts
- __tests__/e2e/video-gen.spec.ts

## 备注
- 必须先 rebase 到 main（包含 ai-dev 的 kie-common + jobService）
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- 完成后提 PR: ws/video-providers → main
