# M5 Cost Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现成本看板（CostSummaryPanel），展示 30 天调用汇总与按模型明细，并将其集成到 Settings 页面和 SettingsDialog，同时为 call-history API 加分页支持、补充双语文档。

**Architecture:** `CostSummaryPanel` 是纯客户端 React 组件，通过 `GET /api/settings/call-history` 取聚合数据渲染 KPI 卡片 + 按模型明细表。API 在现有聚合返回基础上新增 `?page=&pageSize=` 参数支持原始记录分页查询。文档新增 `docs/api/routing.md` 和 `docs/extensions/add-aggregator.md`。

**Tech Stack:** Next.js 15 App Router · React 18 · TypeScript · Supabase · react-i18next · Vitest · CSS 变量主题系统

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/features/settings/CostSummaryPanel.tsx` | 新建 | KPI 卡片 + 按模型明细表，消费 call-history API |
| `src/app/api/settings/call-history/route.ts` | 修改 | 新增 `?page=&pageSize=` 分页参数返回原始记录 |
| `src/app/api/settings/call-history/route.test.ts` | 新建 | 聚合 + 分页响应的单元测试 |
| `src/app/(app)/settings/page.tsx` | 修改 | 新增「调用记录」SectionCard 包裹 CostSummaryPanel |
| `src/features/settings/SettingsDialog.tsx` | 修改 | 新增「调用记录」SectionBlock 包裹 CostSummaryPanel |
| `src/i18n/locales/zh.json` | 修改 | 添加 `costPanel.*` 键 |
| `src/i18n/locales/en.json` | 修改 | 添加 `costPanel.*` 键 |
| `docs/api/routing.md` | 新建 | 路由 API 完整参考文档 |
| `docs/extensions/add-aggregator.md` | 新建 | 如何扩展新聚合维度的指南 |

---

## Task 1: i18n 键

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: 向 zh.json 写入失败测试（手动验证）**

在 `src/i18n/locales/zh.json` 的 `"settings"` 对象末尾、最后一个已有键之后，添加：

```json
"costPanel": {
  "title": "调用记录",
  "desc": "近 30 天 AI 模型调用汇总",
  "loading": "加载中...",
  "empty": "暂无调用记录",
  "error": "加载失败，请刷新重试",
  "totalCalls": "总调用次数",
  "successRate": "成功率",
  "avgLatency": "平均延迟",
  "totalCost": "预估总费用",
  "model": "模型",
  "calls": "调用次数",
  "success": "成功率",
  "latency": "平均延迟",
  "cost": "费用"
}
```

（注意：该键添加在 `settings` 对象内部，与 `"title"`、`"profile"` 等并列）

- [ ] **Step 2: 向 en.json 写入对应英文**

在 `src/i18n/locales/en.json` 的 `"settings"` 对象中同样位置添加：

```json
"costPanel": {
  "title": "Call History",
  "desc": "AI model call summary for the past 30 days",
  "loading": "Loading...",
  "empty": "No call records yet",
  "error": "Failed to load, please refresh",
  "totalCalls": "Total Calls",
  "successRate": "Success Rate",
  "avgLatency": "Avg Latency",
  "totalCost": "Est. Cost",
  "model": "Model",
  "calls": "Calls",
  "success": "Success",
  "latency": "Avg Latency",
  "cost": "Cost"
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(m5): add costPanel i18n keys for zh and en"
```

---

## Task 2: CostSummaryPanel 组件

**Files:**
- Create: `src/features/settings/CostSummaryPanel.tsx`

- [ ] **Step 1: 创建组件文件**

创建 `src/features/settings/CostSummaryPanel.tsx`，内容如下：

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ModelStats {
  total: number
  success: number
  avgLatencyMs: number
  totalCostCents: number
}

interface CallHistoryStats {
  total: number
  successCount: number
  avgLatencyMs: number
  totalCostCents: number
  byModel: Record<string, ModelStats>
}

/** 将美分转为带 $ 前缀的字符串，保留 4 位小数 */
function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`
}

export function CostSummaryPanel() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<CallHistoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/settings/call-history')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: CallHistoryStats) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-xs text-[var(--ui-fg-muted)]">{t('settings.costPanel.loading')}</p>
  }
  if (error) {
    return <p className="text-xs text-red-500">{t('settings.costPanel.error')}</p>
  }
  if (!stats || stats.total === 0) {
    return <p className="text-xs text-[var(--ui-fg-muted)]">{t('settings.costPanel.empty')}</p>
  }

  const successRate = Math.round((stats.successCount / stats.total) * 100)
  const kpis = [
    { label: t('settings.costPanel.totalCalls'), value: String(stats.total) },
    { label: t('settings.costPanel.successRate'), value: `${successRate}%` },
    { label: t('settings.costPanel.avgLatency'), value: `${stats.avgLatencyMs}ms` },
    { label: t('settings.costPanel.totalCost'), value: formatCost(stats.totalCostCents) },
  ]

  const modelRows = Object.entries(stats.byModel).sort(
    ([, a], [, b]) => b.total - a.total,
  )

  return (
    <div className="space-y-4">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--ui-line)] bg-[var(--ui-surface-field)] p-3"
          >
            <p className="text-xs text-[var(--ui-fg-muted)]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ui-fg)]">{value}</p>
          </div>
        ))}
      </div>

      {/* 按模型明细表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--ui-line)] text-left">
              {[
                t('settings.costPanel.model'),
                t('settings.costPanel.calls'),
                t('settings.costPanel.success'),
                t('settings.costPanel.latency'),
                t('settings.costPanel.cost'),
              ].map((h) => (
                <th key={h} className="pb-1.5 pr-4 font-medium text-[var(--ui-fg-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelRows.map(([modelId, m]) => (
              <tr key={modelId} className="border-b border-[var(--ui-line)]/30 text-[var(--ui-fg)]">
                <td className="py-1.5 pr-4 font-medium">{modelId}</td>
                <td className="py-1.5 pr-4">{m.total}</td>
                <td className="py-1.5 pr-4">{Math.round((m.success / m.total) * 100)}%</td>
                <td className="py-1.5 pr-4">{m.avgLatencyMs}ms</td>
                <td className="py-1.5">{formatCost(m.totalCostCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/CostSummaryPanel.tsx
git commit -m "feat(m5): add CostSummaryPanel component"
```

---

## Task 3: 将 CostSummaryPanel 集成到 Settings 页面

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/features/settings/SettingsDialog.tsx`

- [ ] **Step 1: 在 settings/page.tsx 中添加 import 和新 section**

在 `src/app/(app)/settings/page.tsx` 文件顶部 import 区域（与其他 features/settings 导入并列）添加：

```tsx
import { CostSummaryPanel } from '@/features/settings/CostSummaryPanel';
```

然后在文件中最后一个 `<SectionCard>` 之后（`</div>` 闭合前），添加：

```tsx
{/* 调用记录 */}
<SectionCard
  title={t('settings.costPanel.title')}
  desc={t('settings.costPanel.desc')}
>
  <CostSummaryPanel />
</SectionCard>
```

- [ ] **Step 2: 在 SettingsDialog.tsx 中添加 import 和新 section**

在 `src/features/settings/SettingsDialog.tsx` 文件顶部 import 区域添加：

```tsx
import { CostSummaryPanel } from './CostSummaryPanel';
```

然后在 `{/* Preset Prompts */}` SectionBlock 之后添加：

```tsx
{/* 调用记录 */}
<SectionBlock
  title={t('settings.costPanel.title')}
  desc={t('settings.costPanel.desc')}
>
  <CostSummaryPanel />
</SectionBlock>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 4: 启动开发服务器，手动验证 settings 页面**

```bash
npm run dev
```

访问 `http://localhost:3000/settings`，确认：
- 页面底部出现「调用记录」卡片
- 有数据时显示 KPI 卡片 + 按模型表格
- 无数据时显示空态提示
- 深色模式下样式正常（切换主题验证）

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/settings/page.tsx src/features/settings/SettingsDialog.tsx
git commit -m "feat(m5): integrate CostSummaryPanel into settings page and dialog"
```

---

## Task 4: call-history API 分页支持

**Files:**
- Modify: `src/app/api/settings/call-history/route.ts`

- [ ] **Step 1: 更新 API route，支持 `?page=` 和 `?pageSize=` 查询参数**

将 `src/app/api/settings/call-history/route.ts` 替换为：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

const DEFAULT_PAGE_SIZE = 20
const MAX_AGG_LIMIT = 500   // 聚合模式最大行数

/**
 * GET /api/settings/call-history
 *
 * 无参数：返回 30 天聚合统计（向后兼容）
 * ?page=N&pageSize=M：返回原始记录分页列表（page 从 1 开始）
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const rawPage = searchParams.get('page')
  const rawSize = searchParams.get('pageSize')

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 分页模式
  if (rawPage !== null) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(rawSize ?? String(DEFAULT_PAGE_SIZE), 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('model_call_history')
      .select('id, logical_model_id, status, latency_ms, cost_estimate_cents, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      records: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
    })
  }

  // 聚合模式（向后兼容）
  const { data, error } = await supabase
    .from('model_call_history')
    .select('logical_model_id, status, latency_ms, cost_estimate_cents, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(MAX_AGG_LIMIT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length
  const successCount = rows.filter((r: { status: string }) => r.status === 'success').length
  const avgLatencyMs =
    total > 0
      ? Math.round(
          rows.reduce((s: number, r: { latency_ms: number | null }) => s + (r.latency_ms ?? 0), 0) /
            total,
        )
      : 0
  const totalCostCents = rows.reduce(
    (s: number, r: { cost_estimate_cents: number | null }) => s + (r.cost_estimate_cents ?? 0),
    0,
  )

  const byModel: Record<
    string,
    { total: number; success: number; avgLatencyMs: number; totalCostCents: number }
  > = {}
  for (const r of rows as Array<{
    logical_model_id: string
    status: string
    latency_ms: number | null
    cost_estimate_cents: number | null
  }>) {
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

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 3: Commit（暂存，等测试通过后统一 commit）**

不提前 commit，等 Task 5 测试通过后一起提交。

---

## Task 5: call-history API 单元测试

**Files:**
- Create: `src/app/api/settings/call-history/route.test.ts`

- [ ] **Step 1: 编写失败测试**

创建 `src/app/api/settings/call-history/route.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Supabase server client mock
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRange = vi.fn()

const chainMock = {
  select: mockSelect,
  eq: mockEq,
  gte: mockGte,
  order: mockOrder,
  limit: mockLimit,
  range: mockRange,
}

// 每个链式方法都返回自身，让链可以串起来
beforeEach(() => {
  vi.clearAllMocks()
  mockSelect.mockReturnValue(chainMock)
  mockEq.mockReturnValue(chainMock)
  mockGte.mockReturnValue(chainMock)
  mockOrder.mockReturnValue(chainMock)
  mockLimit.mockReturnValue(chainMock)
  mockRange.mockReturnValue(chainMock)
})

const mockFrom = vi.fn(() => chainMock)
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  getAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

import { GET } from './route'

function makeRequest(search = '') {
  return new NextRequest(`http://localhost/api/settings/call-history${search}`)
}

const sampleRows = [
  { logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 300, cost_estimate_cents: 2 },
  { logical_model_id: 'nano-banana-2', status: 'failed',  latency_ms: 100, cost_estimate_cents: 0 },
  { logical_model_id: 'grok-image',    status: 'success', latency_ms: 500, cost_estimate_cents: 5 },
]

describe('GET /api/settings/call-history', () => {
  describe('聚合模式（无 page 参数）', () => {
    it('返回正确的汇总统计', async () => {
      mockLimit.mockResolvedValueOnce({ data: sampleRows, error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.total).toBe(3)
      expect(body.successCount).toBe(2)
      // avgLatencyMs = round((300+100+500)/3) = 300
      expect(body.avgLatencyMs).toBe(300)
      // totalCostCents = 2+0+5 = 7
      expect(body.totalCostCents).toBe(7)
    })

    it('byModel 按模型正确分组', async () => {
      mockLimit.mockResolvedValueOnce({ data: sampleRows, error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.byModel['nano-banana-2'].total).toBe(2)
      expect(body.byModel['nano-banana-2'].success).toBe(1)
      expect(body.byModel['grok-image'].total).toBe(1)
    })

    it('空数据时返回零值', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.total).toBe(0)
      expect(body.avgLatencyMs).toBe(0)
      expect(body.byModel).toEqual({})
    })
  })

  describe('分页模式（有 page 参数）', () => {
    const pagedRows = [
      { id: '1', logical_model_id: 'nano-banana-2', status: 'success', latency_ms: 300, cost_estimate_cents: 2, created_at: '2026-04-01T00:00:00Z' },
    ]

    it('返回 records + 分页元数据', async () => {
      mockRange.mockResolvedValueOnce({ data: pagedRows, error: null, count: 42 })

      const res = await GET(makeRequest('?page=1&pageSize=20'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.records).toHaveLength(1)
      expect(body.page).toBe(1)
      expect(body.pageSize).toBe(20)
      expect(body.total).toBe(42)
    })

    it('page=2 时 range 从第 pageSize 行开始', async () => {
      mockRange.mockResolvedValueOnce({ data: [], error: null, count: 100 })

      await GET(makeRequest('?page=2&pageSize=20'))

      // range(20, 39)
      expect(mockRange).toHaveBeenCalledWith(20, 39)
    })

    it('pageSize 不超过 100', async () => {
      mockRange.mockResolvedValueOnce({ data: [], error: null, count: 0 })

      await GET(makeRequest('?page=1&pageSize=999'))

      expect(mockRange).toHaveBeenCalledWith(0, 99)
    })
  })

  it('未认证时返回 401', async () => {
    const { getAuthUser } = await import('@/lib/supabase/server')
    vi.mocked(getAuthUser).mockResolvedValueOnce(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npx vitest run src/app/api/settings/call-history/route.test.ts
```

期望：FAIL（`route.ts` 尚未支持分页）

- [ ] **Step 3: 确认 Task 4 中的 route.ts 已就位，重新运行测试**

```bash
npx vitest run src/app/api/settings/call-history/route.test.ts
```

期望：所有测试 PASS

- [ ] **Step 4: 运行完整测试套件确认无回归**

```bash
npx vitest run
```

期望：全部通过，无新增失败

- [ ] **Step 5: Commit**

```bash
git add src/app/api/settings/call-history/route.ts src/app/api/settings/call-history/route.test.ts
git commit -m "feat(m5): add pagination to call-history API with unit tests"
```

---

## Task 6: 文档

**Files:**
- Create: `docs/api/routing.md`
- Create: `docs/extensions/add-aggregator.md`

- [ ] **Step 1: 创建 docs/api/routing.md**

创建 `docs/api/routing.md`，内容如下：

````markdown
# Routing API Reference

## Overview

Smart Routing 为每次 AI 生成请求自动选择最优 API Key，基于成功率、延迟和成本三维评分。

---

## Endpoints

### GET /api/settings/call-history

返回当前用户近 30 天的调用统计。

#### 聚合模式（默认）

```
GET /api/settings/call-history
```

**Response 200:**

```json
{
  "total": 42,
  "successCount": 38,
  "avgLatencyMs": 1240,
  "totalCostCents": 186,
  "byModel": {
    "nano-banana-2": {
      "total": 20,
      "success": 18,
      "avgLatencyMs": 980,
      "totalCostCents": 60
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | number | 30 天内总调用次数（最多 500 条） |
| `successCount` | number | 状态为 `success` 的次数 |
| `avgLatencyMs` | number | 全部调用平均延迟（ms） |
| `totalCostCents` | number | 预估总费用（美分） |
| `byModel` | object | 按逻辑模型 ID 分组的明细 |

#### 分页模式

```
GET /api/settings/call-history?page=1&pageSize=20
```

**Query Params:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | — | 页码（从 1 开始），有此参数时切换为分页模式 |
| `pageSize` | number | 20 | 每页条数，最大 100 |

**Response 200:**

```json
{
  "records": [
    {
      "id": "uuid",
      "logical_model_id": "nano-banana-2",
      "status": "success",
      "latency_ms": 980,
      "cost_estimate_cents": 3,
      "created_at": "2026-04-30T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

---

### GET /api/settings/routing-preferences

返回当前用户的三层路由偏好（scenario 级 + model 级）。

```
GET /api/settings/routing-preferences
```

**Response 200:**

```json
{
  "preferences": [
    {
      "id": "uuid",
      "level": "scenario",
      "target": "image",
      "preferred_key_id": "key-uuid-or-null",
      "fallback_enabled": true
    },
    {
      "id": "uuid",
      "level": "model",
      "target": "nano-banana-2",
      "preferred_key_id": "key-uuid",
      "fallback_enabled": true
    }
  ]
}
```

### POST /api/settings/routing-preferences

创建或更新路由偏好（upsert by level + target）。

**Request Body:**

```json
{
  "level": "scenario",
  "target": "image",
  "preferred_key_id": "key-uuid-or-null",
  "fallback_enabled": true
}
```

| 字段 | 说明 |
|------|------|
| `level` | `"scenario"` \| `"model"` |
| `target` | scenario 名称或 logicalModelId |
| `preferred_key_id` | 指定 key UUID；`null` = 自动选择 |
| `fallback_enabled` | 首选 key 失败时是否自动 fallback |

---

### GET /api/settings/capabilities

返回当前用户已解锁的逻辑模型 ID 集合。

```
GET /api/settings/capabilities
```

**Response 200:**

```json
{
  "byKey": {
    "key-uuid": ["nano-banana-2", "nano-banana-pro"]
  },
  "all": ["nano-banana-2", "nano-banana-pro", "grok-image"]
}
```

---

## Error Responses

所有 endpoint 在认证失败时返回：

```json
{ "error": "unauthorized" }
```

HTTP 状态码：`401`

数据库错误时返回：

```json
{ "error": "error message from Supabase" }
```

HTTP 状态码：`500`
````

- [ ] **Step 2: 创建 docs/extensions/add-aggregator.md**

创建 `docs/extensions/add-aggregator.md`，内容如下：

````markdown
# 如何扩展新的聚合维度

本指南说明如何在 `GET /api/settings/call-history` 基础上，添加新的聚合维度（例如：按 provider 分组、按日期分组）。

## 架构说明

调用历史存储在 `model_call_history` 表中，字段包括：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键 |
| `user_id` | uuid | 关联用户 |
| `logical_model_id` | text | 逻辑模型 ID，如 `nano-banana-2` |
| `key_id` | uuid \| null | 关联 API Key（key 删除后置 NULL） |
| `status` | text | `success` \| `failed` \| `timeout` |
| `latency_ms` | integer | 调用延迟（ms） |
| `cost_estimate_cents` | integer | 预估费用（美分） |
| `created_at` | timestamptz | 调用时间 |

已存在索引：
- `idx_history_user_model_time` on `(user_id, logical_model_id, created_at DESC)`
- `idx_history_user_key_time` on `(user_id, key_id, created_at DESC)`

## 添加新聚合维度的步骤

### Step 1: 确定新维度的 SQL 查询

以「按 provider 分组」为例，provider 信息需要 JOIN `user_api_keys` 表：

```sql
SELECT
  k.provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE h.status = 'success') AS success_count,
  ROUND(AVG(h.latency_ms)) AS avg_latency_ms,
  SUM(h.cost_estimate_cents) AS total_cost_cents
FROM model_call_history h
LEFT JOIN user_api_keys k ON h.key_id = k.id
WHERE h.user_id = $1
  AND h.created_at >= NOW() - INTERVAL '30 days'
GROUP BY k.provider
ORDER BY total DESC;
```

### Step 2: 在 route.ts 中添加新聚合

在 `src/app/api/settings/call-history/route.ts` 的聚合模式分支中，添加新字段：

```typescript
// 按 provider 分组（示例）
const byProvider: Record<string, { total: number; success: number }> = {}
for (const r of rows) {
  // 需要先在 select 中加入 key_id 和 JOIN user_api_keys
  // 此处仅示意聚合逻辑
}

return NextResponse.json({
  total,
  successCount,
  avgLatencyMs,
  totalCostCents,
  byModel,
  byProvider, // 新增字段
})
```

### Step 3: 更新 CostSummaryPanel（如需展示）

在 `src/features/settings/CostSummaryPanel.tsx` 中：

1. 在 `CallHistoryStats` interface 中添加新字段：
   ```typescript
   byProvider?: Record<string, { total: number; success: number }>
   ```

2. 在 JSX 中添加新的展示表格（参考 `byModel` 部分的实现）。

3. 在 `src/i18n/locales/zh.json` 和 `en.json` 的 `settings.costPanel` 中添加对应标签。

### Step 4: 测试

在 `src/app/api/settings/call-history/route.test.ts` 中为新字段添加测试用例：

```typescript
it('byProvider 按 provider 正确分组', async () => {
  // mock 数据包含 provider 信息
  mockLimit.mockResolvedValueOnce({ data: rowsWithProvider, error: null })
  const res = await GET(makeRequest())
  const body = await res.json()
  expect(body.byProvider['kie'].total).toBe(2)
})
```

### Step 5: 文档

更新 `docs/api/routing.md` 中 `GET /api/settings/call-history` 的 Response 格式，加入新字段说明。

## 注意事项

- **limit 上限**：聚合模式默认读取最近 500 条记录做内存聚合。若数据量超大，应改为 Supabase 的 `rpc()` 调用服务端聚合函数。
- **NULL 处理**：`key_id` 在 key 被删除后为 NULL，聚合时需要 `LEFT JOIN` 并处理 NULL provider。
- **索引**：新的聚合维度若涉及非 `user_id + created_at` 的查询路径，考虑在 `supabase/migrations/` 中新增索引迁移文件。
````

- [ ] **Step 3: Commit**

```bash
git add docs/api/routing.md docs/extensions/add-aggregator.md
git commit -m "docs(m5): add routing API reference and add-aggregator extension guide"
```

---

## Task 7: 全量验证 + tag

**Files:**
- 无新增文件，仅验证

- [ ] **Step 1: TypeScript 全量检查**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 2: 运行全部单元 + 集成测试**

```bash
npx vitest run
```

期望：全部通过

- [ ] **Step 3: 本地 E2E 测试（1 worker 模拟 CI）**

```bash
npx playwright test --workers=1 --reporter=list
```

期望：32 passed，0 failed

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

期望：build 成功，无 TypeScript/lint 错误

- [ ] **Step 5: 打 M5 tag**

```bash
git tag smart-routing-m5
git push origin smart-routing-m5
```

- [ ] **Step 6: 最终 commit（如有遗漏）**

```bash
git push
```

---

## M5 Exit Criteria 检查

| 标准 | 验证方式 |
|------|---------|
| CostSummaryPanel 在 Settings 页面和 SettingsDialog 均可见 | Task 3 手动验证 |
| 30 天调用统计正确展示（KPI + 按模型明细） | Task 3 手动验证 |
| call-history API 支持分页（`?page=`） | Task 5 单元测试 |
| 深色/浅色模式样式正常 | Task 3 手动验证 |
| TypeScript 0 错误 | Task 7 Step 1 |
| 所有单元测试通过 | Task 7 Step 2 |
| E2E 32/32 通过 | Task 7 Step 3 |
| docs/api/routing.md 已创建 | Task 6 Step 1 |
| docs/extensions/add-aggregator.md 已创建 | Task 6 Step 2 |
| 打 smart-routing-m5 tag | Task 7 Step 5 |
