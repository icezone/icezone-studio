# storyboard-copilot-web - 主计划

> 状态: PHASE_4_COMPLETE / 待后续迭代
> 创建: 2026-03-25
> 更新: 2026-04-03
> 团队: storyboard-copilot-web (auth-dev, image-dev, db-dev, canvas-dev, ai-dev, video-dev, reviewer)
> 决策记录: .plans/storyboard-copilot-web/decisions.md

---

## 1. 项目概述

基于桌面版 Storyboard-Copilot（Tauri 2 + Rust）升级扩展为 Web SaaS 产品，覆盖全球和中国市场。
核心功能：节点画布 + 图片 AI 生成/编辑 + 视频生成 + 分镜工具，配合 Supabase Auth + 支付体系。

详细产品定义 → docs/implementation-plan.md（项目根目录）

---

## 2. 文档索引

| 文档 | 位置 | 内容 |
|------|------|------|
| 架构 | .plans/storyboard-copilot-web/docs/architecture.md | 系统组件、数据流、关键设计决策 |
| API 契约 | .plans/storyboard-copilot-web/docs/api-contracts.md | 前后端接口定义 |
| 不变量 | .plans/storyboard-copilot-web/docs/invariants.md | 不可违反的系统边界 |
| 实现计划 | docs/implementation-plan.md | 各阶段详细任务清单 |
| 系统设计 | docs/system-design-plan.md | 系统架构设计 |

---

## 3. 阶段概览（全部已合并到 main）

### Phase 0 ✅

| 工作流 | Agent | 状态 | 合并提交 |
|--------|-------|------|---------|
| A: Auth + App Shell + i18n | auth-dev | **DONE** | f86d022 → f200201 |
| F: 图片处理 API (sharp) | image-dev | **DONE** | acdf2bf → c76fd61 |

### Phase 1 ✅

| 工作流 | Agent | 状态 | 合并提交 |
|--------|-------|------|---------|
| B: DB Schema + 持久化 API | db-dev | **DONE** | cbf60cb → 7db96ab |
| C: 画布 + 节点系统 | canvas-dev | **DONE** | 3548371 → da1b88c |

### Phase 2 ✅

| 工作流 | Agent | 状态 | 合并提交 |
|--------|-------|------|---------|
| D: 服务端 AI Provider | ai-dev | **DONE** | d8e92e6 → 5e8d792 |
| E: 服务端视频 Provider | video-dev | **DONE** | 7f3abd2 → 8cb4778 |

### Phase 3 ✅

| 工作流 | 状态 | 合并提交 |
|--------|------|---------|
| 功能性 Dashboard + 设置页 + App Shell 优化 | **DONE** | 3da1832 |
| API Key 管理 + 中间件路由保护 | **DONE** | 1f920da |
| Landing Page（cinematic dark SaaS）| **DONE** | d021937 → dc2884c |

### Phase 4 ✅

| 工作流 | 状态 | 合并提交 |
|--------|------|---------|
| CI (GitHub Actions) + proxy 迁移 + i18n 完整覆盖 + E2E 骨架 | **DONE** | 35d4a18 |
| Vercel 部署配置 + E2E dashboard 测试 | **DONE** | 1e1cbec |
| E2E 测试修复（auth/dashboard selector + signup 校验）| **DONE** | e73c0db |

---

## 4. 任务汇总

| # | 任务 | 负责人 | 状态 | 进度文件 |
|---|------|--------|------|----------|
| T-A | Phase 0 - Auth + App Shell | auth-dev | ✅ DONE | .plans/storyboard-copilot-web/auth-dev/progress.md |
| T-F | Phase 0 - 图片处理 API | image-dev | ✅ DONE | .plans/storyboard-copilot-web/image-dev/progress.md |
| T-B | Phase 1 - DB Schema + 持久化 | db-dev | ✅ DONE | .plans/storyboard-copilot-web/db-dev/progress.md |
| T-C | Phase 1 - 画布 + 节点 | canvas-dev | ✅ DONE | .plans/storyboard-copilot-web/canvas-dev/task_plan.md |
| T-D | Phase 2 - AI Provider | ai-dev | ✅ DONE | .plans/storyboard-copilot-web/ai-dev/progress.md |
| T-E | Phase 2 - 视频 Provider | video-dev | ✅ DONE | .plans/storyboard-copilot-web/video-dev/progress.md |

---

## 5. 分支状态（2026-04-03 清理后）

- **远程分支**：仅 `origin/main`，所有功能分支已删除
- **本地分支**：仅 `main`
- **Worktree**：仅主仓库 `D:/storyboard-copilot-web`，所有 agent worktree 已删除

---

## 6. 当前 main 构建状态

- ✅ tsc --noEmit 零错误
- ✅ vitest run 全部通过
- ✅ npm run build 成功
- ✅ GitHub Actions CI 通过（类型检查 + Lint + 单元测试 + 构建）
- 🔄 E2E 测试修复中（最新 run: 23945073920，awaiting result）

---

## 7. 下一步迭代方向

优先级排序供参考：

1. **支付集成**（PayPal + Alipay + WeChat Pay）— billing 工作流 G
2. **画布端到端联调**（前端节点 ↔ 后端 AI/视频 API）
3. **图片上传节点功能完善**（Supabase Storage 对接）
4. **Realtime 视频进度推送**（Supabase Realtime → `ai_jobs` 变化订阅）
5. **用户配额与限流**
