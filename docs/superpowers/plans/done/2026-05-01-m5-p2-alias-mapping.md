# Alias Mapping (P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户在 KeyManager 中为自定义 OpenAI-compat 端点手动指定它支持哪些逻辑模型（别名映射），解决第三方端点模型 ID 与系统 logical model ID 不匹配的问题。

**Architecture:** 别名映射直接写入现有 `user_key_capabilities` 表（`source='alias'`），无需新表。新增 `GET/POST/DELETE /api/settings/api-keys/[id]/capabilities` 端点管理每个 key 的能力条目；`useKeyManager` 在 reload 时为 custom 类型的 key 额外拉取 alias 列表；`KeyRow.tsx` 对 `provider.startsWith('custom:')` 的 key 展示别名管理 UI。

**Tech Stack:** Next.js 15 App Router · React 18 · TypeScript · Supabase · react-i18next · Vitest · CSS 变量主题系统

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/i18n/locales/zh.json` | 修改 | 添加 `settings.aliasMap.*` 中文键 |
| `src/i18n/locales/en.json` | 修改 | 添加 `settings.aliasMap.*` 英文键 |
| `src/app/api/settings/api-keys/[id]/capabilities/route.ts` | 新建 | GET/POST/DELETE 管理 key 的 capabilities |
| `src/app/api/settings/api-keys/[id]/capabilities/route.test.ts` | 新建 | 上述端点的 Vitest 单元测试 |
| `src/features/settings/KeyManager/useKeyManager.ts` | 修改 | `KeyRowData` 加 `aliasIds`；添加 `addAlias`/`removeAlias` |
| `src/features/settings/KeyManager/KeyRow.tsx` | 修改 | 别名映射 UI：能力 tag + 添加下拉 + 删除按钮 |
| `src/features/settings/KeyManager/KeyManager.tsx` | 修改 | 向 `KeyRow` 传入 `onAddAlias`/`onRemoveAlias` |

---

## Task 1: i18n 键

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: 在 zh.json 的 `settings.costPanel` 块之后添加 `aliasMap`**

在 `src/i18n/locales/zh.json` 的 `"settings"` 对象中，找到 `"costPanel"` 块的末尾 `}` 后的逗号，紧接着添加：

```json
    "aliasMap": {
      "title": "模型别名映射",
      "desc": "手动指定此端点支持的逻辑模型（用于无法自动识别的端点）",
      "addPlaceholder": "选择逻辑模型",
      "addBtn": "添加",
      "removeBtn": "移除",
      "probeSource": "自动探测",
      "aliasSource": "手动映射"
    }
```

- [ ] **Step 2: 在 en.json 同样位置添加 `aliasMap`**

```json
    "aliasMap": {
      "title": "Model Alias Mapping",
      "desc": "Manually specify which logical models this endpoint supports",
      "addPlaceholder": "Select logical model",
      "addBtn": "Add",
      "removeBtn": "Remove",
      "probeSource": "Auto-detected",
      "aliasSource": "Manual"
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
git commit -m "feat(alias): add aliasMap i18n keys"
```

---

## Task 2: capabilities API 端点（测试先行）

**Files:**
- Create: `src/app/api/settings/api-keys/[id]/capabilities/route.test.ts`
- Create: `src/app/api/settings/api-keys/[id]/capabilities/route.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/app/api/settings/api-keys/[id]/capabilities/route.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- hoisted mocks ---
const {
  mockMaybeSingle, mockSelect, mockEq, mockIn, mockUpsert, mockDelete,
  mockFrom, mockSupabase,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockIn = vi.fn()
  const mockUpsert = vi.fn()
  const mockDelete = vi.fn()

  const chain: Record<string, unknown> = {}
  chain.select = mockSelect.mockReturnValue(chain)
  chain.eq = mockEq.mockReturnValue(chain)
  chain.in = mockIn.mockReturnValue(chain)
  chain.upsert = mockUpsert.mockReturnValue(chain)
  chain.delete = mockDelete.mockReturnValue(chain)
  chain.maybeSingle = mockMaybeSingle

  const mockFrom = vi.fn(() => chain)
  const mockSupabase = { from: mockFrom }

  return { mockMaybeSingle, mockSelect, mockEq, mockIn, mockUpsert, mockDelete, mockFrom, mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  getAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

import { GET, POST, DELETE } from './route'

const KEY_ID = 'key-uuid-1'

function makeCtx() {
  return { params: Promise.resolve({ id: KEY_ID }) }
}

function makeReq(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/settings/api-keys/${KEY_ID}/capabilities`, {
    method,
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  const chain: Record<string, unknown> = {}
  chain.select = mockSelect.mockReturnValue(chain)
  chain.eq = mockEq.mockReturnValue(chain)
  chain.in = mockIn.mockReturnValue(chain)
  chain.upsert = mockUpsert.mockReturnValue(chain)
  chain.delete = mockDelete.mockReturnValue(chain)
  chain.maybeSingle = mockMaybeSingle
  mockFrom.mockReturnValue(chain)
})

describe('GET /api/settings/api-keys/[id]/capabilities', () => {
  it('未认证时返回 401', async () => {
    const { getAuthUser } = await import('@/lib/supabase/server')
    vi.mocked(getAuthUser).mockResolvedValueOnce(null)
    const res = await GET(makeReq('GET'), makeCtx())
    expect(res.status).toBe(401)
  })

  it('key 不属于用户时返回 404', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await GET(makeReq('GET'), makeCtx())
    expect(res.status).toBe(404)
  })

  it('返回该 key 的 capabilities 列表', async () => {
    // first call: ownership check
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    // second call: select capabilities — mockEq resolves
    mockEq.mockResolvedValueOnce({
      data: [
        { logical_model_id: 'nano-banana-2', source: 'probe' },
        { logical_model_id: 'grok-image', source: 'alias' },
      ],
      error: null,
    })
    const res = await GET(makeReq('GET'), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.capabilities).toHaveLength(2)
    expect(body.capabilities[1].source).toBe('alias')
  })
})

describe('POST /api/settings/api-keys/[id]/capabilities', () => {
  it('缺少 logicalModelId 时返回 400', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    const res = await POST(makeReq('POST', {}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('成功插入 alias 后返回 ok', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    mockUpsert.mockResolvedValueOnce({ error: null })
    const res = await POST(makeReq('POST', { logicalModelId: 'nano-banana-2' }), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})

describe('DELETE /api/settings/api-keys/[id]/capabilities', () => {
  it('缺少 logicalModelId 时返回 400', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    const res = await DELETE(makeReq('DELETE', {}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('成功删除 alias 后返回 ok', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: KEY_ID }, error: null })
    mockEq.mockResolvedValueOnce({ error: null })
    const res = await DELETE(makeReq('DELETE', { logicalModelId: 'nano-banana-2' }), makeCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败（route.ts 尚不存在）**

```bash
npx vitest run src/app/api/settings/api-keys/\[id\]/capabilities/route.test.ts --reporter=verbose 2>&1 | tail -10
```

期望：FAIL — `Cannot find module './route'`

- [ ] **Step 3: 实现 route.ts**

创建 `src/app/api/settings/api-keys/[id]/capabilities/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

/** 验证 keyId 属于当前用户，返回 true 表示验证通过 */
async function verifyOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data, error } = await supabase
    .from('user_key_capabilities')
    .select('logical_model_id, source')
    .eq('key_id', keyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    capabilities: (data ?? []).map((r) => ({
      logicalModelId: r.logical_model_id,
      source: r.source,
    })),
  })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = (await req.json()) as { logicalModelId?: string }
  if (!body.logicalModelId)
    return NextResponse.json({ error: 'logicalModelId required' }, { status: 400 })

  const { error } = await supabase
    .from('user_key_capabilities')
    .upsert(
      { key_id: keyId, logical_model_id: body.logicalModelId, source: 'alias' },
      { onConflict: 'key_id,logical_model_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = (await req.json()) as { logicalModelId?: string }
  if (!body.logicalModelId)
    return NextResponse.json({ error: 'logicalModelId required' }, { status: 400 })

  const { error } = await supabase
    .from('user_key_capabilities')
    .delete()
    .eq('key_id', keyId)
    .eq('logical_model_id', body.logicalModelId)
    .eq('source', 'alias')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: 运行测试，确认全部通过**

```bash
npx vitest run src/app/api/settings/api-keys/\[id\]/capabilities/route.test.ts --reporter=verbose 2>&1 | tail -20
```

期望：7 passed，0 failed

- [ ] **Step 5: TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/settings/api-keys/[id]/capabilities/route.ts" "src/app/api/settings/api-keys/[id]/capabilities/route.test.ts"
git commit -m "feat(alias): add GET/POST/DELETE capabilities API with unit tests"
```

---

## Task 3: useKeyManager hook 更新

**Files:**
- Modify: `src/features/settings/KeyManager/useKeyManager.ts`

- [ ] **Step 1: 更新 `KeyRowData` 接口，添加 `aliasIds` 字段**

在 `src/features/settings/KeyManager/useKeyManager.ts` 中，将 `KeyRowData` 接口替换为：

```typescript
export interface KeyRowData {
  id: string
  provider: string
  maskedValue: string
  key_index: number
  status: string
  base_url: string | null
  protocol: string
  display_name: string | null
  last_verified_at: string | null
  last_error: string | null
  capabilities: string[]
  aliasIds: string[]  // 仅包含 source='alias' 的 logicalModelId
}
```

- [ ] **Step 2: 更新 `reload` 函数，为 custom key 拉取 alias 列表**

将 `reload` 函数替换为：

```typescript
const reload = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const [keysRes, capRes] = await Promise.all([
      fetch('/api/settings/api-keys'),
      fetch('/api/settings/capabilities'),
    ])
    if (!keysRes.ok) throw new Error(`api-keys ${keysRes.status}`)
    if (!capRes.ok) throw new Error(`capabilities ${capRes.status}`)
    const keyRows = (await keysRes.json()) as ApiKeyResponse[]
    const cap = (await capRes.json()) as CapabilitiesResponse

    // 为 custom 类型的 key 额外拉取 alias 列表（通常只有 1-3 个）
    const customKeys = keyRows.filter((r) => r.provider.startsWith('custom:'))
    const aliasResults = await Promise.all(
      customKeys.map((r) =>
        fetch(`/api/settings/api-keys/${r.id}/capabilities`)
          .then((res) => (res.ok ? res.json() : { capabilities: [] }))
          .then((data: { capabilities: { logicalModelId: string; source: string }[] }) => ({
            keyId: r.id,
            aliasIds: data.capabilities
              .filter((c) => c.source === 'alias')
              .map((c) => c.logicalModelId),
          }))
          .catch(() => ({ keyId: r.id, aliasIds: [] as string[] })),
      ),
    )
    const aliasMap = Object.fromEntries(aliasResults.map(({ keyId, aliasIds }) => [keyId, aliasIds]))

    setKeys(
      keyRows.map((r) => ({
        id: r.id,
        provider: r.provider,
        maskedValue: r.maskedValue,
        key_index: r.key_index,
        status: r.status,
        base_url: r.base_url,
        protocol: r.protocol,
        display_name: r.display_name,
        last_verified_at: r.last_verified_at,
        last_error: r.last_error,
        capabilities: cap.byKey[r.id] ?? [],
        aliasIds: aliasMap[r.id] ?? [],
      })),
    )
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setLoading(false)
  }
}, [])
```

- [ ] **Step 3: 在 `probe` 之后添加 `addAlias` 和 `removeAlias`**

在 `probe` 函数之后（`return` 语句之前）添加：

```typescript
const addAlias = useCallback(
  async (keyId: string, logicalModelId: string) => {
    const res = await fetch(`/api/settings/api-keys/${keyId}/capabilities`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ logicalModelId }),
    })
    if (!res.ok) throw new Error(await readError(res, 'add alias failed'))
    await reload()
  },
  [reload],
)

const removeAlias = useCallback(
  async (keyId: string, logicalModelId: string) => {
    const res = await fetch(`/api/settings/api-keys/${keyId}/capabilities`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ logicalModelId }),
    })
    if (!res.ok) throw new Error(await readError(res, 'remove alias failed'))
    await reload()
  },
  [reload],
)
```

- [ ] **Step 4: 更新 return 语句**

将文件末尾的 `return` 语句替换为：

```typescript
return { keys, loading, error, reload, addKey, deleteKey, probe, addAlias, removeAlias }
```

- [ ] **Step 5: TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/KeyManager/useKeyManager.ts
git commit -m "feat(alias): extend useKeyManager with aliasIds and addAlias/removeAlias"
```

---

## Task 4: KeyRow UI + KeyManager 传参

**Files:**
- Modify: `src/features/settings/KeyManager/KeyRow.tsx`
- Modify: `src/features/settings/KeyManager/KeyManager.tsx`

- [ ] **Step 1: 替换 KeyRow.tsx**

将 `src/features/settings/KeyManager/KeyRow.tsx` 完整替换为：

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LOGICAL_MODELS } from '@/config/logical-models'
import type { KeyRowData } from './useKeyManager'

interface Props {
  row: KeyRowData
  onProbe: (id: string) => Promise<void>
  onDelete: (provider: string, keyIndex: number) => Promise<void>
  onAddAlias: (keyId: string, logicalModelId: string) => Promise<void>
  onRemoveAlias: (keyId: string, logicalModelId: string) => Promise<void>
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  active:       { text: '已验证',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  unverified:   { text: '待探测',   color: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/50' },
  invalid:      { text: '无效',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  rate_limited: { text: '限流',     color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  exhausted:    { text: '额度耗尽', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
}

export function KeyRow({ row, onProbe, onDelete, onAddAlias, onRemoveAlias }: Props) {
  const { t } = useTranslation()
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.unverified
  const label = row.display_name ?? row.provider
  const isCustom = row.provider.startsWith('custom:')
  const [selectedModel, setSelectedModel] = useState('')
  const [adding, setAdding] = useState(false)

  // 下拉选项：过滤掉已在 capabilities 中的模型
  const available = LOGICAL_MODELS.filter((m) => !row.capabilities.includes(m.id))

  async function handleAddAlias() {
    if (!selectedModel) return
    setAdding(true)
    try {
      await onAddAlias(row.id, selectedModel)
      setSelectedModel('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--ui-line)] p-3">
      {/* 头部：名称 + 状态 + 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ui-fg)]">{label}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{badge.text}</span>
          <span className="font-mono text-xs text-[var(--ui-fg-muted)]">{row.maskedValue}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-[var(--ui-fg)] hover:bg-[var(--ui-surface-field)]"
            onClick={() => void onProbe(row.id)}
          >
            重新探测
          </button>
          <button
            type="button"
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
            onClick={() => void onDelete(row.provider, row.key_index)}
          >
            删除
          </button>
        </div>
      </div>

      {/* 已解锁模型标签 */}
      <div className="text-xs text-[var(--ui-fg-muted)]">
        已解锁模型（{row.capabilities.length}）
      </div>
      {row.capabilities.length === 0 ? (
        <p className="text-xs italic text-[var(--ui-fg-muted)]">
          无{isCustom ? '（可在下方手动添加）' : '（点"重新探测"）'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.capabilities.map((cap) => {
            const isAlias = row.aliasIds.includes(cap)
            return (
              <span
                key={cap}
                className="flex items-center gap-1 rounded bg-[var(--ui-surface-field)] px-2 py-0.5 text-xs text-[var(--ui-fg)]"
              >
                {cap}
                <span className="text-[var(--ui-fg-muted)]">
                  ({isAlias
                    ? t('settings.aliasMap.aliasSource')
                    : t('settings.aliasMap.probeSource')})
                </span>
                {isAlias && (
                  <button
                    type="button"
                    className="ml-0.5 leading-none text-[var(--ui-fg-muted)] hover:text-red-500"
                    title={t('settings.aliasMap.removeBtn')}
                    onClick={() => void onRemoveAlias(row.id, cap)}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* 别名映射添加 UI — 仅 custom 端点显示 */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="ui-field border flex-1 px-2 py-1 text-xs"
          >
            <option value="">{t('settings.aliasMap.addPlaceholder')}</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedModel || adding}
            onClick={() => void handleAddAlias()}
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-[var(--ui-fg)] disabled:opacity-40 hover:bg-[var(--ui-surface-field)]"
          >
            {t('settings.aliasMap.addBtn')}
          </button>
        </div>
      )}

      {row.last_error && (
        <div className="text-xs text-red-500">最近错误：{row.last_error}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 更新 KeyManager.tsx，传入新 props**

在 `src/features/settings/KeyManager/KeyManager.tsx` 中：

1. 将 `const { keys, loading, error, addKey, deleteKey, probe } = useKeyManager()` 替换为：

```typescript
const { keys, loading, error, addKey, deleteKey, probe, addAlias, removeAlias } = useKeyManager()
```

2. 将 `<KeyRow key={k.id} row={k} onProbe={probe} onDelete={deleteKey} />` 替换为：

```tsx
<KeyRow
  key={k.id}
  row={k}
  onProbe={probe}
  onDelete={deleteKey}
  onAddAlias={addAlias}
  onRemoveAlias={removeAlias}
/>
```

- [ ] **Step 3: TypeScript 编译**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/KeyManager/KeyRow.tsx src/features/settings/KeyManager/KeyManager.tsx
git commit -m "feat(alias): add alias mapping UI to KeyRow for custom endpoints"
```

---

## Task 5: 全量验证 + tag

**Files:**
- 无新增文件，仅验证

- [ ] **Step 1: 运行全套单元测试**

```bash
npx vitest run
```

期望：全部通过，无新增失败

- [ ] **Step 2: TypeScript 全量检查**

```bash
npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 3: 构建验证**

```bash
npm run build
```

期望：build 成功，0 错误

- [ ] **Step 4: 本地 E2E 测试**

```bash
npx playwright test --workers=1 --reporter=list 2>&1 | tail -5
```

期望：0 failed

- [ ] **Step 5: 打 tag 并推送**

```bash
git tag smart-routing-p2-alias
git push && git push origin smart-routing-p2-alias
```

---

## Exit Criteria 检查

| 标准 | 验证方式 |
|------|---------|
| custom key 的 KeyRow 显示别名管理 UI | Task 4 视觉验证 |
| 可添加 logical model → 写入 source='alias' | Task 2 单元测试 |
| 只有 alias 条目有 × 删除按钮 | Task 4 视觉验证 |
| probe 自动探测的条目不可手动删除 | KeyRow 逻辑：只对 `aliasIds` 内的显示 × |
| non-custom key 不显示别名管理 | KeyRow isCustom 条件 |
| TypeScript 0 错误 | Task 5 Step 2 |
| 全套 vitest 通过 | Task 5 Step 1 |
| build 0 错误 | Task 5 Step 3 |
