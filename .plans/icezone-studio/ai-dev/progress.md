# ai-dev 进度

状态: COMPLETED
完成时间: 2026-03-26

## 完成项
- [x] D.1 AI Provider 接口 + 注册表 (`src/server/ai/types.ts`, `src/server/ai/registry.ts`)
- [x] D.2 ppio/grsai/kie/fal providers (`src/server/ai/providers/`)
- [x] D.3 任务服务（jobService + worker）(`src/server/jobs/`)
- [x] D.4 API 路由（generate/jobs/models）(`app/api/ai/`, `app/api/jobs/`)
- [x] D.5 webAiGateway 骨架 (`src/features/canvas/infrastructure/webAiGateway.ts`)
- [x] 测试覆盖：59 个新测试，全部通过
- [x] 提交到 ws/ai-providers

## 解锁通知
D.1 + D.3 完成 → **video-dev 可解锁**

## 架构说明

### Provider 映射
- `ppio`: 同步 provider，调用 `generate()` 直接返回图片 URL
- `grsai`: 异步 provider，`submitJob()` + `pollJob()` 轮询
- `kie`: 异步 provider，支持图片上传（http/data URI/base64），`submitJob()` + `pollJob()`
- `fal`: 队列 provider，jobId 格式为 `model:request_id`，`submitJob()` + `pollJob()`

### 关键设计决策
1. 错误类型检测同时使用 `instanceof` 和 `error.name` 匹配，兼容 mock 环境的类边界问题
2. fal provider 的 jobId 编码为 `model:request_id`，以支持状态端点查询
3. KIE 图片上传支持三种格式：http URL（通过上传 API 代理）、data URI、raw base64
4. worker.ts 的轮询使用 `Promise.allSettled` 保证单个任务失败不影响整体

## 注意事项
- 预存在 5 个 image-crop/split/validation 测试失败，与本次任务无关（image-dev 遗留）
- 预存在 tsc 错误（`createServerClient` 未导出，`environmentMatchGlobs` 不支持），均为 db-dev 遗留，非本次引入
- `src/features/canvas/infrastructure/webAiGateway.ts` 是骨架，canvas-dev 需接入 `application/ports.ts` 中的 `AiGateway` 接口
