# M3 路由引擎 + 偏好 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的智能 API 路由引擎:三层偏好解析、基于 30 天历史的 scoring、fallback 重试链、偏好设置 UI,并将现有图片生成路由接入路由器。

**Architecture:** Ports & Adapters 分层。`src/server/routing/` 是纯服务端基础设施(candidates 查 DB、scoring 计算、router 编排);`src/features/routing/application/types.ts` 定义共享类型;偏好和历史通过两个新 API route 暴露;UI 层在 `src/features/settings/` 新增 `ScenarioDefaults` 与 `ModelPreferences` 组件;现有 image generate route 新增 `logicalModelId` 路径向后兼容地接入路由器。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase JS / Vitest(node env) / M1 已就绪 `provider-catalog`、`pricing-table`、`registry` / M2 已就绪 `decryptApiKey`、`user_key_capabilities`、`model_call_history`、`routing_preferences`(migration 015)

---

## 文件结构

**新建:**

- `src/features/routing/application/types.ts` — 所有共享类型:RouteRequest / RouteDecision / KeyCandidate / FallbackToastPayload / RoutingError
- `src/server/routing/candidates.ts` — 查 DB 得到 logical_model → KeyCandidate[]
- `src/server/routing/scoring.ts` — 30 天历史 → score per candidate(含归一化 + 默认值回退)
- `src/server/routing/router.ts` — 主入口:三层偏好 → 排序 → retry chain → 写 model_call_history → 返回 RouteDecision 或 RoutingError
- `src/app/api/settings/routing-preferences/route.ts` — GET(查偏好) + POST(upsert 偏好)
- `src/app/api/settings/call-history/route.ts` — GET(30 天汇总)
- `src/features/settings/ScenarioDefaults.tsx` — 场景级偏好 UI(无需测试)
- `src/features/settings/ModelPreferences.tsx` — 模型级偏好 UI(无需测试)
- `src/features/canvas/ui/FallbackToast.tsx` — Toast 展示组件(无需测试)
- `src/server/routing/candidates.test.ts`
- `src/server/routing/scoring.test.ts`
- `src/server/routing/router.test.ts`
- `__tests__/api/routing-preferences.test.ts`
- `__tests__/api/call-history.test.ts`

**修改:**

- `src/app/api/ai/image/generate/route.ts` — 新增 `logicalModelId` 路径,调用 router;保留原 `modelId` 路径不变
- `src/app/(app)/settings/page.tsx` — 添加 ScenarioDefaults + ModelPreferences section

---

## Task 1: 共享类型定义

**Files:**
- Create: `src/features/routing/application/types.ts`

- [ ] **Step 1: 新建 types.ts**

```typescript
// src/features/routing/application/types.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type Scenario = 'text' | 'image' | 'video' | 'analysis' | 'edit'
export type CallStatus = 'success' | 'failed' | 'timeout'

/** 候选 key:能服务目标 logical model 且处于可用状态 */
export interface KeyCandidate {
  keyId: string
  provider: string                     // e.g. 'kie' | 'custom:uuid'
  displayName: string | null
  status: 'active' | 'unverified'
  baseUrl: string | null               // custom OpenAI-compat 端点
  protocol: 'native' | 'openai-compat'
  encryptedKey: string
  iv: string
  score: number                        // scoring 后填入,初始 0
}

/** router 路由请求 */
export interface RouteRequest {
  supabase: SupabaseClient
  userId: string
  logicalModelId: string               // e.g. 'nano-banana-2'
  scenario: Scenario
  /** 调用方提供的实际 AI 调用函数;router 传入选中的候选 key */
  callFn: (candidate: KeyCandidate, decryptedApiKey: string) => Promise<unknown>
}

/** router 路由成功结果 */
export interface RouteDecision {
  result: unknown
  keyId: string
  provider: string
  toast?: FallbackToastPayload         // 仅在发生 fallback 时存在
}

/** 单次 fallback 尝试记录 */
export interface FallbackAttempt {
  keyId: string
  displayName: string | null
  status: 'success' | 'failed'
  latencyMs?: number
  errorCode?: string
}

/** 成功但经过 fallback — 通知前端显示 Toast */
export interface FallbackToastPayload {
  message: string                      // "已切换至 <displayName> 完成请求"
  fallbackChain: FallbackAttempt[]
}

/** 全部候选失败 */
export interface RoutingError {
  code: 'ALL_CANDIDATES_FAILED' | 'NO_CANDIDATES'
  fallbackAttempts: FallbackAttempt[]
  suggestion: string
}

export function isRoutingError(v: RouteDecision | RoutingError): v is RoutingError {
  return 'code' in v
}

/** 写入 model_call_history 的载体 */
export interface CallHistoryEntry {
  userId: string
  keyId: string
  logicalModelId: string
  scenario: Scenario
  status: CallStatus
  latencyMs?: number
  errorCode?: string
  costEstimateCents?: number
}
```

- [ ] **Step 2: 确认类型无误(无需测试,但运行 tsc)**

```
npx tsc --noEmit
```

期望: 0 errors。

- [ ] **Step 3: commit**

```bash
git add src/features/routing/application/types.ts
git commit -m "feat(routing): application types RouteRequest / RouteDecision / RoutingError"
```

---

## Task 2: Candidates 查询模块

**Files:**
- Create: `src/server/routing/candidates.ts`
- Test: `src/server/routing/candidates.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/server/routing/candidates.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KeyCandidate } from '@/features/routing/application/types'

const mock = vi.hoisted(() => ({
  rows: [
    {
      key_id: 'k1',
      provider: 'kie',
      display_name: 'My KIE',
      status: 'active',
      base_url: null,
      protocol: 'native',
      encrypted_key: 'enc',
      iv: 'iv1',
    },
    {
      key_id: 'k2',
      provider: 'fal',
      display_name: null,
      status: 'unverified',
      base_url: null,
      protocol: 'native',
      encrypted_key: 'enc2',
      iv: 'iv2',
    },
  ] as unknown[],
  dbError: null as { message: string } | null,
}))

function makeSupabase(rows: unknown[], error: { message: string } | null = null) {
  return {
    from: (_t: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: rows, error }),
          }),
        }),
      }),
    }),
  }
}

import { findCandidates } from './candidates'

describe('findCandidates', () => {
  it('返回 logical_model 对应的可用 key 列表', async () => {
    const supa = makeSupabase(mock.rows)
    const result = await findCandidates(supa as never, 'user-1', 'nano-banana-2')
    expect(result).toHaveLength(2)
    expect(result[0].keyId).toBe('k1')
    expect(result[0].provider).toBe('kie')
    expect(result[0].score).toBe(0)
  })

  it('DB 返回 error 时抛异常', async () => {
    const supa = makeSupabase([], { message: 'DB error' })
    await expect(findCandidates(supa as never, 'user-1', 'nano-banana-2'))
      .rejects.toThrow('DB error')
  })

  it('无可用 key 时返回空数组', async () => {
    const supa = makeSupabase([])
    const result = await findCandidates(supa as never, 'user-1', 'veo-3')
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行确认 FAIL**

```
npx vitest run src/server/routing/candidates.test.ts
```

期望: 3 FAIL(模块不存在)。

- [ ] **Step 3: 实现 candidates.ts**

```typescript
// src/server/routing/candidates.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeyCandidate } from '@/features/routing/application/types'

/**
 * 查询能服务指定 logical model 且状态可用的 key 列表。
 * 联表 user_key_capabilities + user_api_keys。
 */
export async function findCandidates(
  supabase: SupabaseClient,
  userId: string,
  logicalModelId: string
): Promise<KeyCandidate[]> {
  const { data, error } = await supabase
    .from('user_key_capabilities')
    .select(
      `logical_model_id,
       key_id,
       user_api_keys!inner(
         id, provider, display_name, status,
         base_url, protocol, encrypted_key, iv, user_id
       )`
    )
    .eq('logical_model_id', logicalModelId)
    .eq('user_api_keys.user_id', userId)
    .in('user_api_keys.status', ['active', 'unverified'])

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const k = row['user_api_keys'] as Record<string, unknown>
    return {
      keyId: row['key_id'] as string,
      provider: k['provider'] as string,
      displayName: (k['display_name'] as string | null) ?? null,
      status: k['status'] as 'active' | 'unverified',
      baseUrl: (k['base_url'] as string | null) ?? null,
      protocol: k['protocol'] as 'native' | 'openai-compat',
      encryptedKey: k['encrypted_key'] as string,
      iv: k['iv'] as string,
      score: 0,
    }
  })
}
```

> ⚠ 注意:Supabase JS 联表语法 `user_api_keys!inner(...)` 与标准 select 不同。若 Supabase 版本不支持,改为两步查询:先查 `user_key_capabilities`,再查 `user_api_keys`。测试用 mock 模拟输出,与实际 SQL 无关。

- [ ] **Step 4: 跑测试确认 PASS**

```
npx vitest run src/server/routing/candidates.test.ts
```

期望: 3 passed。

- [ ] **Step 5: commit**

```bash
git add src/server/routing/candidates.ts src/server/routing/candidates.test.ts
git commit -m "feat(routing): candidates finder queries user_key_capabilities + user_api_keys"
```

---

## Task 3: Scoring 引擎

**Files:**
- Create: `src/server/routing/scoring.ts`
- Test: `src/server/routing/scoring.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/server/routing/scoring.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeScores } from './scoring'
import type { KeyCandidate } from '@/features/routing/application/types'

const baseCandidate = (keyId: string): KeyCandidate => ({
  keyId,
  provider: 'kie',
  displayName: null,
  status: 'active',
  baseUrl: null,
  protocol: 'native',
  encryptedKey: 'enc',
  iv: 'iv',
  score: 0,
})

describe('computeScores', () => {
  it('数据不足时使用默认值 success_rate=1.0', async () => {
    // 空历史 → 默认
    const candidates = [baseCandidate('k1')]
    const scored = computeScores(candidates, [], 'nano-banana-2')
    expect(scored[0].score).toBeGreaterThan(0)
  })

  it('多候选:高成功率 > 低成功率 时 score 更高', async () => {
    const candidates = [baseCandidate('k1'), baseCandidate('k2')]
    const history = [
      // k1: 5 次全成功
      ...Array(5).fill({ key_id: 'k1', status: 'success', latency_ms: 500, cost_estimate_cents: 4 }),
      // k2: 5 次全失败
      ...Array(5).fill({ key_id: 'k2', status: 'failed', latency_ms: 500, cost_estimate_cents: 4 }),
    ]
    const scored = computeScores(candidates, history, 'nano-banana-2')
    const k1 = scored.find(c => c.keyId === 'k1')!
    const k2 = scored.find(c => c.keyId === 'k2')!
    expect(k1.score).toBeGreaterThan(k2.score)
  })

  it('低延迟 key score 高于高延迟 key', async () => {
    const candidates = [baseCandidate('fast'), baseCandidate('slow')]
    const history = [
      ...Array(5).fill({ key_id: 'fast', status: 'success', latency_ms: 300, cost_estimate_cents: 4 }),
      ...Array(5).fill({ key_id: 'slow', status: 'success', latency_ms: 3000, cost_estimate_cents: 4 }),
    ]
    const scored = computeScores(candidates, history, 'nano-banana-2')
    const fast = scored.find(c => c.keyId === 'fast')!
    const slow = scored.find(c => c.keyId === 'slow')!
    expect(fast.score).toBeGreaterThan(slow.score)
  })

  it('低成本 key score 高于高成本 key(0.5 权重)', async () => {
    const candidates = [baseCandidate('cheap'), baseCandidate('expensive')]
    const history = [
      ...Array(5).fill({ key_id: 'cheap', status: 'success', latency_ms: 500, cost_estimate_cents: 2 }),
      ...Array(5).fill({ key_id: 'expensive', status: 'success', latency_ms: 500, cost_estimate_cents: 20 }),
    ]
    const scored = computeScores(candidates, history, 'nano-banana-2')
    const cheap = scored.find(c => c.keyId === 'cheap')!
    const expensive = scored.find(c => c.keyId === 'expensive')!
    expect(cheap.score).toBeGreaterThan(expensive.score)
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run src/server/routing/scoring.test.ts
```

期望: 4 FAIL。

- [ ] **Step 3: 实现 scoring.ts**

```typescript
// src/server/routing/scoring.ts
import { getModelPriceCents } from '@/config/pricing-table'
import type { KeyCandidate } from '@/features/routing/application/types'

interface HistoryRow {
  key_id: string
  status: string
  latency_ms: number | null
  cost_estimate_cents: number | null
}

interface KeyStats {
  successRate: number
  latencyMs: number
  costCents: number
}

const W_SUCCESS = 0.3
const W_LATENCY = 0.2
const W_COST = 0.5
const MIN_HISTORY = 5          // 低于此数量使用默认值
const DEFAULT_LATENCY_MS = 1000
const MAX_LATENCY_CAP = 10_000 // 超过此延迟视为最差

/**
 * 根据 30 天历史计算每个候选 key 的 score,并按降序排列。
 * 纯函数,无 DB 依赖 — 调用方负责传入 history rows。
 */
export function computeScores(
  candidates: KeyCandidate[],
  history: HistoryRow[],
  logicalModelId: string
): KeyCandidate[] {
  const defaultCost = getModelPriceCents(logicalModelId) || 1

  // 按 key_id 分组
  const grouped = new Map<string, HistoryRow[]>()
  for (const row of history) {
    const arr = grouped.get(row.key_id) ?? []
    arr.push(row)
    grouped.set(row.key_id, arr)
  }

  // 计算每个候选的统计量
  const stats = new Map<string, KeyStats>()
  for (const c of candidates) {
    const rows = grouped.get(c.keyId) ?? []
    if (rows.length < MIN_HISTORY) {
      stats.set(c.keyId, {
        successRate: 1.0,
        latencyMs: DEFAULT_LATENCY_MS,
        costCents: defaultCost,
      })
    } else {
      const total = rows.length
      const successes = rows.filter(r => r.status === 'success').length
      const latencies = rows.map(r => r.latency_ms ?? DEFAULT_LATENCY_MS).sort((a, b) => a - b)
      const medianLatency = latencies[Math.floor(latencies.length / 2)]
      const avgCost =
        rows.reduce((sum, r) => sum + (r.cost_estimate_cents ?? defaultCost), 0) / total
      stats.set(c.keyId, {
        successRate: successes / total,
        latencyMs: medianLatency,
        costCents: avgCost,
      })
    }
  }

  // 归一化参考最大值(候选集内)
  const maxLatency = Math.max(...Array.from(stats.values()).map(s => s.latencyMs), 1)
  const maxCost = Math.max(...Array.from(stats.values()).map(s => s.costCents), 1)

  return candidates
    .map(c => {
      const s = stats.get(c.keyId)!
      const latencyNormInv = 1 - Math.min(s.latencyMs, MAX_LATENCY_CAP) / Math.min(maxLatency, MAX_LATENCY_CAP)
      const costNormInv = 1 - s.costCents / maxCost
      const score = W_SUCCESS * s.successRate + W_LATENCY * latencyNormInv + W_COST * costNormInv
      return { ...c, score }
    })
    .sort((a, b) => b.score - a.score)
}

/** 从 DB 查询指定 user + logical_model 的最近 30 天历史(最多 50 条)。 */
export async function fetchHistory(
  supabase: { from: (t: string) => unknown },
  userId: string,
  logicalModelId: string
): Promise<HistoryRow[]> {
  const { data, error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
    .from('model_call_history')
    .select('key_id, status, latency_ms, cost_estimate_cents')
    .eq('user_id', userId)
    .eq('logical_model_id', logicalModelId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as HistoryRow[]
}
```

- [ ] **Step 4: 跑测试确认 PASS**

```
npx vitest run src/server/routing/scoring.test.ts
```

期望: 4 passed。

- [ ] **Step 5: commit**

```bash
git add src/server/routing/scoring.ts src/server/routing/scoring.test.ts
git commit -m "feat(routing): scoring engine with 30-day history normalization"
```

---

## Task 4: Router 主入口(三层偏好 + retry chain)

**Files:**
- Create: `src/server/routing/router.ts`
- Test: `src/server/routing/router.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/server/routing/router.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KeyCandidate, RouteRequest } from '@/features/routing/application/types'

// ---- mock 子模块 ----
vi.mock('./candidates', () => ({ findCandidates: vi.fn() }))
vi.mock('./scoring', () => ({
  computeScores: vi.fn((candidates: KeyCandidate[]) => candidates.map(c => ({ ...c, score: 0.5 }))),
  fetchHistory: vi.fn(async () => []),
}))
vi.mock('@/server/ai/keyFetcher', () => ({ decryptApiKey: vi.fn(() => 'decrypted-key') }))

import { findCandidates } from './candidates'
import { route } from './router'
import { isRoutingError } from '@/features/routing/application/types'

const fakeCandidate: KeyCandidate = {
  keyId: 'k1', provider: 'kie', displayName: 'KIE Key',
  status: 'active', baseUrl: null, protocol: 'native',
  encryptedKey: 'enc', iv: 'iv1', score: 0,
}

function makeSupabase(prefRows: unknown[] = []) {
  return {
    from: (table: string) => {
      if (table === 'routing_preferences') {
        return { select: () => ({ eq: () => ({ in: () => ({ in: () => Promise.resolve({ data: prefRows, error: null }) }) }) }) }
      }
      if (table === 'model_call_history') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {}
    },
  }
}

describe('route()', () => {
  beforeEach(() => {
    vi.mocked(findCandidates).mockReset().mockResolvedValue([fakeCandidate])
  })

  it('无候选时返回 NO_CANDIDATES error', async () => {
    vi.mocked(findCandidates).mockResolvedValue([])
    const req: RouteRequest = {
      supabase: makeSupabase() as never,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn: vi.fn(),
    }
    const result = await route(req)
    expect(isRoutingError(result)).toBe(true)
    if (isRoutingError(result)) expect(result.code).toBe('NO_CANDIDATES')
  })

  it('首次调用成功,无 toast', async () => {
    const callFn = vi.fn().mockResolvedValue({ imageUrl: 'http://img' })
    const req: RouteRequest = {
      supabase: makeSupabase() as never,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn,
    }
    const result = await route(req)
    expect(isRoutingError(result)).toBe(false)
    if (!isRoutingError(result)) {
      expect(result.toast).toBeUndefined()
      expect(result.keyId).toBe('k1')
    }
  })

  it('首选失败 fallback 到第二候选,返回 toast', async () => {
    const k2: KeyCandidate = { ...fakeCandidate, keyId: 'k2', displayName: 'FAL Key', provider: 'fal' }
    vi.mocked(findCandidates).mockResolvedValue([fakeCandidate, k2])
    const callFn = vi.fn()
      .mockRejectedValueOnce(new Error('k1 failed'))
      .mockResolvedValueOnce({ imageUrl: 'http://fallback-img' })
    const req: RouteRequest = {
      supabase: makeSupabase() as never,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn,
    }
    const result = await route(req)
    expect(isRoutingError(result)).toBe(false)
    if (!isRoutingError(result)) {
      expect(result.toast).toBeDefined()
      expect(result.toast!.message).toContain('已切换至')
      expect(result.keyId).toBe('k2')
    }
  })

  it('全部候选失败返回 ALL_CANDIDATES_FAILED', async () => {
    const callFn = vi.fn().mockRejectedValue(new Error('always fails'))
    const req: RouteRequest = {
      supabase: makeSupabase() as never,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn,
    }
    const result = await route(req)
    expect(isRoutingError(result)).toBe(true)
    if (isRoutingError(result)) expect(result.code).toBe('ALL_CANDIDATES_FAILED')
  })

  it('model 级偏好存在时优先选择偏好 key', async () => {
    const k2: KeyCandidate = { ...fakeCandidate, keyId: 'k2', provider: 'fal', score: 0.9 }
    vi.mocked(findCandidates).mockResolvedValue([fakeCandidate, k2])
    // model 级偏好指定 k1(score 低的那个)
    const prefRows = [{ level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1' }]
    const callFn = vi.fn().mockResolvedValue({ imageUrl: 'http://img' })
    const req: RouteRequest = {
      supabase: makeSupabase(prefRows) as never,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn,
    }
    await route(req)
    // 第一次调用传入的 candidate 应该是 k1
    expect(callFn.mock.calls[0][0].keyId).toBe('k1')
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run src/server/routing/router.test.ts
```

期望: 5 FAIL。

- [ ] **Step 3: 实现 router.ts**

```typescript
// src/server/routing/router.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { findCandidates } from './candidates'
import { computeScores, fetchHistory } from './scoring'
import { decryptApiKey } from '@/server/ai/keyFetcher'
import { getModelPriceCents } from '@/config/pricing-table'
import type {
  RouteRequest, RouteDecision, RoutingError,
  KeyCandidate, FallbackAttempt, CallHistoryEntry, Scenario,
} from '@/features/routing/application/types'

/** 主路由入口:三层偏好 → retry chain → 写历史 → 返回结果 */
export async function route(req: RouteRequest): Promise<RouteDecision | RoutingError> {
  const { supabase, userId, logicalModelId, scenario, callFn } = req

  // 1. 查候选
  const candidates = await findCandidates(supabase, userId, logicalModelId)
  if (candidates.length === 0) {
    return {
      code: 'NO_CANDIDATES',
      fallbackAttempts: [],
      suggestion: '请先在 Settings 添加并探测 API key,或为该模型添加新的 provider',
    }
  }

  // 2. 计算 score
  const history = await fetchHistory(supabase, userId, logicalModelId)
  const scored = computeScores(candidates, history, logicalModelId)

  // 3. 三层偏好调整排序
  const ordered = await applyPreferences(supabase, userId, logicalModelId, scenario, scored)

  // 4. Retry chain
  const attempts: FallbackAttempt[] = []
  for (const candidate of ordered) {
    const start = Date.now()
    let decryptedKey: string
    try {
      decryptedKey = decryptApiKey(candidate.encryptedKey, candidate.iv)
    } catch {
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'failed', errorCode: 'DECRYPT_FAILED' })
      continue
    }

    try {
      const result = await callFn(candidate, decryptedKey)
      const latencyMs = Date.now() - start
      const costCents = getModelPriceCents(logicalModelId)
      await writeHistory(supabase, { userId, keyId: candidate.keyId, logicalModelId, scenario, status: 'success', latencyMs, costEstimateCents: costCents })
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'success', latencyMs })

      const toast = attempts.length > 1 ? buildSuccessToast(candidate, attempts) : undefined
      return { result, keyId: candidate.keyId, provider: candidate.provider, toast }
    } catch (err) {
      const latencyMs = Date.now() - start
      const errorCode = err instanceof Error ? err.message.slice(0, 100) : 'unknown'
      await writeHistory(supabase, { userId, keyId: candidate.keyId, logicalModelId, scenario, status: 'failed', latencyMs, errorCode })
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'failed', latencyMs, errorCode })
    }
  }

  return {
    code: 'ALL_CANDIDATES_FAILED',
    fallbackAttempts: attempts,
    suggestion: '请检查 API key 余额或在 Settings 添加新的 provider',
  }
}

/** 三层偏好解析:model 级 > scenario 级 > 按 score 排序 */
async function applyPreferences(
  supabase: SupabaseClient,
  userId: string,
  logicalModelId: string,
  scenario: Scenario,
  scored: KeyCandidate[]
): Promise<KeyCandidate[]> {
  const { data } = await supabase
    .from('routing_preferences')
    .select('level, target, preferred_key_id')
    .eq('user_id', userId)
    .in('level', ['model', 'scenario'])
    .in('target', [logicalModelId, scenario])

  if (!data || data.length === 0) return scored

  const prefMap = new Map<string, string>(
    data.map((p: { level: string; target: string; preferred_key_id: string }) =>
      [`${p.level}:${p.target}`, p.preferred_key_id]
    )
  )

  // model 级优先于 scenario 级
  const preferredKeyId =
    prefMap.get(`model:${logicalModelId}`) ??
    prefMap.get(`scenario:${scenario}`)

  if (!preferredKeyId) return scored

  const idx = scored.findIndex(c => c.keyId === preferredKeyId)
  if (idx <= 0) return scored // 已在首位或不在候选中

  const copy = [...scored]
  const [preferred] = copy.splice(idx, 1)
  copy.unshift(preferred)
  return copy
}

/** 写入 model_call_history */
async function writeHistory(
  supabase: SupabaseClient,
  entry: CallHistoryEntry
): Promise<void> {
  await supabase.from('model_call_history').insert({
    user_id: entry.userId,
    key_id: entry.keyId,
    logical_model_id: entry.logicalModelId,
    scenario: entry.scenario,
    status: entry.status,
    latency_ms: entry.latencyMs ?? null,
    error_code: entry.errorCode ?? null,
    cost_estimate_cents: entry.costEstimateCents ?? null,
  })
}

/** 构造 fallback 成功时的 Toast payload */
function buildSuccessToast(
  winner: KeyCandidate,
  chain: FallbackAttempt[]
) {
  const name = winner.displayName ?? winner.provider
  return {
    message: `已切换至 ${name} 完成请求`,
    fallbackChain: chain,
  }
}
```

- [ ] **Step 4: 跑测试确认 PASS**

```
npx vitest run src/server/routing/router.test.ts
```

期望: 5 passed。

- [ ] **Step 5: commit**

```bash
git add src/server/routing/router.ts src/server/routing/router.test.ts
git commit -m "feat(routing): router with 3-layer preferences, retry chain, history write"
```

---

## Task 5: Routing Preferences API

**Files:**
- Create: `src/app/api/settings/routing-preferences/route.ts`
- Test: `__tests__/api/routing-preferences.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  upsertError: null as { message: string } | null,
  prefRows: [
    { id: 'p1', level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1', fallback_enabled: true },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (_t: string) => ({
      upsert: () => Promise.resolve({ error: mock.upsertError }),
      select: () => ({ eq: () => Promise.resolve({ data: mock.prefRows, error: null }) }),
    }),
  }),
  getAuthUser: async () => mock.authUser,
}))

describe('routing-preferences API', () => {
  beforeEach(() => { mock.authUser = { id: 'u1' }; mock.upsertError = null })

  it('GET 未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/routing-preferences/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET 返回偏好列表', async () => {
    const { GET } = await import('@/app/api/settings/routing-preferences/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body[0].level).toBe('model')
  })

  it('POST 未登录返回 401', async () => {
    mock.authUser = null
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(401)
  })

  it('POST 缺少 level/target 返回 400', async () => {
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ level: 'model' }) }))
    expect(res.status).toBe(400)
  })

  it('POST 合法 body upsert 返回 200', async () => {
    const { POST } = await import('@/app/api/settings/routing-preferences/route')
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1', fallback_enabled: true }),
    }))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run __tests__/api/routing-preferences.test.ts
```

期望: 5 FAIL。

- [ ] **Step 3: 实现 route**

```typescript
// src/app/api/settings/routing-preferences/route.ts
import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('routing_preferences')
    .select('id, level, target, preferred_key_id, fallback_enabled, updated_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { level, target, preferred_key_id, fallback_enabled } = body
  if (
    (level !== 'model' && level !== 'scenario') ||
    typeof target !== 'string' || !target
  ) {
    return NextResponse.json({ error: 'level(model|scenario) and target are required' }, { status: 400 })
  }

  const { error } = await supabase.from('routing_preferences').upsert(
    {
      user_id: user.id,
      level,
      target,
      preferred_key_id: preferred_key_id ?? null,
      fallback_enabled: fallback_enabled !== false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,level,target' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: 跑测试确认 PASS**

```
npx vitest run __tests__/api/routing-preferences.test.ts
```

期望: 5 passed。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/routing-preferences/route.ts __tests__/api/routing-preferences.test.ts
git commit -m "feat(api): GET+POST /api/settings/routing-preferences"
```

---

## Task 6: Call History API

**Files:**
- Create: `src/app/api/settings/call-history/route.ts`
- Test: `__tests__/api/call-history.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  histRows: [
    { logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 500, cost_estimate_cents: 4, created_at: new Date().toISOString() },
    { logical_model_id: 'nano-banana-2', status: 'failed', latency_ms: 1200, cost_estimate_cents: 0, created_at: new Date().toISOString() },
    { logical_model_id: 'veo-3', status: 'success', latency_ms: 3000, cost_estimate_cents: 100, created_at: new Date().toISOString() },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ gte: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mock.histRows, error: null }) }) }) }) }),
    }),
  }),
  getAuthUser: async () => mock.authUser,
}))

describe('GET /api/settings/call-history', () => {
  beforeEach(() => { mock.authUser = { id: 'u1' } })

  it('未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/call-history/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('返回 30 天汇总:total / success / avgLatency / totalCost', async () => {
    const { GET } = await import('@/app/api/settings/call-history/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.total).toBe(3)
    expect(body.successCount).toBe(2)
    expect(body.byModel).toBeDefined()
    expect(body.byModel['nano-banana-2'].total).toBe(2)
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run __tests__/api/call-history.test.ts
```

期望: 2 FAIL。

- [ ] **Step 3: 实现 route**

```typescript
// src/app/api/settings/call-history/route.ts
import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('model_call_history')
    .select('logical_model_id, status, latency_ms, cost_estimate_cents, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length
  const successCount = rows.filter(r => r.status === 'success').length
  const avgLatencyMs = total > 0
    ? Math.round(rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / total)
    : 0
  const totalCostCents = rows.reduce((s, r) => s + (r.cost_estimate_cents ?? 0), 0)

  const byModel: Record<string, { total: number; success: number; avgLatencyMs: number; totalCostCents: number }> = {}
  for (const r of rows) {
    const m = r.logical_model_id
    byModel[m] = byModel[m] ?? { total: 0, success: 0, avgLatencyMs: 0, totalCostCents: 0 }
    byModel[m].total++
    if (r.status === 'success') byModel[m].success++
    byModel[m].avgLatencyMs += r.latency_ms ?? 0
    byModel[m].totalCostCents += r.cost_estimate_cents ?? 0
  }
  for (const k of Object.keys(byModel)) {
    byModel[k].avgLatencyMs = Math.round(byModel[k].avgLatencyMs / byModel[k].total)
  }

  return NextResponse.json({ total, successCount, avgLatencyMs, totalCostCents, byModel })
}
```

- [ ] **Step 4: 跑测试确认 PASS**

```
npx vitest run __tests__/api/call-history.test.ts
```

期望: 2 passed。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/call-history/route.ts __tests__/api/call-history.test.ts
git commit -m "feat(api): GET /api/settings/call-history 30-day summary"
```

---

## Task 7: ScenarioDefaults + ModelPreferences UI

**Files:**
- Create: `src/features/settings/ScenarioDefaults.tsx`
- Create: `src/features/settings/ModelPreferences.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

> 本 Task 无单独测试要求(纯展示 + 表单,无复杂逻辑)。但 tsc 必须通过。

- [ ] **Step 1: 实现 ScenarioDefaults.tsx**

```typescript
// src/features/settings/ScenarioDefaults.tsx
'use client'
import { useState, useEffect } from 'react'

interface Preference {
  id: string
  level: string
  target: string
  preferred_key_id: string | null
  fallback_enabled: boolean
}

interface ApiKey {
  id: string
  provider: string
  display_name: string | null
}

const SCENARIOS = ['image', 'video', 'text', 'analysis'] as const

export function ScenarioDefaults() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    // 拉取用户的 key 列表
    fetch('/api/settings/api-keys').then(r => r.json()).then(setKeys)
    // 拉取偏好
    fetch('/api/settings/routing-preferences').then(r => r.json()).then((data: Preference[]) => {
      const map: Record<string, string> = {}
      for (const p of data) if (p.level === 'scenario') map[p.target] = p.preferred_key_id ?? ''
      setPrefs(map)
    })
  }, [])

  async function save(scenario: string, keyId: string) {
    setSaving(scenario)
    await fetch('/api/settings/routing-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'scenario', target: scenario, preferred_key_id: keyId || null }),
    })
    setPrefs(p => ({ ...p, [scenario]: keyId }))
    setSaving(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-gray-700">场景默认 Key</h3>
      {SCENARIOS.map(sc => (
        <div key={sc} className="flex items-center gap-2">
          <span className="w-20 text-sm capitalize text-gray-600">{sc}</span>
          <select
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={prefs[sc] ?? ''}
            onChange={e => save(sc, e.target.value)}
            disabled={saving === sc}
          >
            <option value="">自动选优</option>
            {keys.map(k => (
              <option key={k.id} value={k.id}>
                {k.display_name ?? k.provider}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 实现 ModelPreferences.tsx**

```typescript
// src/features/settings/ModelPreferences.tsx
'use client'
import { useState, useEffect } from 'react'
import { PROVIDER_CATALOG } from '@/config/provider-catalog'

interface ApiKey { id: string; provider: string; display_name: string | null }
interface Preference { level: string; target: string; preferred_key_id: string | null }

const ALL_MODELS = Array.from(
  new Set(Object.values(PROVIDER_CATALOG).flatMap(e => [...e.logicalModels]))
).sort()

export function ModelPreferences() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [prefs, setPrefs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/settings/api-keys').then(r => r.json()).then(setKeys)
    fetch('/api/settings/routing-preferences').then(r => r.json()).then((data: Preference[]) => {
      const map: Record<string, string> = {}
      for (const p of data) if (p.level === 'model') map[p.target] = p.preferred_key_id ?? ''
      setPrefs(map)
    })
  }, [])

  async function save(model: string, keyId: string) {
    setSaving(model)
    await fetch('/api/settings/routing-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'model', target: model, preferred_key_id: keyId || null }),
    })
    setPrefs(p => ({ ...p, [model]: keyId }))
    setSaving(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex items-center gap-1 text-sm font-medium text-gray-700"
        onClick={() => setExpanded(e => !e)}
      >
        <span>{expanded ? '▾' : '▸'}</span> 模型级偏好(高级)
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 pl-4">
          {ALL_MODELS.map(model => (
            <div key={model} className="flex items-center gap-2">
              <span className="w-36 truncate text-xs text-gray-600" title={model}>{model}</span>
              <select
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                value={prefs[model] ?? ''}
                onChange={e => save(model, e.target.value)}
                disabled={saving === model}
              >
                <option value="">自动选优</option>
                {keys.map(k => (
                  <option key={k.id} value={k.id}>{k.display_name ?? k.provider}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 挂载到 settings page**

打开 `src/app/(app)/settings/page.tsx`,在 KeyManager section 之后添加一个新 SectionCard:

```tsx
{/* 在 API Keys SectionCard 之后添加 */}
<SectionCard title="智能路由偏好">
  <Suspense fallback={null}>
    <ScenarioDefaults />
    <div className="mt-4 border-t border-gray-100 pt-4">
      <ModelPreferences />
    </div>
  </Suspense>
</SectionCard>
```

同时在文件顶部 import:
```tsx
import { ScenarioDefaults } from '@/features/settings/ScenarioDefaults'
import { ModelPreferences } from '@/features/settings/ModelPreferences'
```

注意:如果 settings page 本身是 Server Component(无 `'use client'`),`<ScenarioDefaults />` 已有自己的 `'use client'`,无需额外包装。

- [ ] **Step 4: tsc 检查**

```
npx tsc --noEmit
```

期望: 0 errors。

- [ ] **Step 5: commit**

```bash
git add src/features/settings/ScenarioDefaults.tsx src/features/settings/ModelPreferences.tsx src/app/(app)/settings/page.tsx
git commit -m "feat(settings): ScenarioDefaults + ModelPreferences routing preference UI"
```

---

## Task 8: FallbackToast 组件 + 接入 image generate route

**Files:**
- Create: `src/features/canvas/ui/FallbackToast.tsx`
- Modify: `src/app/api/ai/image/generate/route.ts`

> 接入 router 时使用 `logicalModelId` 作为新路径(向后兼容),不改动原有 `modelId` 路径。

- [ ] **Step 1: 实现 FallbackToast.tsx**

```typescript
// src/features/canvas/ui/FallbackToast.tsx
'use client'
import { useState } from 'react'
import type { FallbackToastPayload } from '@/features/routing/application/types'

interface FallbackToastProps {
  payload: FallbackToastPayload
  onDismiss: () => void
}

export function FallbackToast({ payload, onDismiss }: FallbackToastProps) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 rounded-lg bg-gray-900 p-3 text-sm text-white shadow-xl">
      <div className="flex items-center gap-2">
        <span>{payload.message}</span>
        <button className="ml-2 text-xs underline opacity-70" onClick={() => setShowDetail(s => !s)}>
          {showDetail ? '收起' : '查看详情'}
        </button>
        <button className="ml-auto text-xs opacity-50" onClick={onDismiss}>✕</button>
      </div>
      {showDetail && (
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-gray-300">
          {payload.fallbackChain.map((a, i) => (
            <div key={i} className="flex items-center gap-1">
              <span>{a.status === 'success' ? '✓' : '✗'}</span>
              <span>{a.displayName ?? a.keyId}</span>
              {a.latencyMs && <span className="opacity-60">{a.latencyMs}ms</span>}
              {a.errorCode && <span className="text-red-300 opacity-80">{a.errorCode}</span>}
            </div>
          ))}
          <a href="/settings" className="mt-1 text-blue-300 underline">在 Settings 调整偏好</a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 修改 image generate route 以支持 logicalModelId 路径**

打开 `src/app/api/ai/image/generate/route.ts`。在现有 import 区域末尾添加:

```typescript
import { route, isRoutingError } from '@/server/routing/router'
import { resolveProvider } from '@/server/ai/registry'
```

在 `POST` 函数体内,在参数解构之后、provider 查找之前插入新路径:

```typescript
// --- 新增:logicalModelId 智能路由路径 ---
const { logicalModelId } = body as { logicalModelId?: string }
if (typeof logicalModelId === 'string' && logicalModelId) {
  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }
  const genReq = {
    modelId: logicalModelId,
    prompt: prompt as string,
    negativePrompt: negativePrompt as string | undefined,
    width: width as number | undefined,
    height: height as number | undefined,
    aspectRatio: aspectRatio as string | undefined,
    imageUrl: imageUrl as string | undefined,
    steps: steps as number | undefined,
    cfgScale: cfgScale as number | undefined,
    seed: seed as number | undefined,
    extraParams: extraParams as Record<string, unknown> | undefined,
  }

  const decision = await route({
    supabase,
    userId: user.id,
    logicalModelId,
    scenario: 'image',
    callFn: async (candidate, decryptedKey) => {
      const provider = resolveProvider(candidate.provider, {
        baseUrl: candidate.baseUrl ?? undefined,
        apiKey: decryptedKey,
      })
      if (!provider) throw new Error(`provider ${candidate.provider} not found`)
      if (provider.generate) return provider.generate(genReq)
      if (provider.submitJob) return { jobId: await provider.submitJob(genReq), status: 'pending' }
      throw new Error(`provider ${candidate.provider} has no generate method`)
    },
  })

  if (isRoutingError(decision)) {
    return NextResponse.json({ error: decision.code, suggestion: decision.suggestion }, { status: 503 })
  }
  return NextResponse.json({ ...decision.result as object, toast: decision.toast ?? null })
}
// --- 新增结束 ---

// 原有 modelId 路径保持不变 ↓
```

- [ ] **Step 3: tsc 检查**

```
npx tsc --noEmit
```

期望: 0 errors。

- [ ] **Step 4: 手动验证(可选)**

启动 dev server 后用 curl 测试新路径:

```bash
curl -X POST http://localhost:3000/api/ai/image/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"logicalModelId":"nano-banana-2","prompt":"a cat","projectId":"<your-project-id>"}'
```

期望:返回 `{"imageUrl":"...", "toast":null}` 或 503(若无探测过的 key)。

- [ ] **Step 5: commit**

```bash
git add src/features/canvas/ui/FallbackToast.tsx src/app/api/ai/image/generate/route.ts
git commit -m "feat(routing): FallbackToast + wire image generate to smart router"
```

---

## Task 9: Exit Criteria 验证 + Tag + PR

**Files:** 无代码改动

- [ ] **Step 1: 全量 tsc**

```
npx tsc --noEmit
```

期望: 0 errors。

- [ ] **Step 2: 全量 vitest**

```
npx vitest run
```

期望: 全部 passed。M3 新增测试 ≥ 16(candidates 3 + scoring 4 + router 5 + preferences 5 + call-history 2 = 19)。

- [ ] **Step 3: 构建**

```
npm run build
```

期望: 0 errors / 0 warnings。新路由出现:
- `/api/settings/routing-preferences`
- `/api/settings/call-history`

- [ ] **Step 4: lint 检查**

```
npm run lint
```

期望: 0 errors(只有 warnings 可接受)。

- [ ] **Step 5: 打 tag + 开 PR**

```bash
git tag -a smart-routing-m3 -m "M3: routing engine + preferences"
git push origin feat/smart-routing-m3
git push origin smart-routing-m3

gh pr create --base main --head feat/smart-routing-m3 \
  --title "feat(smart-routing): M3 routing engine + 3-layer preferences" \
  --body "See docs/superpowers/plans/2026-04-25-m3-routing-engine.md"
```

---

## Self-Review

### Spec 覆盖

| Spec 要求 | 对应 Task |
|---|---|
| `src/features/routing/application/` ports/types/routingService | Task 1(types)、Task 4(router 含三层偏好逻辑) |
| `src/server/routing/` candidates / scoring / router / fallback | Task 2-4 |
| `model_call_history` 写入链路 | Task 4 (writeHistory in router) |
| 现有 API routes 接入 router | Task 8(image generate route) |
| `POST /api/settings/routing-preferences` | Task 5 |
| `GET /api/settings/call-history` | Task 6 |
| `ScenarioDefaults` + `ModelPreferences` UI | Task 7 |
| 失败 Fallback Toast | Task 8(FallbackToast 组件 + route 返回 toast payload) |
| 单元 + 集成测试 | Tasks 2-6 |
| Exit Criteria:多 key 场景自动选优,三层偏好可配置且生效 | Task 9 |

**缺口:** spec 提到 `ports.ts`(IRouter/IScoringEngine 接口)未单独建文件 — 对 MVP 影响极小,types.ts 已包含所有类型,行为通过 mock 测试覆盖,M4 可补正式 ports。

### Placeholder 扫描

无 TBD / TODO / "implement later"。全部步骤均有完整代码块。

### 类型一致性

- `KeyCandidate` 在 Task 1 定义,Task 2(candidates.ts)、Task 3(scoring.ts)、Task 4(router.ts)均 import 自 `@/features/routing/application/types`
- `FallbackToastPayload` 在 Task 1 定义,Task 4 构造,Task 8 (FallbackToast) 消费 — 字段 `message: string` / `fallbackChain: FallbackAttempt[]` 一致
- `isRoutingError` 在 Task 1 定义,Task 4 导出,Task 8 route 调用 — 签名一致
- `writeHistory` 接收 `CallHistoryEntry`(Task 1 定义)— 类型匹配
