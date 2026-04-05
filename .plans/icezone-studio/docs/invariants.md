# icezone-studio - 系统不变量

> 不可违反的系统边界。违反任何一条 = CRITICAL Bug。
> 创建: 2026-03-25

## 安全边界

- INV-1: 用户只能读写自己的 project（RLS 保证） — 状态：无自动化测试（计划：rls-isolation.test.ts）
- INV-2: API Key 只能在服务端使用，不得在客户端响应中返回 — 状态：无测试
- INV-3: 文件上传路径必须经过服务端校验，防止路径穿越 — 状态：无测试
- INV-4: 支付 Webhook 必须校验签名，防止伪造 — 状态：无测试（Phase 3）

## 数据隔离

- INV-5: project_drafts 的 revision 字段必须单调递增，客户端保存时携带 expectedRevision — 状态：draft-conflict.test.ts（计划）
- INV-6: imagePool 编解码必须无损往返（decode(encode(x)) === x） — 状态：image-pool-codec.test.ts（计划）

## 性能边界

- INV-7: 画布拖拽期间不触发 Supabase 写入（用防抖 + 拖拽结束检测） — 状态：无测试（E2E 验证）
- INV-8: viewport 保存走独立轻量端点（PATCH /draft/viewport），不触发整项目 PUT — 状态：无测试

## 接口契约

- INV-9: 前后端 API 字段名必须与 docs/api-contracts.md 一致 — 状态：人工检查（reviewer 负责）
- INV-10: 视频 Provider 的 seed 值必须在 10000-99999 范围内（Veo 特定，自动 clamp） — 状态：video-veo.test.ts（计划）

---

当识别到反复出现的 Bug 模式时，添加为正式不变量。
目标：reviewer = 第二道防线；自动化测试 = 第一道。
