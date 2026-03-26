# video-dev 进度

状态: COMPLETED
完成时间: 2026-03-26

## 完成项
- [x] E.1 视频 Provider 接口 + 注册表
- [x] E.2 KIE 共享基础设施（图片上传 + 轮询 + 状态映射）
- [x] E.3 Kling/Sora2/Veo providers（含 veo3 和 veo3_fast 两个子 provider）
- [x] E.4 视频 API (`POST /api/ai/video/generate`) + webVideoGateway
- [x] E.5 视频结果处理（jobs route 含资产注册 `project_assets`）
- [x] 测试覆盖（74 个新增测试，全部通过）
- [x] tsc --noEmit 零错误
- [x] 提交到 ws/video-providers

## 文件清单
- `src/server/video/types.ts` — VideoProvider 接口 + 类型定义
- `src/server/video/registry.ts` — provider 注册表
- `src/server/video/index.ts` — 注册所有 provider 的入口
- `src/server/video/providers/kie-common.ts` — KIE 基础设施（上传/轮询/状态映射）
- `src/server/video/providers/kling.ts` — Kling 3.0（text-to-video + image-to-video）
- `src/server/video/providers/sora2.ts` — Sora2（duration→n_frames 映射，10s/15s）
- `src/server/video/providers/veo.ts` — Veo3/Veo3-fast（seed clamp 10000-99999）
- `src/server/ai/registry.ts` — AI provider 注册表存根（供 worker.ts 引用）
- `src/server/jobs/jobService.ts` — 从 ws/ai-providers 分支复制
- `src/server/jobs/worker.ts` — 从 ws/ai-providers 分支复制
- `src/features/canvas/infrastructure/webVideoGateway.ts` — 客户端网关
- `app/api/ai/video/generate/route.ts` — 视频生成 API 路由
- `app/api/jobs/[id]/route.ts` — 任务轮询 + 视频资产注册
- `__tests__/unit/video-kie-common.test.ts` — KIE 基础设施测试（17 个）
- `__tests__/unit/video-kling.test.ts` — Kling provider 测试（17 个）
- `__tests__/unit/video-sora2.test.ts` — Sora2 provider 测试（18 个）
- `__tests__/unit/video-veo.test.ts` — Veo provider 测试（18 个）
- `__tests__/api/video-generate.test.ts` — API 路由测试（8 个）

## 注意事项
- `src/server/ai/registry.ts` 是存根，不注册任何 provider。完整 AI 图片 provider 由 ai-dev 分支（ws/ai-providers）提供，合并时会自动整合。
- `src/server/jobs/jobService.ts` 和 `worker.ts` 从 ai-dev 分支复制，合并时会与 ai-dev 版本对齐（无冲突，内容相同）。
- 5 个预先存在的图片 API 测试失败（image-validation + image-crop/split）属于 image-dev 遗留问题，与本次工作无关。
- `webVideoGateway.ts` 标记了 'use client'，轮询使用 `/api/jobs/[id]` 端点（与 image job 共用）。
- Realtime 推送依赖 Supabase `ai_jobs` 表变化，无需额外后端代码；客户端订阅 `ai_jobs` UPDATE 事件即可。
