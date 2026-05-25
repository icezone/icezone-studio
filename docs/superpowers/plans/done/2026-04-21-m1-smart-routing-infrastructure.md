# M1 — 智能路由基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为"智能 API 路由与自动适配系统"铺设数据与适配层基础(Supabase schema 扩展 + OpenAI-compat 统一适配器 + 静态配置),无 UI 变更,现有 Canvas 生成全链路保持兼容。

**Architecture:** 在现有 Ports & Adapters 架构上 **增量** 扩展:(1) Supabase migration 015 扩展 `user_api_keys` 并新增 3 张路由相关表 + pg_cron 保留任务;(2) 新增 `src/config/` 下三份静态资源(价格表、provider capability catalog、aggregator manifest fallback 快照);(3) 新增 `src/server/ai/providers/openaiCompat.ts` 作为 OpenAI-compat 协议统一适配器工厂;(4) 扩展 `src/server/ai/providers/registry.ts` 支持 `custom:<uuid>` 动态 provider 解析。本阶段 **不** 接入任何现有 API route,也 **不** 改变 UI。

**Tech Stack:** Next.js 15 + TypeScript + Supabase(Postgres + pg_cron)+ Vitest + 现有 AES-256-CBC key 加解密。

**Spec Reference:** `docs/superpowers/specs/2026-04-21-smart-api-routing-design.md`(§5 数据模型、§6.3 Infrastructure、§6.4 配置、§12 M1)

---

## File Structure

### 新增文件

| 文件 | 责任 |
|------|------|
| `supabase/migrations/015_smart_routing_schema.sql` | 扩展 `user_api_keys` 字段 + 创建 `user_key_capabilities` / `model_call_history` / `routing_preferences` 表 + RLS policy + pg_cron retention |
| `src/config/pricing-table.ts` | 静态价格表:`logical_model_id → priceCents`(按次计费估算,成本排序用) |
| `src/config/pricing-table.test.ts` | 价格表结构与查询函数的单元测试 |
| `src/config/provider-catalog.ts` | 内置 provider capability 目录:`providerId → logical_model_id[]`(非 OpenAI-compat provider 的能力静态声明) |
| `src/config/provider-catalog.test.ts` | catalog 结构与查询函数的单元测试 |
| `src/config/aggregator-manifest.ts` | 远程 manifest 拉取失败时使用的打包 fallback 快照 |
| `src/config/aggregator-manifest.test.ts` | manifest 结构完整性的单元测试 |
| `src/server/ai/providers/openaiCompat.ts` | OpenAI-compat 协议适配器:`createOpenAICompatProvider(...)` 工厂 + `listOpenAICompatModels(...)` 探测辅助 |
| `src/server/ai/providers/openaiCompat.test.ts` | 工厂与探测辅助的单元测试(mock fetch) |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/server/ai/providers/registry.ts` | 新增 `resolveProvider(providerId, context)`:对 `custom:<uuid>` 前缀的 providerId 通过 `createOpenAICompatProvider` 动态构造;保留原 `getProvider` 用于内置 provider |
| `src/server/ai/providers/registry.test.ts`(新建) | 静态查询 + 动态解析双路径测试 |

### 不在 M1 范围(显式声明)

- ❌ 不新建 `src/features/routing/`(M3 再做)
- ❌ 不改 `src/app/api/settings/api-keys/route.ts`(M2)
- ❌ 不改 `src/features/canvas/models/registry.ts` 聚合逻辑(M3)
- ❌ 不改任何 UI 组件(M2/M4)
- ❌ 不改任何 `/api/ai/**` route 内部实现(M3)

---

## Task 1: Supabase Migration 015 — Schema 扩展

**Files:**
- Create: `supabase/migrations/015_smart_routing_schema.sql`

### 背景
现有 `user_api_keys` 表(migration 008 + 011)已有 `user_id / provider / encrypted_key / iv / key_index / status / error_count / last_error / last_used_at / created_at / updated_at`。本次新增 4 个可空列(完全向后兼容),并新建 3 张表。

- [ ] **Step 1:创建 migration 文件**

Create file `supabase/migrations/015_smart_routing_schema.sql` with the following content:

```sql
-- 015_smart_routing_schema: 为智能 API 路由系统铺设数据基础
--
-- 变更内容:
-- 1) 扩展 user_api_keys 支持自定义 OpenAI-compat 端点
-- 2) 新增 user_key_capabilities(能力探测缓存)
-- 3) 新增 model_call_history(30 天调用历史,评分数据源)
-- 4) 新增 routing_preferences(三层偏好:模型级 / 场景级)
-- 5) pg_cron 定期清理 30+ 天历史

-- ============================================================================
-- 1. 扩展 user_api_keys
-- ============================================================================

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS base_url text,
  ADD COLUMN IF NOT EXISTS protocol text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

COMMENT ON COLUMN public.user_api_keys.base_url IS
  '自定义端点 URL(仅 protocol=openai-compat 时使用);内置 provider 保持 NULL';
COMMENT ON COLUMN public.user_api_keys.protocol IS
  '协议类型:native(内置 provider 专有协议) | openai-compat';
COMMENT ON COLUMN public.user_api_keys.display_name IS
  '用户自定义显示名;为空时前端使用 provider 名';
COMMENT ON COLUMN public.user_api_keys.last_verified_at IS
  '最近一次连通性测试通过的时间戳';

-- ============================================================================
-- 2. user_key_capabilities(能力探测缓存,key 删除时级联)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_key_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.user_api_keys ON DELETE CASCADE,
  logical_model_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('probed', 'catalog')),
  discovered_at timestamptz DEFAULT now(),
  UNIQUE(key_id, logical_model_id)
);

CREATE INDEX IF NOT EXISTS idx_capabilities_key
  ON public.user_key_capabilities(key_id);

ALTER TABLE public.user_key_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own key capabilities"
  ON public.user_key_capabilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own key capabilities"
  ON public.user_key_capabilities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own key capabilities"
  ON public.user_key_capabilities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own key capabilities"
  ON public.user_key_capabilities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. model_call_history(30 天历史;key 删除时 key_id 置 NULL,保留历史)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  key_id uuid REFERENCES public.user_api_keys ON DELETE SET NULL,
  logical_model_id text NOT NULL,
  scenario text NOT NULL CHECK (scenario IN ('text', 'image', 'video', 'analysis', 'edit')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
  latency_ms integer,
  error_code text,
  cost_estimate_cents integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_user_model_time
  ON public.model_call_history(user_id, logical_model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_user_key_time
  ON public.model_call_history(user_id, key_id, created_at DESC);

ALTER TABLE public.model_call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call history"
  ON public.model_call_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. routing_preferences(三层:模型级 / 场景级)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.routing_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  level text NOT NULL CHECK (level IN ('model', 'scenario')),
  target text NOT NULL,
  preferred_key_id uuid REFERENCES public.user_api_keys ON DELETE SET NULL,
  fallback_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, level, target)
);

CREATE INDEX IF NOT EXISTS idx_routing_prefs_user
  ON public.routing_preferences(user_id);

ALTER TABLE public.routing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routing prefs"
  ON public.routing_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. pg_cron 定期清理(30 天保留)
-- ============================================================================
-- 前置:Supabase 已开启 pg_cron extension。
-- 每天凌晨 3 点(UTC)清理超过 30 天的历史。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-model-call-history',
      '0 3 * * *',
      $cron$ DELETE FROM public.model_call_history WHERE created_at < now() - interval '30 days' $cron$
    );
  END IF;
END $$;
```

- [ ] **Step 2:本地验证 migration 语法(不执行,仅编译检查)**

Run: `npx supabase db lint supabase/migrations/015_smart_routing_schema.sql 2>&1 || echo "supabase CLI not available, skipping lint"`
Expected: 无语法错误输出,或 CLI 不存在提示(可忽略)

- [ ] **Step 3:应用到本地/开发 Supabase(由执行者手动完成)**

```bash
# 选项 A:Supabase CLI
npx supabase db push

# 选项 B:直接在 Supabase Studio 的 SQL Editor 中粘贴 015 的内容执行
```

Expected: 3 张新表出现在 public schema,`user_api_keys` 多出 4 个列

- [ ] **Step 4:提交 migration**

```bash
git add supabase/migrations/015_smart_routing_schema.sql
git commit -m "feat(db): add smart routing schema (migration 015)

- Extend user_api_keys with base_url, protocol, display_name, last_verified_at
- Add user_key_capabilities / model_call_history / routing_preferences tables
- Add RLS policies scoped per-user
- Schedule pg_cron job to purge 30+ day call history

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

Expected: commit 创建成功

---

## Task 2: 静态价格表 `src/config/pricing-table.ts`

**Files:**
- Create: `src/config/pricing-table.ts`
- Test: `src/config/pricing-table.test.ts`

### 目标
提供 `logical_model_id → 每次调用估算成本(cents)` 的查表能力。数据来源:当前 provider 官网报价的平均值(可后续由 Claude Code 远程更新)。

- [ ] **Step 1:先写失败测试**

Create file `src/config/pricing-table.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  PRICING_TABLE,
  getModelPriceCents,
  type PriceEntry,
} from './pricing-table';

describe('pricing-table', () => {
  it('应该为已知逻辑模型返回非负整数 cents', () => {
    expect(getModelPriceCents('nano-banana-pro')).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(getModelPriceCents('nano-banana-pro'))).toBe(true);
  });

  it('应该为未知逻辑模型返回默认值 0', () => {
    expect(getModelPriceCents('unknown-model-xyz')).toBe(0);
  });

  it('PRICING_TABLE 每个条目结构正确', () => {
    for (const [modelId, entry] of Object.entries(PRICING_TABLE)) {
      expect(typeof modelId).toBe('string');
      expect(modelId.length).toBeGreaterThan(0);
      const typed = entry as PriceEntry;
      expect(typed.priceCents).toBeGreaterThanOrEqual(0);
      expect(['image', 'video', 'text', 'analysis']).toContain(typed.scenario);
    }
  });

  it('应该包含至少一个图片模型和一个视频模型', () => {
    const scenarios = Object.values(PRICING_TABLE).map((e) => e.scenario);
    expect(scenarios).toContain('image');
    expect(scenarios).toContain('video');
  });
});
```

- [ ] **Step 2:运行测试确认失败**

Run: `npx vitest run src/config/pricing-table.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3:实现最小代码**

Create file `src/config/pricing-table.ts`:

```typescript
/**
 * 静态价格表 — 每个逻辑模型单次调用的估算成本(cents)。
 *
 * 数据来源:provider 官网报价的常用档位平均值。
 * 维护方式:Claude Code 远程提交 PR 更新。
 * 用途:路由引擎排序时的成本维度输入(src/features/routing/,M3)。
 */

export type PricingScenario = 'image' | 'video' | 'text' | 'analysis';

export interface PriceEntry {
  priceCents: number;
  scenario: PricingScenario;
  /** 人类可读的备注(计费口径,如 "per 1M input tokens","per image") */
  unit?: string;
}

/**
 * 价格条目:key 为 logical model id(与 canvas models registry 一致)。
 * 初版覆盖主要图片/视频/LLM 模型;缺失的模型返回 0(成本维度中性)。
 */
export const PRICING_TABLE: Readonly<Record<string, PriceEntry>> = {
  // 图片(按张)
  'nano-banana-2': { priceCents: 4, scenario: 'image', unit: 'per image' },
  'nano-banana-pro': { priceCents: 20, scenario: 'image', unit: 'per image' },
  'grok-image': { priceCents: 7, scenario: 'image', unit: 'per image' },
  'gemini-3.1-flash': { priceCents: 3, scenario: 'image', unit: 'per image' },

  // 视频(按秒的平均值 × 典型 5s)
  'kling-3.0': { priceCents: 75, scenario: 'video', unit: 'per 5s clip' },
  'sora2-pro': { priceCents: 150, scenario: 'video', unit: 'per 5s clip' },
  'veo-3': { priceCents: 100, scenario: 'video', unit: 'per 5s clip' },
  'seedance': { priceCents: 60, scenario: 'video', unit: 'per 5s clip' },

  // LLM(按 1M input tokens 的估算,M3 实际路由时会按 token 数再计算)
  'gemini-2.5-flash': { priceCents: 8, scenario: 'text', unit: 'per 1M input tokens' },
  'claude-3.5-sonnet': { priceCents: 300, scenario: 'text', unit: 'per 1M input tokens' },
  'gpt-4o': { priceCents: 250, scenario: 'text', unit: 'per 1M input tokens' },

  // 分析(Gemini Vision)
  'gemini-vision': { priceCents: 5, scenario: 'analysis', unit: 'per analysis' },
};

/**
 * 查询某个逻辑模型的单次成本估算(cents)。
 * 未知模型返回 0(在排序中被视作"成本中性",不影响相对排名)。
 */
export function getModelPriceCents(logicalModelId: string): number {
  return PRICING_TABLE[logicalModelId]?.priceCents ?? 0;
}
```

- [ ] **Step 4:运行测试确认通过**

Run: `npx vitest run src/config/pricing-table.test.ts`
Expected: PASS(4 tests)

- [ ] **Step 5:提交**

```bash
git add src/config/pricing-table.ts src/config/pricing-table.test.ts
git commit -m "feat(config): add static pricing table for smart routing

Per-logical-model cost estimates (cents) used by the routing engine
(M3) to rank key candidates along the cost dimension.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

Expected: commit 创建成功

---

## Task 3: 静态 Provider Capability Catalog

**Files:**
- Create: `src/config/provider-catalog.ts`
- Test: `src/config/provider-catalog.test.ts`

### 目标
内置(非 OpenAI-compat)provider 没有统一的 `/v1/models` 端点,因此需要静态声明"kie 这家支持哪些逻辑模型"。M2 的能力探测会查这份 catalog。

- [ ] **Step 1:先写失败测试**

Create file `src/config/provider-catalog.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  PROVIDER_CATALOG,
  getProviderCapabilities,
  listProvidersForModel,
} from './provider-catalog';

describe('provider-catalog', () => {
  it('应该为已知 provider 返回逻辑模型清单', () => {
    const caps = getProviderCapabilities('kie');
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('应该为未知 provider 返回空数组', () => {
    expect(getProviderCapabilities('unknown-xyz')).toEqual([]);
  });

  it('listProvidersForModel 应该反查所有支持该模型的 provider', () => {
    // 根据设计,nano-banana-2 在 kie/fal/grsai 均有 binding
    const providers = listProvidersForModel('nano-banana-2');
    expect(providers).toEqual(expect.arrayContaining(['kie', 'fal', 'grsai']));
  });

  it('反查未知模型返回空数组', () => {
    expect(listProvidersForModel('nothing-here')).toEqual([]);
  });

  it('PROVIDER_CATALOG 所有条目结构合法', () => {
    for (const [providerId, entry] of Object.entries(PROVIDER_CATALOG)) {
      expect(typeof providerId).toBe('string');
      expect(Array.isArray(entry.logicalModels)).toBe(true);
      expect(['native', 'openai-compat']).toContain(entry.protocol);
    }
  });
});
```

- [ ] **Step 2:运行测试确认失败**

Run: `npx vitest run src/config/provider-catalog.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3:实现**

Create file `src/config/provider-catalog.ts`:

```typescript
/**
 * 内置 Provider Capability Catalog
 *
 * 声明每个内置 provider(如 kie、fal、grsai、kling、ppio、veo、sora2)
 * 可服务的逻辑模型清单。自定义 OpenAI-compat 端点不在此表中,由动态
 * 能力探测(M2)通过 /v1/models 发现。
 *
 * 维护:新增 provider × logical_model binding 时同步更新。
 */

export type ProviderProtocol = 'native' | 'openai-compat';

export interface ProviderCatalogEntry {
  protocol: ProviderProtocol;
  logicalModels: readonly string[];
}

export const PROVIDER_CATALOG: Readonly<Record<string, ProviderCatalogEntry>> = {
  kie: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro', 'grok-image'],
  },
  fal: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro'],
  },
  grsai: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro'],
  },
  ppio: {
    protocol: 'native',
    logicalModels: ['gemini-3.1-flash'],
  },
  kling: {
    protocol: 'native',
    logicalModels: ['kling-3.0'],
  },
  sora2: {
    protocol: 'native',
    logicalModels: ['sora2-pro'],
  },
  veo: {
    protocol: 'native',
    logicalModels: ['veo-3'],
  },
};

/**
 * 查某个 provider 支持的逻辑模型列表。
 */
export function getProviderCapabilities(providerId: string): readonly string[] {
  return PROVIDER_CATALOG[providerId]?.logicalModels ?? [];
}

/**
 * 反查:某个逻辑模型有哪些内置 provider 能服务。
 * 用于 M3 的 candidates 过滤(结合用户的 key 清单求交集)。
 */
export function listProvidersForModel(logicalModelId: string): string[] {
  const result: string[] = [];
  for (const [providerId, entry] of Object.entries(PROVIDER_CATALOG)) {
    if (entry.logicalModels.includes(logicalModelId)) {
      result.push(providerId);
    }
  }
  return result;
}
```

- [ ] **Step 4:运行测试确认通过**

Run: `npx vitest run src/config/provider-catalog.test.ts`
Expected: PASS(5 tests)

- [ ] **Step 5:提交**

```bash
git add src/config/provider-catalog.ts src/config/provider-catalog.test.ts
git commit -m "feat(config): add static provider capability catalog

Declares built-in providers and the logical models each can serve.
Used by M2 capability probing for native (non-OpenAI-compat) providers.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Aggregator Manifest Fallback 快照

**Files:**
- Create: `src/config/aggregator-manifest.ts`
- Test: `src/config/aggregator-manifest.test.ts`

### 目标
提供"推荐聚合器清单"的打包快照,作为远程 manifest(Supabase Storage,M4 接入)拉取失败时的 fallback。M1 只实现快照本体和查询函数,不做远程拉取。

- [ ] **Step 1:先写失败测试**

Create file `src/config/aggregator-manifest.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_AGGREGATOR_MANIFEST,
  listRecommendedAggregators,
  getAggregatorById,
  type AggregatorDescriptor,
} from './aggregator-manifest';

describe('aggregator-manifest', () => {
  it('fallback manifest 包含 version 与非空 aggregators 数组', () => {
    expect(FALLBACK_AGGREGATOR_MANIFEST.version).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(Array.isArray(FALLBACK_AGGREGATOR_MANIFEST.aggregators)).toBe(true);
    expect(FALLBACK_AGGREGATOR_MANIFEST.aggregators.length).toBeGreaterThan(0);
  });

  it('每个 aggregator 条目字段完整', () => {
    for (const agg of FALLBACK_AGGREGATOR_MANIFEST.aggregators) {
      const a = agg as AggregatorDescriptor;
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(['native', 'openai-compat']).toContain(a.protocol);
      expect(Array.isArray(a.categories)).toBe(true);
      expect(typeof a.recommended).toBe('boolean');
    }
  });

  it('listRecommendedAggregators 只返回 recommended=true 的条目', () => {
    const recs = listRecommendedAggregators();
    expect(recs.every((a) => a.recommended)).toBe(true);
  });

  it('getAggregatorById 能根据 id 查到已知条目', () => {
    const first = FALLBACK_AGGREGATOR_MANIFEST.aggregators[0];
    expect(getAggregatorById(first.id)?.id).toBe(first.id);
  });

  it('getAggregatorById 对未知 id 返回 undefined', () => {
    expect(getAggregatorById('no-such-aggregator')).toBeUndefined();
  });
});
```

- [ ] **Step 2:运行测试确认失败**

Run: `npx vitest run src/config/aggregator-manifest.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3:实现**

Create file `src/config/aggregator-manifest.ts`:

```typescript
/**
 * 推荐聚合器清单 — Fallback 快照
 *
 * 远程 manifest 存在 Supabase Storage(M4 接入),前端每 24h 刷新一次本地缓存。
 * 本文件为打包进 bundle 的兜底快照,在:
 *   1) 首次打开应用、尚无本地缓存
 *   2) 远程拉取失败
 * 两种情况下使用,保证 Onboarding Wizard 始终有可用数据。
 *
 * 维护:Claude Code 远程 PR 更新;每次更新后 version 字段递增(YYYY.MM.DD 格式)。
 */

export type ProviderProtocol = 'native' | 'openai-compat';
export type ScenarioCategory = 'llm' | 'image' | 'video' | 'analysis';
export type PriceTier = 'low' | 'mid' | 'high';

export interface AggregatorDescriptor {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl?: string;
  getKeyUrl: string;
  categories: readonly ScenarioCategory[];
  priceTier: Partial<Record<ScenarioCategory, PriceTier>>;
  /** 0–100 的经验可靠度基线,会被用户本地历史覆盖(M3) */
  reliabilityScore: number;
  recommended: boolean;
  recommendBundles: readonly string[];
  description?: string;
}

export interface AggregatorManifest {
  version: string;
  updatedAt: string;
  aggregators: readonly AggregatorDescriptor[];
}

/**
 * 打包快照 — M1 初版。
 */
export const FALLBACK_AGGREGATOR_MANIFEST: AggregatorManifest = {
  version: '2026.04.21',
  updatedAt: '2026-04-21T00:00:00Z',
  aggregators: [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      protocol: 'openai-compat',
      baseUrl: 'https://openrouter.ai/api/v1',
      getKeyUrl: 'https://openrouter.ai/keys',
      categories: ['llm'],
      priceTier: { llm: 'mid' },
      reliabilityScore: 95,
      recommended: true,
      recommendBundles: ['starter', 'llm-heavy'],
      description: '全球主流 LLM 聚合(Claude / GPT / Gemini 等)',
    },
    {
      id: 'kie',
      name: 'KIE 中转',
      protocol: 'native',
      getKeyUrl: 'https://kieai.erp.mofasuan.com',
      categories: ['image', 'video'],
      priceTier: { image: 'low', video: 'mid' },
      reliabilityScore: 88,
      recommended: true,
      recommendBundles: ['starter'],
      description: 'Nano Banana / 视频模型价格友好',
    },
    {
      id: 'fal',
      name: 'fal.ai',
      protocol: 'native',
      getKeyUrl: 'https://fal.ai/dashboard/keys',
      categories: ['image'],
      priceTier: { image: 'mid' },
      reliabilityScore: 92,
      recommended: false,
      recommendBundles: [],
      description: '图片模型官方渠道',
    },
    {
      id: 'running-hub',
      name: 'RunningHub',
      protocol: 'native',
      getKeyUrl: 'https://runninghub.ai',
      categories: ['video'],
      priceTier: { video: 'low' },
      reliabilityScore: 80,
      recommended: true,
      recommendBundles: ['video-focused'],
      description: '视频生成中转,价格低廉',
    },
  ],
};

export function listRecommendedAggregators(): readonly AggregatorDescriptor[] {
  return FALLBACK_AGGREGATOR_MANIFEST.aggregators.filter((a) => a.recommended);
}

export function getAggregatorById(id: string): AggregatorDescriptor | undefined {
  return FALLBACK_AGGREGATOR_MANIFEST.aggregators.find((a) => a.id === id);
}
```

- [ ] **Step 4:运行测试确认通过**

Run: `npx vitest run src/config/aggregator-manifest.test.ts`
Expected: PASS(5 tests)

- [ ] **Step 5:提交**

```bash
git add src/config/aggregator-manifest.ts src/config/aggregator-manifest.test.ts
git commit -m "feat(config): add fallback aggregator manifest snapshot

Bundled recommended-aggregator list for the onboarding wizard (M4).
Used when the remote manifest (Supabase Storage) is unavailable.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: OpenAI-compat 统一适配器

**Files:**
- Create: `src/server/ai/providers/openaiCompat.ts`
- Test: `src/server/ai/providers/openaiCompat.test.ts`

### 目标
实现 OpenAI-compat 协议的 provider 工厂 `createOpenAICompatProvider(...)`,供:(1) M3 路由调用自定义端点;(2) M2 能力探测 `listOpenAICompatModels(...)`。M1 仅实现 `chat.completions` 路径(LLM 文本),图片/视频的 OpenAI-compat 支持在后续 milestone 再扩。

- [ ] **Step 1:先写失败测试**

Create file `src/server/ai/providers/openaiCompat.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  createOpenAICompatProvider,
  listOpenAICompatModels,
  type ChatCompletionRequest,
} from './openaiCompat';

describe('openaiCompat', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listOpenAICompatModels', () => {
    it('应该从 /v1/models 解析出模型 id 列表', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4o', object: 'model' },
            { id: 'claude-3.5-sonnet', object: 'model' },
          ],
        }),
      });

      const models = await listOpenAICompatModels(
        'https://api.example.com/v1',
        'sk-test'
      );

      expect(models).toEqual(['gpt-4o', 'claude-3.5-sonnet']);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
          }),
        })
      );
    });

    it('应该正确处理末尾带斜杠的 baseUrl', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await listOpenAICompatModels('https://api.example.com/v1/', 'sk-test');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.anything()
      );
    });

    it('HTTP 401 应该抛出带状态码的错误', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid key',
      });

      await expect(
        listOpenAICompatModels('https://api.example.com/v1', 'bad-key')
      ).rejects.toThrow(/401/);
    });

    it('data 为空时返回空数组', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const models = await listOpenAICompatModels(
        'https://api.example.com/v1',
        'sk-test'
      );
      expect(models).toEqual([]);
    });
  });

  describe('createOpenAICompatProvider', () => {
    it('factory 返回带 id/name 的 AIProvider', () => {
      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      expect(provider.id).toBe('custom:abc');
      expect(provider.name).toBe('custom:abc');
      expect(typeof provider.generate).toBe('function');
    });

    it('chatComplete 调用正确的 endpoint 并解析第一条 message', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { role: 'assistant', content: 'Hello!' } },
          ],
        }),
      });

      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      const req: ChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };
      const result = await provider.chatComplete!(req);

      expect(result.content).toBe('Hello!');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('chatComplete 遇到 HTTP 500 抛错', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'oops',
      });

      const provider = createOpenAICompatProvider({
        id: 'custom:abc',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
      });

      await expect(
        provider.chatComplete!({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow(/500/);
    });
  });
});
```

- [ ] **Step 2:运行测试确认失败**

Run: `npx vitest run src/server/ai/providers/openaiCompat.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3:实现**

Create file `src/server/ai/providers/openaiCompat.ts`:

```typescript
/**
 * OpenAI-compat 协议统一适配器
 *
 * 用于用户自定义的 OpenAI 兼容端点(如 OpenRouter / OhMyGPT / 各类 LLM 中转站),
 * 以及支持 OpenAI-compat 协议的图片/视频 endpoint。
 *
 * 当前实现范围(M1):
 *   - listOpenAICompatModels:GET /v1/models(供 M2 能力探测)
 *   - createOpenAICompatProvider → chatComplete:POST /v1/chat/completions
 *
 * 非 M1 范围:
 *   - POST /v1/images/generations(M3 按需扩)
 *   - 其他厂商专有扩展字段(按需适配)
 */

import type { AIProvider } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: false; // M1 仅同步;流式在后续 milestone 接入
}

export interface ChatCompletionResult {
  content: string;
  /** 原始响应,便于上层获取 usage / finish_reason */
  raw: unknown;
}

/**
 * 带 chatComplete 扩展的 AIProvider(OpenAI-compat 特有)。
 * 非 OpenAI-compat 的内置 provider 不实现 chatComplete。
 */
export interface OpenAICompatProvider extends AIProvider {
  chatComplete?: (request: ChatCompletionRequest) => Promise<ChatCompletionResult>;
}

/**
 * 规范化 baseUrl:去掉结尾斜杠。
 */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * GET /v1/models — 列出该 key 能访问的模型 id。
 * 错误(含 401/429/5xx)会抛出 `Error(`openaiCompat list-models <status>: <body>`)`,
 * 由调用方决定如何分类(M2 能力探测会据此标记 key 状态)。
 */
export async function listOpenAICompatModels(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`openaiCompat list-models ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  const list = data.data ?? [];
  return list.map((m) => m.id).filter((id): id is string => typeof id === 'string');
}

/**
 * 创建一个 OpenAI-compat provider 实例。
 *
 * 注意:本工厂为每次路由调用 **动态构造** 一个实例(不缓存),因为:
 *   - apiKey 来自每请求解密,不适合长期持有
 *   - baseUrl 可能因用户更新而变
 */
export function createOpenAICompatProvider(opts: {
  id: string;
  baseUrl: string;
  apiKey: string;
}): OpenAICompatProvider {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);

  return {
    id: opts.id,
    name: opts.id,

    async chatComplete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const url = `${baseUrl}/chat/completions`;

      const body: Record<string, unknown> = {
        model: request.model,
        messages: request.messages,
      };
      if (request.temperature !== undefined) body.temperature = request.temperature;
      if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        throw new Error(
          `openaiCompat chat-completions ${response.status}: ${errBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      return { content, raw: data };
    },
  };
}
```

- [ ] **Step 4:运行测试确认通过**

Run: `npx vitest run src/server/ai/providers/openaiCompat.test.ts`
Expected: PASS(7 tests)

- [ ] **Step 5:提交**

```bash
git add src/server/ai/providers/openaiCompat.ts src/server/ai/providers/openaiCompat.test.ts
git commit -m "feat(server): add OpenAI-compat unified provider adapter

Factory (createOpenAICompatProvider) and discovery helper
(listOpenAICompatModels) used by M2 capability probing and M3
routing for user-defined OpenAI-compatible endpoints.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 扩展 Provider Registry 支持 custom:<uuid>

**Files:**
- Modify: `src/server/ai/providers/registry.ts`
- Test: `src/server/ai/providers/registry.test.ts`(新建)

### 目标
`resolveProvider(providerId, context)`:对 `custom:<uuid>` 前缀的 providerId,通过 `createOpenAICompatProvider` 动态构造;内置 provider 继续用现有 `getProvider` 路径。保持 `getProvider / registerProvider` API 不变,**零破坏**。

- [ ] **Step 1:先写失败测试**

Create file `src/server/ai/providers/registry.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import type { AIProvider } from './types';
import {
  registerProvider,
  getProvider,
  resolveProvider,
  clearProvidersForTest,
} from './registry';

const fakeKieProvider: AIProvider = { id: 'kie', name: 'kie' };

describe('registry', () => {
  beforeEach(() => {
    clearProvidersForTest();
  });

  it('registerProvider + getProvider 保持原行为', () => {
    registerProvider(fakeKieProvider);
    expect(getProvider('kie')?.id).toBe('kie');
    expect(getProvider('missing')).toBeUndefined();
  });

  it('resolveProvider 对内置 id 走静态查询', () => {
    registerProvider(fakeKieProvider);
    const p = resolveProvider('kie', {});
    expect(p?.id).toBe('kie');
  });

  it('resolveProvider 对 custom:<uuid> 前缀动态构造', () => {
    const p = resolveProvider('custom:a1b2c3d4', {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
    });

    expect(p?.id).toBe('custom:a1b2c3d4');
    // OpenAICompatProvider 应该具备 chatComplete 方法
    expect(typeof (p as { chatComplete?: unknown }).chatComplete).toBe('function');
  });

  it('resolveProvider 对 custom:<uuid> 缺少 baseUrl 抛错', () => {
    expect(() =>
      resolveProvider('custom:abc', { apiKey: 'sk' })
    ).toThrow(/baseUrl/);
  });

  it('resolveProvider 对 custom:<uuid> 缺少 apiKey 抛错', () => {
    expect(() =>
      resolveProvider('custom:abc', { baseUrl: 'https://x' })
    ).toThrow(/apiKey/);
  });

  it('resolveProvider 对未注册且非 custom 前缀的 id 返回 undefined', () => {
    expect(resolveProvider('no-such', {})).toBeUndefined();
  });
});
```

- [ ] **Step 2:运行测试确认失败**

Run: `npx vitest run src/server/ai/providers/registry.test.ts`
Expected: FAIL — `resolveProvider / clearProvidersForTest` not exported

- [ ] **Step 3:修改 `src/server/ai/providers/registry.ts`**

Replace current content with:

```typescript
import type { AIProvider } from './types';
import { createOpenAICompatProvider } from './openaiCompat';

const providers = new Map<string, AIProvider>();

/** 前缀判定:custom:<uuid> 表示用户自定义 OpenAI-compat 端点 */
const CUSTOM_PROVIDER_PREFIX = 'custom:';

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export interface ResolveProviderContext {
  /** custom:<uuid> 时必填;内置 provider 可省略 */
  baseUrl?: string;
  /** custom:<uuid> 时必填;内置 provider 从 env / user_api_keys 解析,不经此处 */
  apiKey?: string;
}

/**
 * 按 providerId 解析 provider 实例:
 *   - 以 `custom:` 开头 → 动态构造 OpenAI-compat 实例(要求 baseUrl + apiKey)
 *   - 否则 → 查静态注册表(内置 provider)
 *
 * 非 custom 且未注册的 id 返回 undefined(调用方决定如何处理)。
 */
export function resolveProvider(
  providerId: string,
  context: ResolveProviderContext
): AIProvider | undefined {
  if (providerId.startsWith(CUSTOM_PROVIDER_PREFIX)) {
    if (!context.baseUrl) {
      throw new Error(
        `resolveProvider: custom provider "${providerId}" requires baseUrl`
      );
    }
    if (!context.apiKey) {
      throw new Error(
        `resolveProvider: custom provider "${providerId}" requires apiKey`
      );
    }
    return createOpenAICompatProvider({
      id: providerId,
      baseUrl: context.baseUrl,
      apiKey: context.apiKey,
    });
  }

  return providers.get(providerId);
}

/**
 * 仅测试环境使用:重置注册表,保证测试用例互不污染。
 * 生产代码请勿调用。
 */
export function clearProvidersForTest(): void {
  providers.clear();
}
```

- [ ] **Step 4:运行测试确认通过**

Run: `npx vitest run src/server/ai/providers/registry.test.ts`
Expected: PASS(6 tests)

- [ ] **Step 5:提交**

```bash
git add src/server/ai/providers/registry.ts src/server/ai/providers/registry.test.ts
git commit -m "feat(server): resolve custom:<uuid> provider IDs dynamically

resolveProvider() routes custom:<uuid> providerIds through the
OpenAI-compat adapter factory; built-in providers continue to
use the static registry. getProvider/registerProvider unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 全量回归验证(Exit Criteria)

**Files:** 无新增,只跑命令

- [ ] **Step 1:TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误输出(exit code 0)

如果报错:根据报错信息修正对应文件,修正后重跑本 step。

- [ ] **Step 2:全部 Vitest 测试通过**

Run: `npx vitest run`
Expected: 所有测试 PASS;M1 新增的 5 个测试文件(pricing-table / provider-catalog / aggregator-manifest / openaiCompat / registry)均绿色

如有现有测试因 registry.ts 修改而失败:检查测试是否依赖被移除/重命名的 API(应该不会,因为我们保持 `getProvider / registerProvider / getAllProviders` 完全不变)。

- [ ] **Step 3:ESLint 通过(如有 lint 脚本)**

Run: `npm run lint 2>&1 | tail -30 || echo "lint script not present, skipping"`
Expected: 无新增 error

- [ ] **Step 4:生产构建通过**

Run: `npm run build 2>&1 | tail -30`
Expected: 构建成功,无报错;新增 config 文件被打包

- [ ] **Step 5:手动冒烟(执行者在本地起 dev,验证现有 Canvas 图片/视频生成仍能跑通)**

```bash
npm run dev
# 浏览器:打开任一 Canvas 项目
# - 拖拽 ImageGenNode,选 kie/nano-banana-2,prompt "a cat",生成
# - 拖拽 VideoGenNode,选已有视频模型,触发生成
# 预期:现有功能零回归(M1 未改 API route 与 UI,应保持不变)
```

Expected: Canvas 图片与视频生成链路行为与 M1 前一致

- [ ] **Step 6:合并分支或打 M1 完成 tag**

```bash
git log --oneline -10
git tag -a smart-routing-m1 -m "M1: Smart routing infrastructure complete"
```

Expected: tag 创建;可选择 push 到 origin

---

## Exit Criteria Checklist(M1 完成标准)

- [ ] Migration 015 已在本地/开发 Supabase 应用,4 个新列与 3 张新表存在
- [ ] `user_key_capabilities` / `model_call_history` / `routing_preferences` 三张表 RLS 已启用并策略正确
- [ ] pg_cron 任务 `purge-model-call-history` 已注册(`SELECT * FROM cron.job` 可见)
- [ ] `src/config/pricing-table.ts` + 测试通过
- [ ] `src/config/provider-catalog.ts` + 测试通过
- [ ] `src/config/aggregator-manifest.ts` + 测试通过
- [ ] `src/server/ai/providers/openaiCompat.ts` + 测试通过
- [ ] `src/server/ai/providers/registry.ts` 新增 `resolveProvider` + 测试通过
- [ ] `npx tsc --noEmit` 通过
- [ ] `npx vitest run` 全绿
- [ ] `npm run build` 成功
- [ ] 现有 Canvas 图片/视频生成冒烟通过
- [ ] 所有提交推送到分支

---

## 后续 Milestone 预告(不在 M1 范围)

- **M2**:改造 `/api/settings/api-keys/route.ts` 接受 `base_url/protocol/display_name`;实现 capability prober;KeyManager UI
- **M3**:新建 `src/features/routing/`;scoring/candidates/router/fallback 完整链路;接入现有 `/api/ai/**` routes
- **M4**:Supabase Storage manifest 远程拉取 + 缓存;OnboardingWizard;ModelPicker 弱化解锁态
- **M5**:CostSummaryPanel + call-history API + 30 天看板
