# 智能 API 路由与自动适配系统 — 设计文档

**日期**: 2026-04-21
**作者**: icezone + Claude(Brainstorming)
**状态**: 待实施(分 5 个 Milestone)

---

## 1. 背景与目标

### 1.1 问题

市面上有大量 API 中转站,提供价格各异、稳定性参差的相同类型模型(Nano Banana、Veo、Kling、Gemini、Claude、GPT 等)。终端用户难以判断哪个中转站靠谱、便宜、快。当前 IceZone Studio 的 Canvas 将 `provider/model` 作为同一级选项暴露给用户(如 `kie/nano-banana-2`、`fal/nano-banana-2` 显示为两个不同的选项),用户需要自行理解 provider 差异,体验不佳。

### 1.2 目标

把"**选哪家 API**"这件事从用户身上剥离,让用户只需关心"**我要用哪个模型**"。系统根据用户本地历史数据(成功率/延迟/成本估算)自动匹配最合适的 API key 来完成调用。

**关键目标**:
- 小白用户只需配置 1–2 个 key 就能完整使用文字/图片/视频三类生成
- 进阶用户能在不影响"全自动"默认体验的前提下,控制场景默认 key 与模型级偏好
- Canvas UI 只呈现模型名,不暴露 provider/中转站

### 1.3 非目标

- ❌ 不做代付费/账户充值
- ❌ 不做众包遥测(评分数据源仅限用户本地历史)
- ❌ 不支持非 OpenAI-compat 协议的自定义端点(只接 OpenAI-compat;专有协议仍走内置适配器)
- ❌ 不引入跨用户评分共享

---

## 2. 核心概念与命名

| 术语 | 定义 |
|------|------|
| **Provider** | API 的实际提供方(如 kie、s.lconai.com、ai.comfly.chat、api.n1n.ai、OpenAI Google Claude Grok官方、用户自定义 OpenRouter 实例) |
| **Aggregator(推荐聚合器)** | 我们维护的"推荐清单"中的 provider 候选,首次引导时展示给用户 |
| **Logical Model** | 面向用户的逻辑模型名,如 `nano-banana-pro`、`veo-3`、`gemini-2.5-flash` |
| **Model Binding** | `logical_model × provider → 实际调用参数`(沿用现有 `src/features/canvas/models/image/<provider>/<model>.ts` 结构) |
| **Scenario** | `text` / `image` / `video`(可扩 `analysis`、`edit`) |
| **Routing Preference** | 用户配置的三层偏好:模型级 > 场景级 > 自动 |
| **Capability Probing** | 粘贴 key 时的连通测试 + 异步能力发现 |

---

## 3. 系统职责

1. **Key 管理(BYOK)** — 支持内置 provider 与 OpenAI-compat 自定义端点
2. **能力探测** — 粘贴 key 时连通测试,异步发现可用模型
3. **推荐引导** — 首次使用弹出 Starter Bundle,降低接入门槛
4. **路由决策** — 根据模型 + 三层偏好选出最合适的 key
5. **评分收集** — 每次调用记录 `{成功/失败, 延迟, 成本估算}` 到本地历史(保留 30 天)
6. **故障转移** — 失败时自动 fallback 到下一候选,Toast 提示用户切换结果

---

## 4. 用户故事 — MVP

### 4.1 小白路径
1. 注册 → 首次打开 Settings 触发引导 Wizard
2. 三步:选场景 → 看推荐聚合器卡片 → 粘贴 1–2 key
3. Canvas 中直接选模型(只显示模型名)
4. 生成时系统全自动路由,失败自动 fallback + Toast 提示

### 4.2 进阶路径
- Settings 中可设置:场景默认 key、模型级偏好 key、fallback 开关
- 查看 30 天使用记录(按 key / 按模型分组)+ 费用估算
- 手动重跑能力探测 / 测速

---

## 5. 数据模型(Supabase)

### 5.1 Schema

```sql
-- 1. 扩展现有 api_keys 表
ALTER TABLE api_keys ADD COLUMN base_url text;              -- 自定义端点 URL,内置留 NULL
ALTER TABLE api_keys ADD COLUMN protocol text DEFAULT 'native';  -- 'native' | 'openai-compat'
ALTER TABLE api_keys ADD COLUMN display_name text;          -- 用户自定义别名
ALTER TABLE api_keys ADD COLUMN status text DEFAULT 'unverified';
  -- 'unverified' | 'active' | 'invalid' | 'rate_limited'
ALTER TABLE api_keys ADD COLUMN last_verified_at timestamptz;

-- 2. 能力探测缓存
CREATE TABLE user_key_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES api_keys ON DELETE CASCADE,
  logical_model_id text NOT NULL,         -- 如 'nano-banana-pro'
  source text NOT NULL,                   -- 'probed' | 'catalog'
  discovered_at timestamptz DEFAULT now(),
  UNIQUE(key_id, logical_model_id)
);

-- 3. 调用历史(评分来源;30 天保留)
CREATE TABLE model_call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  key_id uuid REFERENCES api_keys,
  logical_model_id text NOT NULL,
  scenario text NOT NULL,                 -- 'text' | 'image' | 'video'
  status text NOT NULL,                   -- 'success' | 'failed' | 'timeout'
  latency_ms integer,
  error_code text,
  cost_estimate_cents integer,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_history_user_key_model_time
  ON model_call_history (user_id, key_id, logical_model_id, created_at DESC);

-- 4. 路由偏好(三层)
CREATE TABLE routing_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  level text NOT NULL,                    -- 'model' | 'scenario'
  target text NOT NULL,                   -- logical_model_id 或 scenario name
  preferred_key_id uuid REFERENCES api_keys,
  fallback_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, level, target)
);

-- 5. pg_cron 定期清理(30 天保留)
SELECT cron.schedule(
  'purge-model-call-history',
  '0 3 * * *',  -- 每天凌晨 3 点
  $$ DELETE FROM model_call_history WHERE created_at < now() - interval '30 days' $$
);
```

### 5.2 静态资源(打包进 bundle)

- `src/config/aggregator-manifest.ts` — 推荐清单 fallback 快照
- `src/config/provider-catalog.ts` — 内置 provider 能力目录(kie 支持哪些模型等)
- `src/config/pricing-table.ts` — 静态价格表(成本估算)

> 远程更新策略:pricing-table 与 aggregator-manifest 由 Claude Code 远程提交 PR 更新;manifest 额外在 Supabase Storage 公共 bucket 发布一份 JSON,前端 24h 缓存。

### 5.3 远程资源

- Supabase Storage `/aggregator-manifest.json` — 运营更新,前端 24h 缓存
  ```json
  {
    "version": "2026.04.21",
    "updatedAt": "2026-04-21T00:00:00Z",
    "aggregators": [
      {
        "id": "openrouter",
        "name": "OpenRouter",
        "protocol": "openai-compat",
        "baseUrl": "https://openrouter.ai/api/v1",
        "getKeyUrl": "https://openrouter.ai/keys",
        "categories": ["llm"],
        "priceTier": { "llm": "mid" },
        "reliabilityScore": 95,
        "recommended": true,
        "recommendBundles": ["starter", "llm-heavy"]
      }
    ]
  }
  ```

---

## 6. 架构与模块

基于现有 Ports & Adapters 分层,新增一个独立 feature `src/features/routing/`。

### 6.1 Presentation Layer
```
src/features/settings/
├── OnboardingWizard.tsx          ← 新:首次引导(Starter Bundle)
├── KeyManager.tsx                 ← 新:key CRUD + 状态徽章 + 能力展示
├── ScenarioDefaults.tsx           ← 新:场景级默认 key
├── ModelPreferences.tsx           ← 新(高级):模型级偏好(默认折叠)
└── CostSummaryPanel.tsx           ← 新:30 天费用/调用统计

src/features/canvas/ui/
└── ModelPicker.tsx                ← 改:已解锁/弱化解锁态,仅显示模型名

src/stores/
└── aggregatorManifestStore.ts     ← 新:manifest 客户端缓存(24h)
```

### 6.2 Application Layer
```
src/features/routing/application/
├── ports.ts                       ← IRouter / ICapabilityProber / IScoringEngine / ICallHistory
├── types.ts                       ← RouteRequest / RouteDecision / KeyCandidate
└── routingService.ts              ← 三层偏好解析 + 候选筛选 + fallback 编排
```

### 6.3 Infrastructure Layer
```
src/server/routing/
├── router.ts                      ← 主入口:选 key → 调 provider → 回填 history
├── scoring.ts                     ← 30 天历史 → 计算 score
├── candidates.ts                  ← logical_model → 可服务 key 清单
└── fallback.ts                    ← 失败重试 + Toast payload

src/server/ai/capabilities/
├── prober.ts                      ← 连通测试 + /v1/models 发现
├── catalog.ts                     ← 内置 provider capability 查询
└── backgroundJob.ts               ← 粘贴 key 后异步触发器

src/server/ai/telemetry/
├── callHistory.ts                 ← 写入/查询
├── costEstimator.ts               ← 静态价格表 × 次数
└── retention.ts                   ← 与 pg_cron 对齐的手动清理入口(备用)

src/server/ai/providers/
├── openaiCompat.ts                ← 统一 OpenAI-compat 适配器
└── registry.ts                    ← 改:支持 custom:<uuid> 动态 provider
```

### 6.4 配置
```
src/config/
├── aggregator-manifest.ts         ← fallback 快照
├── provider-catalog.ts            ← 内置 provider 能力目录
└── pricing-table.ts               ← 静态价格表
```

### 6.5 API Routes

**改造**:
- `/api/ai/image/generate`、`/api/ai/video/generate`、`/api/ai/text/*`、`/api/ai/analysis/*` — 内部接入 router

**新增**:
- `POST /api/settings/api-keys/:id/probe` — 手动触发能力探测/测速
- `GET /api/settings/capabilities` — 查当前用户所有 key 覆盖的模型集合
- `GET /api/manifest/aggregators` — 代理远程 manifest(服务端缓存)
- `GET /api/settings/call-history` — 30 天历史 + 费用汇总
- `POST /api/settings/routing-preferences` — 三层偏好 CRUD

### 6.6 现有文件改造清单

| 文件 | 变更 |
|------|------|
| `src/server/ai/keyFetcher.ts` | 支持 custom provider + 返回多候选 |
| `src/server/ai/keyRotationHelper.ts` | 融合进 router 的 fallback |
| `src/features/canvas/models/registry.ts` | 同一 logical_model 聚合多 provider binding |
| `src/app/(app)/settings/page.tsx` | 加入 Wizard / KeyManager / 新 tab |
| `src/app/api/settings/api-keys/route.ts` | 支持 `base_url`、`protocol` 字段 |

---

## 7. 路由决策算法

### 7.1 三层回退

```
candidates = keys that can serve `logical_model`
            AND status IN ('active', 'unverified')

1. 查 routing_preferences (level='model', target=logical_model)
   → 若 preferred_key_id ∈ candidates 且 healthy → 选中
2. 查 routing_preferences (level='scenario', target=scenario)
   → 若 preferred_key_id ∈ candidates 且 healthy → 选中
3. 自动排序(score 降序):
   score = w_success · success_rate
         + w_latency · latency_norm_inv
         + w_cost    · cost_norm_inv
   w_success=0.3, w_latency=0.2, w_cost=0.5(MVP 默认;未来可配置)
```

### 7.2 Score 取样

- 从 `model_call_history` 查最近 30 天内 `(user_id, key_id, logical_model_id)` 的最多 50 次调用
- `success_rate` = success / total
- `latency_ms` 取中位数
- `cost_estimate_cents` 取平均
- 数据不足(< 5 次)时:success_rate 默认 1.0,latency/cost 用 `pricing-table` 的静态基线

### 7.3 健康度(Healthy)定义

- `status = 'active'` 或 `'unverified'`(新粘贴的给一次机会)
- 最近 10 分钟内连续失败次数 < 3

### 7.4 Fallback 行为

- 首选失败 → 按 score 顺序依次尝试下一候选
- 每次尝试写入 `model_call_history`
- 成功:返回结果 + Toast(`{ message: "已切换至 <displayName> 完成请求", fallback_chain: [...] }`)
- 全部失败:返回 structured error(`code`, `fallback_attempts`, `suggestion`)

---

## 8. 能力探测细节

### 8.1 三层动作

1. **连通性测试**:零/极低成本,粘贴时立即执行
   - OpenAI-compat: `GET /v1/models`
   - 内置 provider: 对应的 list-models 或 account-info 端点
2. **模型能力发现**:异步,粘贴后后台执行
   - OpenAI-compat: 解析 `/v1/models` 返回的列表
   - 内置 provider: 查 `src/config/provider-catalog.ts`
3. **速度/质量基线**(可选):用户手动触发的"一键测速"

### 8.2 状态流转

```
unverified(粘贴即入库)
  → active(连通性测试通过)
  → invalid / rate_limited(测试失败)
  → active(用户重试/手动 probe 后恢复)
```

---

## 9. 失败 Fallback Toast

### 9.1 前端展示

```
Toast:"已切换至 fal 完成请求 · 查看详情"
点击 → 弹出侧边栏:
  ┌─────────────────────────────┐
  │  模型:Nano Banana Pro        │
  │  尝试链:                     │
  │   1. kie-Cheap    ✗ timeout  │
  │   2. fal          ✓ 1.2s     │
  │  [在 Settings 调整偏好]       │
  └─────────────────────────────┘
```

### 9.2 全失败错误结构

```ts
{
  code: 'ALL_CANDIDATES_FAILED',
  fallback_attempts: [
    { key_id, display_name, error_code, latency_ms },
    ...
  ],
  suggestion: '请检查 API key 余额或添加新的 provider'
}
```

---

## 10. Canvas UI 约束

### 10.1 ModelPicker

- **仅显示 `displayName`**(`Nano Banana Pro`),不显示 `provider/model`
- **已解锁态**:正常颜色,悬停显示"当前首选:kie · 可选 comfly、官方"
- **未解锁态(🔒)**:灰化 + 锁图标 + "配置 <场景> key 解锁"
  - 点击直达 `KeyManager`,并预筛选能解锁此模型的 provider 类型

### 10.2 引导入口

- Settings 顶部保留"重新打开引导"按钮

---

## 11. 测试策略

### 11.1 单元测试(Vitest)
- `scoring.test.ts`:给定 call_history 样本,score 计算正确
- `candidates.test.ts`:logical_model → 可服务 key 列表
- `router.test.ts`:三层回退全分支覆盖
- `fallback.test.ts`:候选链行为与 Toast payload
- `prober.test.ts`:mock provider /models,覆盖 401/429/成功
- `costEstimator.test.ts`:价格表查询正确

### 11.2 集成测试
- 端到端调用:mock provider → router → call_history 写入
- Wizard 流程:粘贴 key → 能力发现异步完成 → UI 反映已解锁模型
- pg_cron retention:30+ 天数据被清理(Supabase 测试 DB)

### 11.3 E2E(Playwright)
- Onboarding Wizard 三步完整流程
- Canvas 中选择未解锁模型 → 跳转 KeyManager
- 场景默认 key → 生成确实走该 key
- 故意失败首选 → 观察 Toast + fallback 成功

### 11.4 Mock 策略
- `src/test/mocks/providers/` 下为每个 provider 准备 mock server
- 所有测试禁止消耗真实 API 额度

---

## 12. 分期交付(5 Milestones)

### M1 — 基础设施(无 UI 变化,向后兼容)
- Supabase migration:`api_keys` 扩展 + 4 张新表 + pg_cron retention
- `src/config/provider-catalog.ts` + `pricing-table.ts` 初版
- `src/server/ai/providers/openaiCompat.ts`(统一适配器)
- provider registry 支持 `custom:<uuid>` 动态 provider
- 单元测试覆盖
- **Exit Criteria**:现有 Canvas 生成全部跑通,新 schema 就位,`npx tsc --noEmit` 通过

### M2 — BYOK + 能力探测
- API:`POST /api/settings/api-keys`(支持 `base_url`、`protocol`)+ `/probe`
- `KeyManager` UI(列表 + 增删 + 状态徽章 + 能力清单)
- Capability prober(连通测试 + `/v1/models` 发现)
- 后台异步探测任务
- 单元 + 集成测试
- **Exit Criteria**:用户可手动添加 key 并看到"已解锁模型"清单,但尚未接入智能路由

### M3 — 路由引擎 + 偏好
- `src/features/routing/` feature 模块实现
- `scoring` / `candidates` / `router` / `fallback` 完整逻辑
- `model_call_history` 写入链路
- 现有 API routes 接入 router
- `ScenarioDefaults` + `ModelPreferences` UI
- 失败 Toast 前端打通
- 单元 + 集成 + 部分 E2E
- **Exit Criteria**:多 key 场景下系统自动选优,三层偏好可配置且生效

### M4 — 引导与 Canvas UX
- Aggregator manifest 结构 + 上传 Supabase Storage + 远程 JSON 拉取
- fallback 快照 + 24h 客户端缓存
- `aggregatorManifestStore.ts`
- `OnboardingWizard` 组件
- `ModelPicker` 改造:仅显示模型名 + 🔒 弱化态 + 点击跳转
- E2E 完整覆盖
- **Exit Criteria**:小白用户 3 步完成配置,Canvas 符合"只显示模型"

### M5 — 成本看板 + 收尾
- `CostSummaryPanel` + 历史面板
- API:`GET /api/settings/call-history` 及 usage aggregation
- 性能优化(索引 + 分页)
- 文档:`docs/extensions/add-aggregator.md` + `docs/api/routing.md` 更新
- 全量回归
- **Exit Criteria**:完整版上线,文档同步

### 依赖关系
```
M1 → M2 → M3 → M4 → M5
            ↑
         可并行设计 M4 UI 原型
```

---

## 13. 风险与未决事项

| 风险 | 缓解 |
|------|------|
| 部分中转站 `/v1/models` 返回 1000+ 模型,UI 压力大 | KeyManager 中加"勾选启用"筛选;首次只默认勾 top N 常用 |
| 用户误删关键 key 导致历史 `key_id` 悬空 | `model_call_history.key_id` 允许 NULL,查询时 LEFT JOIN |
| manifest 远程拉取失败 | fallback 到打包快照;失败也不阻塞使用 |
| 能力探测消耗用户额度 | 连通测试优先选零成本端点;速度基线仅手动触发 |
| 评分冷启动数据不足 | 数据 < 5 次时使用 pricing-table 静态基线 |
| 自定义端点返回非标模型 ID(与逻辑模型映射不上) | 在 KeyManager 中提供"别名映射"兜底(P2) |

---

## 14. 附录

### 14.1 参考文件

- 现有 BYOK:`src/server/ai/keyFetcher.ts`、`src/server/ai/keyRotationHelper.ts`
- 现有模型注册:`src/features/canvas/models/registry.ts`
- 现有 provider:`src/server/ai/providers/{kie,fal,grsai}.ts`
- 现有设置页:`src/app/(app)/settings/page.tsx`
- 架构规范:`docs/architecture/layering.md`
- 扩展指南:`docs/extensions/add-provider.md`、`docs/extensions/add-model.md`

### 14.2 开放问题(待实施阶段再定)

- 速度基线测试的具体请求形态(每个场景一个最小样例?)
- 模型级偏好的 UI 形态(全量模型列表 or "已配置的偏好"增量式?)
- 用户删除 key 时的级联策略(硬删还是软删留历史?)

---
