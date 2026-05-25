# M2 Implementation Plan — BYOK 与能力探测

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 按任务执行。步骤用 checkbox (`- [ ]`) 跟踪。

**Goal:** 让用户可以在 Settings 页手动添加任意内置 provider 或 OpenAI-compat 自定义端点的 API key,系统通过连通性 + `/v1/models` 探测把"已解锁模型清单"写入 `user_key_capabilities` 表,但暂不接入智能路由。

**Architecture:** Ports & Adapters 分层。新建 `src/server/ai/capability/` 作为探测端口(prober),借助 M1 的 `listOpenAICompatModels` 和 `provider-catalog` 做能力发现;在 `src/app/api/settings/` 新增 `/api-keys/[id]/probe` 与 `/capabilities` 两个路由,并扩展现有 `/api-keys` POST/GET 支持 `base_url`、`protocol`、`display_name` 字段;UI 层在 `src/features/settings/KeyManager/` 建立组件树,挂到现有 `src/app/(app)/settings/page.tsx`。

**Tech Stack:** Next.js 15 App Router / TypeScript / Zod / Supabase JS / Vitest (jsdom) / 已有 AES-256-CBC 加密栈 / M1 已就绪的 `openaiCompat.ts`、`provider-catalog.ts`、`registry.ts`、migration 015。

---

## 文件结构

**新建:**

- `src/server/ai/capability/types.ts` — `ProbeResult` / `KeyStatus` / `CapabilityEntry` 类型
- `src/server/ai/capability/prober.ts` — `probeKey(supabase, keyId)` 主函数:查 key → 按 protocol 分派 → 写 `user_api_keys` 与 `user_key_capabilities` → 返回 `ProbeResult`
- `src/server/ai/capability/prober.test.ts`
- `src/app/api/settings/api-keys/[id]/probe/route.ts` — `POST` 触发单个 key 的 probe
- `src/app/api/settings/capabilities/route.ts` — `GET` 返回当前用户所有 key 的能力集合
- `__tests__/api/api-keys-probe.test.ts`
- `__tests__/api/capabilities.test.ts`
- `src/features/settings/KeyManager/KeyManager.tsx` — 容器组件
- `src/features/settings/KeyManager/AddKeyForm.tsx` — 添加表单(内置 provider or custom OpenAI-compat)
- `src/features/settings/KeyManager/KeyRow.tsx` — 单行展示(状态徽章 / 能力数 / 重探测 / 删除)
- `src/features/settings/KeyManager/useKeyManager.ts` — fetch + mutate hook
- `__tests__/unit/keyManager-hook.test.ts`

**修改:**

- `src/app/api/settings/api-keys/route.ts` — POST schema 加 `base_url`/`protocol`/`display_name` 可选,`provider` 放宽为 `z.string()` 以接受 `custom:<uuid>`;GET 回写新字段
- `__tests__/api/api-keys-crud.test.ts` — 若不存在则新建,覆盖 POST 新字段
- `src/app/(app)/settings/page.tsx` — 挂载 `<KeyManager />` 替换现有占位 UI
- `src/lib/validation.ts`(若存在)或 inline — 新增 `createApiKeySchema`

---

## Task 1: 扩展 POST /api/settings/api-keys 支持 base_url / protocol / display_name

**Files:**
- Modify: `src/app/api/settings/api-keys/route.ts`
- Test: `__tests__/api/api-keys-crud.test.ts` (新建)

- [ ] **Step 1: 写失败测试**

创建 `__tests__/api/api-keys-crud.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const existingSelect = vi.fn().mockResolvedValue({ data: [], error: null })
  const authUser = { id: 'user-1' }
  return { upsert, existingSelect, authUser }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (_table: string) => ({
      upsert: mock.upsert,
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => mock.existingSelect(),
            }),
          }),
        }),
      }),
    }),
  }),
  getAuthUser: async () => mock.authUser,
}))

import { POST } from '@/app/api/settings/api-keys/route'

describe('POST /api/settings/api-keys', () => {
  beforeEach(() => {
    mock.upsert.mockClear()
    mock.existingSelect.mockClear().mockResolvedValue({ data: [], error: null })
  })

  it('接受自定义 custom:<uuid> provider 与 base_url/protocol/display_name', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'custom:a1b2c3',
        key: 'sk-abc-12345',
        base_url: 'https://api.example.com/v1',
        protocol: 'openai-compat',
        display_name: 'My Aggregator',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mock.upsert).toHaveBeenCalledTimes(1)
    const row = mock.upsert.mock.calls[0][0]
    expect(row.provider).toBe('custom:a1b2c3')
    expect(row.base_url).toBe('https://api.example.com/v1')
    expect(row.protocol).toBe('openai-compat')
    expect(row.display_name).toBe('My Aggregator')
  })

  it('内置 provider 不带 base_url 时 protocol 默认 native', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ provider: 'kie', key: 'sk-kie-test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const row = mock.upsert.mock.calls[0][0]
    expect(row.protocol).toBe('native')
    expect(row.base_url).toBeUndefined()
  })

  it('custom 前缀必须带 base_url,否则 400', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ provider: 'custom:x', key: 'sk-1234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```
npx vitest run __tests__/api/api-keys-crud.test.ts
```

期望:3 个测试全部 FAIL(schema 尚未放宽,`custom:a1b2c3` 会被旧 enum 拒绝)。

- [ ] **Step 3: 修改 route.ts schema + upsert**

把 `src/app/api/settings/api-keys/route.ts` 中的 `SUPPORTED_PROVIDERS` 和 `addKeySchema` 替换为:

```typescript
const BUILT_IN_PROVIDERS = ['kie', 'ppio', 'grsai', 'fal', 'openai', 'anthropic'] as const

const CUSTOM_PREFIX = 'custom:'

const addKeySchema = z
  .object({
    provider: z.string().min(1),
    key: z.string().min(8),
    key_index: z.number().int().min(0).optional(),
    base_url: z.string().url().optional(),
    protocol: z.enum(['native', 'openai-compat']).optional(),
    display_name: z.string().max(80).optional(),
  })
  .refine(
    (v) =>
      v.provider.startsWith(CUSTOM_PREFIX) ||
      (BUILT_IN_PROVIDERS as readonly string[]).includes(v.provider),
    { message: 'provider must be built-in or start with "custom:"', path: ['provider'] }
  )
  .refine(
    (v) => !v.provider.startsWith(CUSTOM_PREFIX) || Boolean(v.base_url),
    { message: 'custom provider requires base_url', path: ['base_url'] }
  )
```

在 upsert payload 里加入 `base_url`、`protocol`、`display_name`,没有 base_url 时 protocol 默认 `'native'`:

```typescript
const protocol = parsed.data.protocol ?? (parsed.data.base_url ? 'openai-compat' : 'native')

const { error } = await supabase
  .from('user_api_keys')
  .upsert(
    {
      user_id: user.id,
      provider,
      encrypted_key: encrypted,
      iv,
      key_index: keyIndex,
      status: 'unverified',
      error_count: 0,
      last_error: null,
      base_url: parsed.data.base_url,
      protocol,
      display_name: parsed.data.display_name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider,key_index' }
  )
```

同时把 `deleteKeySchema` 和 `updateStatusSchema` 的 `provider` 字段从 enum 改为 `z.string()`。

- [ ] **Step 4: 跑测试确认通过**

```
npx vitest run __tests__/api/api-keys-crud.test.ts
```

期望:3 passed。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/api-keys/route.ts __tests__/api/api-keys-crud.test.ts
git commit -m "feat(api-keys): accept base_url/protocol/display_name + custom: prefix"
```

---

## Task 2: GET /api/settings/api-keys 回显新字段

**Files:**
- Modify: `src/app/api/settings/api-keys/route.ts`
- Test: `__tests__/api/api-keys-crud.test.ts`

- [ ] **Step 1: 追加 GET 测试**

在 `__tests__/api/api-keys-crud.test.ts` 文件里扩展 mock,加入 `.order().order()` 链的返回,并新增测试:

```typescript
const mockList = vi.hoisted(() => ({
  rows: [
    {
      id: 'k1',
      provider: 'custom:a1b2c3',
      encrypted_key: 'bm9wZQ==', // decrypt will throw → masked placeholder
      iv: 'AAAAAAAAAAAAAAAA',
      key_index: 0,
      status: 'active',
      base_url: 'https://api.example.com/v1',
      protocol: 'openai-compat',
      display_name: 'My Aggregator',
      last_verified_at: '2026-04-22T10:00:00Z',
      last_error: null,
      last_used_at: null,
      error_count: 0,
      created_at: '2026-04-21T00:00:00Z',
    },
  ],
}))
```

mock 的 `from()` 改为返回支持 GET 链的对象,加测试:

```typescript
it('GET 返回 base_url / protocol / display_name / last_verified_at', async () => {
  const { GET } = await import('@/app/api/settings/api-keys/route')
  const res = await GET()
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(Array.isArray(body)).toBe(true)
  expect(body[0]).toMatchObject({
    id: 'k1',
    provider: 'custom:a1b2c3',
    base_url: 'https://api.example.com/v1',
    protocol: 'openai-compat',
    display_name: 'My Aggregator',
    last_verified_at: '2026-04-22T10:00:00Z',
  })
})
```

> **重要**:把整文件的 `from()` mock 统一成一个工厂,根据链式调用返回对应子对象;POST 路径用 `upsert`/`select→eq→eq→order→limit`,GET 路径用 `select→eq→order→order`。示例:
>
> ```typescript
> const from = () => ({
>   upsert: mock.upsert,
>   select: () => ({
>     eq: (col: string, _val: unknown) => {
>       if (col === 'user_id') {
>         return {
>           eq: () => ({ order: () => ({ limit: () => mock.existingSelect() }) }),
>           order: () => ({ order: () => Promise.resolve({ data: mockList.rows, error: null }) }),
>         }
>       }
>       return {}
>     },
>   }),
> })
> ```

- [ ] **Step 2: 跑测试确认失败**

```
npx vitest run __tests__/api/api-keys-crud.test.ts -t "GET 返回"
```

期望:FAIL —— 当前 GET 没输出这些字段。

- [ ] **Step 3: 扩展 GET 的 select 和返回 shape**

在 `route.ts` 的 GET 里把 select 列表加上新字段,映射时返回:

```typescript
const { data, error } = await supabase
  .from('user_api_keys')
  .select('id, provider, encrypted_key, iv, key_index, status, last_error, last_used_at, error_count, created_at, base_url, protocol, display_name, last_verified_at')
  .eq('user_id', user.id)
  .order('provider')
  .order('key_index')
```

map 的返回值加入:

```typescript
return {
  id: row.id,
  provider: row.provider,
  maskedValue,
  key_index: row.key_index ?? 0,
  status: row.status ?? 'active',
  last_error: row.last_error,
  last_used_at: row.last_used_at,
  error_count: row.error_count ?? 0,
  created_at: row.created_at,
  base_url: row.base_url ?? null,
  protocol: row.protocol ?? 'native',
  display_name: row.display_name ?? null,
  last_verified_at: row.last_verified_at ?? null,
}
```

- [ ] **Step 4: 跑测试确认通过**

```
npx vitest run __tests__/api/api-keys-crud.test.ts
```

期望:4 passed(含 step 1 的 3 个 + 新的 1 个)。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/api-keys/route.ts __tests__/api/api-keys-crud.test.ts
git commit -m "feat(api-keys): GET returns base_url/protocol/display_name/last_verified_at"
```

---

## Task 3: Capability 类型与 prober 骨架

**Files:**
- Create: `src/server/ai/capability/types.ts`
- Create: `src/server/ai/capability/prober.ts`
- Test: `src/server/ai/capability/prober.test.ts`

- [ ] **Step 1: 写类型**

`src/server/ai/capability/types.ts`:

```typescript
/** key 的连通性状态流转,与 migration 015 中 user_api_keys.status 保持一致 */
export type KeyStatus = 'unverified' | 'active' | 'invalid' | 'rate_limited' | 'exhausted'

export interface CapabilityEntry {
  logical_model_id: string
  source: 'probed' | 'catalog'
}

export interface ProbeResult {
  keyId: string
  status: KeyStatus
  capabilities: CapabilityEntry[]
  /** 探测过程中若失败,记录原因 */
  error?: string
  probedAt: string
}
```

- [ ] **Step 2: 写 prober 失败测试**

`src/server/ai/capability/prober.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeKey } from './prober'

const supaMock = vi.hoisted(() => {
  return {
    keyRow: {
      id: 'k1',
      user_id: 'u1',
      provider: 'custom:abc',
      protocol: 'openai-compat',
      base_url: 'https://api.example.com/v1',
      encrypted_key: '',
      iv: '',
    },
    capabilitiesDelete: vi.fn().mockResolvedValue({ error: null }),
    capabilitiesInsert: vi.fn().mockResolvedValue({ error: null }),
    keyUpdate: vi.fn().mockResolvedValue({ error: null }),
    decryptResult: 'sk-live-test',
  }
})

vi.mock('@/server/ai/keyFetcher', () => ({
  decryptKeyForTesting: () => supaMock.decryptResult,
}))

vi.mock('@/server/ai/providers/openaiCompat', () => ({
  listOpenAICompatModels: vi.fn(async () => ['gpt-4o', 'claude-3-5-sonnet']),
}))

vi.mock('@/config/provider-catalog', () => ({
  getProviderCapabilities: vi.fn((provider: string) =>
    provider === 'kie' ? ['nano-banana-2', 'veo-3'] : []
  ),
}))

function makeSupabase(keyRow: typeof supaMock.keyRow | null, opts: { listError?: string } = {}) {
  return {
    from: (table: string) => {
      if (table === 'user_api_keys') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  opts.listError
                    ? Promise.resolve({ data: null, error: { message: opts.listError } })
                    : Promise.resolve({ data: keyRow, error: null }),
              }),
            }),
          }),
          update: (patch: unknown) => {
            supaMock.keyUpdate(patch)
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }
          },
        }
      }
      if (table === 'user_key_capabilities') {
        return {
          delete: () => ({
            eq: () => {
              supaMock.capabilitiesDelete()
              return Promise.resolve({ error: null })
            },
          }),
          insert: (rows: unknown) => {
            supaMock.capabilitiesInsert(rows)
            return Promise.resolve({ error: null })
          },
        }
      }
      return {}
    },
  }
}

describe('probeKey', () => {
  beforeEach(() => {
    supaMock.capabilitiesDelete.mockClear()
    supaMock.capabilitiesInsert.mockClear()
    supaMock.keyUpdate.mockClear()
  })

  it('custom:<uuid> 通过 listOpenAICompatModels 写入 probed capabilities', async () => {
    const result = await probeKey(makeSupabase(supaMock.keyRow) as never, 'u1', 'k1')
    expect(result.status).toBe('active')
    expect(result.capabilities).toEqual([
      { logical_model_id: 'gpt-4o', source: 'probed' },
      { logical_model_id: 'claude-3-5-sonnet', source: 'probed' },
    ])
    expect(supaMock.capabilitiesInsert).toHaveBeenCalledWith([
      { key_id: 'k1', logical_model_id: 'gpt-4o', source: 'probed' },
      { key_id: 'k1', logical_model_id: 'claude-3-5-sonnet', source: 'probed' },
    ])
    expect(supaMock.keyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', last_error: null })
    )
  })

  it('built-in provider 从 catalog 填入 capabilities', async () => {
    const row = { ...supaMock.keyRow, provider: 'kie', protocol: 'native', base_url: null }
    const result = await probeKey(makeSupabase(row) as never, 'u1', 'k1')
    expect(result.status).toBe('active')
    expect(result.capabilities).toEqual([
      { logical_model_id: 'nano-banana-2', source: 'catalog' },
      { logical_model_id: 'veo-3', source: 'catalog' },
    ])
  })

  it('listOpenAICompatModels 抛错时 status=invalid,记录 last_error', async () => {
    const { listOpenAICompatModels } = await import('@/server/ai/providers/openaiCompat')
    ;(listOpenAICompatModels as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'))
    const result = await probeKey(makeSupabase(supaMock.keyRow) as never, 'u1', 'k1')
    expect(result.status).toBe('invalid')
    expect(result.error).toContain('401')
    expect(supaMock.keyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'invalid' })
    )
  })

  it('key 不存在返回 status=invalid 不抛错', async () => {
    const result = await probeKey(makeSupabase(null) as never, 'u1', 'missing')
    expect(result.status).toBe('invalid')
    expect(result.error).toMatch(/not found/i)
  })
})
```

- [ ] **Step 3: 跑测试确认 FAIL**

```
npx vitest run src/server/ai/capability/prober.test.ts
```

期望:4 FAIL(模块不存在)。

- [ ] **Step 4: 实现 prober.ts**

`src/server/ai/capability/prober.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { listOpenAICompatModels } from '@/server/ai/providers/openaiCompat'
import { getProviderCapabilities } from '@/config/provider-catalog'
import { decryptKeyForTesting } from '@/server/ai/keyFetcher'
import type { CapabilityEntry, KeyStatus, ProbeResult } from './types'

const CUSTOM_PREFIX = 'custom:'

/**
 * 对单个 user_api_keys 行进行能力探测。
 *  - custom:<uuid>:调用 /v1/models,raw id → probed capabilities
 *  - 内置 provider:从 provider-catalog 读已知能力表,source='catalog'
 *
 * 成功写 user_key_capabilities(先清后插)并把 user_api_keys.status 置为 active;
 * 失败时 status 置为 invalid,记录 last_error。
 */
export async function probeKey(
  supabase: SupabaseClient,
  userId: string,
  keyId: string
): Promise<ProbeResult> {
  const { data: row, error: fetchError } = await supabase
    .from('user_api_keys')
    .select('id, user_id, provider, protocol, base_url, encrypted_key, iv')
    .eq('id', keyId)
    .eq('user_id', userId)
    .maybeSingle()

  const now = new Date().toISOString()

  if (fetchError || !row) {
    return {
      keyId,
      status: 'invalid',
      capabilities: [],
      error: fetchError?.message ?? 'key not found',
      probedAt: now,
    }
  }

  let status: KeyStatus = 'active'
  let capabilities: CapabilityEntry[] = []
  let errorMessage: string | undefined

  try {
    if (typeof row.provider === 'string' && row.provider.startsWith(CUSTOM_PREFIX)) {
      if (!row.base_url) throw new Error('custom provider missing base_url')
      const apiKey = decryptKeyForTesting(row.encrypted_key, row.iv)
      const ids = await listOpenAICompatModels(row.base_url, apiKey)
      capabilities = ids.map((id) => ({ logical_model_id: id, source: 'probed' as const }))
    } else {
      const catalog = getProviderCapabilities(row.provider)
      capabilities = catalog.map((id) => ({ logical_model_id: id, source: 'catalog' as const }))
    }
  } catch (e) {
    status = 'invalid'
    errorMessage = e instanceof Error ? e.message : String(e)
  }

  // 先清再插,保证不残留旧能力
  await supabase.from('user_key_capabilities').delete().eq('key_id', keyId)
  if (capabilities.length > 0) {
    await supabase.from('user_key_capabilities').insert(
      capabilities.map((c) => ({
        key_id: keyId,
        logical_model_id: c.logical_model_id,
        source: c.source,
      }))
    )
  }

  await supabase
    .from('user_api_keys')
    .update({
      status,
      last_error: status === 'active' ? null : errorMessage ?? null,
      last_verified_at: now,
    })
    .eq('id', keyId)
    .eq('user_id', userId)

  return { keyId, status, capabilities, error: errorMessage, probedAt: now }
}
```

> 该实现依赖 `decryptKeyForTesting(encrypted, iv)` 从 `keyFetcher`。下一步在 keyFetcher 导出此工具函数。

- [ ] **Step 5: 在 keyFetcher 暴露解密工具**

打开 `src/server/ai/keyFetcher.ts`,把现有的 `decrypt(encryptedBase64, ivBase64)` 局部函数重命名为 `export function decryptKeyForTesting(encryptedBase64: string, ivBase64: string): string`(或保留原 `decrypt` 并新增一个 re-export)。最小改动:在文件尾部添加:

```typescript
export function decryptKeyForTesting(encryptedBase64: string, ivBase64: string): string {
  return decrypt(encryptedBase64, ivBase64)
}
```

- [ ] **Step 6: 跑测试确认通过**

```
npx vitest run src/server/ai/capability/prober.test.ts
```

期望:4 passed。

- [ ] **Step 7: commit**

```bash
git add src/server/ai/capability/types.ts src/server/ai/capability/prober.ts src/server/ai/capability/prober.test.ts src/server/ai/keyFetcher.ts
git commit -m "feat(capability): add prober for custom + built-in providers"
```

---

## Task 4: POST /api/settings/api-keys/[id]/probe 路由

**Files:**
- Create: `src/app/api/settings/api-keys/[id]/probe/route.ts`
- Test: `__tests__/api/api-keys-probe.test.ts`

- [ ] **Step 1: 写失败测试**

`__tests__/api/api-keys-probe.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  probeResult: {
    keyId: 'k1',
    status: 'active' as const,
    capabilities: [{ logical_model_id: 'gpt-4o', source: 'probed' as const }],
    probedAt: '2026-04-22T10:00:00Z',
  },
  probeKey: vi.fn(),
}))

vi.mock('@/server/ai/capability/prober', () => ({
  probeKey: mock.probeKey,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({}),
  getAuthUser: async () => mock.authUser,
}))

beforeEach(() => {
  mock.probeKey.mockReset().mockResolvedValue(mock.probeResult)
})

describe('POST /api/settings/api-keys/[id]/probe', () => {
  it('未登录返回 401', async () => {
    mock.authUser = null
    const { POST } = await import('@/app/api/settings/api-keys/[id]/probe/route')
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: 'k1' }) })
    expect(res.status).toBe(401)
  })

  it('登录后调用 probeKey 并返回结果', async () => {
    mock.authUser = { id: 'u1' }
    const { POST } = await import('@/app/api/settings/api-keys/[id]/probe/route')
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ id: 'k1' }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mock.probeResult)
    expect(mock.probeKey).toHaveBeenCalledWith(expect.anything(), 'u1', 'k1')
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run __tests__/api/api-keys-probe.test.ts
```

期望:2 FAIL(route 不存在)。

- [ ] **Step 3: 实现 route**

`src/app/api/settings/api-keys/[id]/probe/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { probeKey } from '@/server/ai/capability/prober'

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const result = await probeKey(supabase, user.id, id)
  return NextResponse.json(result)
}
```

- [ ] **Step 4: 跑测试确认通过**

```
npx vitest run __tests__/api/api-keys-probe.test.ts
```

期望:2 passed。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/api-keys/\[id\]/probe/route.ts __tests__/api/api-keys-probe.test.ts
git commit -m "feat(api): POST /api/settings/api-keys/:id/probe"
```

---

## Task 5: GET /api/settings/capabilities 聚合路由

**Files:**
- Create: `src/app/api/settings/capabilities/route.ts`
- Test: `__tests__/api/capabilities.test.ts`

- [ ] **Step 1: 写失败测试**

`__tests__/api/capabilities.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  authUser: { id: 'u1' } as { id: string } | null,
  capabilityRows: [
    { key_id: 'k1', logical_model_id: 'gpt-4o', source: 'probed' },
    { key_id: 'k1', logical_model_id: 'nano-banana-2', source: 'probed' },
    { key_id: 'k2', logical_model_id: 'veo-3', source: 'catalog' },
  ],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'user_key_capabilities') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mock.capabilityRows, error: null }),
          }),
        }
      }
      if (table === 'user_api_keys') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'k1' }, { id: 'k2' }], error: null }),
          }),
        }
      }
      return {}
    },
  }),
  getAuthUser: async () => mock.authUser,
}))

describe('GET /api/settings/capabilities', () => {
  it('未登录返回 401', async () => {
    mock.authUser = null
    const { GET } = await import('@/app/api/settings/capabilities/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('返回 { byKey, all } 两视图', async () => {
    mock.authUser = { id: 'u1' }
    const { GET } = await import('@/app/api/settings/capabilities/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.byKey).toEqual({
      k1: ['gpt-4o', 'nano-banana-2'],
      k2: ['veo-3'],
    })
    expect(body.all.sort()).toEqual(['gpt-4o', 'nano-banana-2', 'veo-3'])
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run __tests__/api/capabilities.test.ts
```

期望:2 FAIL。

- [ ] **Step 3: 实现 route**

`src/app/api/settings/capabilities/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: keys, error: keyErr } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('user_id', user.id)
  if (keyErr) return NextResponse.json({ error: keyErr.message }, { status: 500 })

  const keyIds = (keys ?? []).map((k) => k.id)
  if (keyIds.length === 0) {
    return NextResponse.json({ byKey: {}, all: [] })
  }

  const { data: rows, error } = await supabase
    .from('user_key_capabilities')
    .select('key_id, logical_model_id, source')
    .in('key_id', keyIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byKey: Record<string, string[]> = {}
  const all = new Set<string>()
  for (const r of rows ?? []) {
    byKey[r.key_id] = byKey[r.key_id] ?? []
    byKey[r.key_id].push(r.logical_model_id)
    all.add(r.logical_model_id)
  }

  return NextResponse.json({ byKey, all: Array.from(all) })
}
```

- [ ] **Step 4: 跑测试确认通过**

```
npx vitest run __tests__/api/capabilities.test.ts
```

期望:2 passed。

- [ ] **Step 5: commit**

```bash
git add src/app/api/settings/capabilities/route.ts __tests__/api/capabilities.test.ts
git commit -m "feat(api): GET /api/settings/capabilities aggregates per-key capabilities"
```

---

## Task 6: useKeyManager hook 与数据层

**Files:**
- Create: `src/features/settings/KeyManager/useKeyManager.ts`
- Test: `__tests__/unit/keyManager-hook.test.ts`

- [ ] **Step 1: 写失败测试**

`__tests__/unit/keyManager-hook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeyManager } from '@/features/settings/KeyManager/useKeyManager'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('useKeyManager', () => {
  it('加载时并发请求 /api-keys 与 /capabilities', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/api/settings/api-keys')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 'k1', provider: 'kie', maskedValue: 'sk-a••••b', status: 'active', key_index: 0, base_url: null, protocol: 'native', display_name: null, last_verified_at: null, error_count: 0, last_error: null, last_used_at: null, created_at: '' },
            ]),
        })
      }
      if (url.endsWith('/api/settings/capabilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ byKey: { k1: ['nano-banana-2'] }, all: ['nano-banana-2'] }),
        })
      }
      return Promise.reject(new Error('unexpected url ' + url))
    })

    const { result } = renderHook(() => useKeyManager())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.keys).toHaveLength(1)
    expect(result.current.keys[0].capabilities).toEqual(['nano-banana-2'])
  })

  it('probe 调用 POST /probe 然后重新拉 capabilities', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 'k1', provider: 'kie', maskedValue: 's', status: 'unverified', key_index: 0, base_url: null, protocol: 'native', display_name: null, last_verified_at: null, error_count: 0, last_error: null, last_used_at: null, created_at: '' }]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ byKey: {}, all: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ keyId: 'k1', status: 'active', capabilities: [{ logical_model_id: 'nano-banana-2', source: 'catalog' }], probedAt: '' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 'k1', provider: 'kie', maskedValue: 's', status: 'active', key_index: 0, base_url: null, protocol: 'native', display_name: null, last_verified_at: '2026-04-22', error_count: 0, last_error: null, last_used_at: null, created_at: '' }]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ byKey: { k1: ['nano-banana-2'] }, all: ['nano-banana-2'] }) })

    const { result } = renderHook(() => useKeyManager())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.probe('k1') })
    expect(fetchMock).toHaveBeenCalledWith('/api/settings/api-keys/k1/probe', expect.objectContaining({ method: 'POST' }))
    expect(result.current.keys[0].capabilities).toEqual(['nano-banana-2'])
  })
})
```

- [ ] **Step 2: 跑测试确认 FAIL**

```
npx vitest run __tests__/unit/keyManager-hook.test.ts
```

期望:2 FAIL(hook 不存在)。

- [ ] **Step 3: 实现 hook**

`src/features/settings/KeyManager/useKeyManager.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'

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
}

interface ApiKeyResponse {
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
  last_used_at: string | null
  error_count: number
  created_at: string
}

interface CapabilitiesResponse {
  byKey: Record<string, string[]>
  all: string[]
}

export interface AddKeyInput {
  provider: string
  key: string
  base_url?: string
  protocol?: 'native' | 'openai-compat'
  display_name?: string
}

export function useKeyManager() {
  const [keys, setKeys] = useState<KeyRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const addKey = useCallback(
    async (input: AddKeyInput) => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'add failed')
      await reload()
    },
    [reload]
  )

  const deleteKey = useCallback(
    async (provider: string, keyIndex: number) => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, key_index: keyIndex }),
      })
      if (!res.ok) throw new Error('delete failed')
      await reload()
    },
    [reload]
  )

  const probe = useCallback(
    async (keyId: string) => {
      const res = await fetch(`/api/settings/api-keys/${keyId}/probe`, { method: 'POST' })
      if (!res.ok) throw new Error('probe failed')
      await reload()
    },
    [reload]
  )

  return { keys, loading, error, reload, addKey, deleteKey, probe }
}
```

- [ ] **Step 4: 跑测试确认通过**

```
npx vitest run __tests__/unit/keyManager-hook.test.ts
```

期望:2 passed。

- [ ] **Step 5: commit**

```bash
git add src/features/settings/KeyManager/useKeyManager.ts __tests__/unit/keyManager-hook.test.ts
git commit -m "feat(settings): useKeyManager hook with probe + capabilities"
```

---

## Task 7: KeyRow 展示组件

**Files:**
- Create: `src/features/settings/KeyManager/KeyRow.tsx`

- [ ] **Step 1: 实现 KeyRow**

`src/features/settings/KeyManager/KeyRow.tsx`:

```typescript
'use client'

import type { KeyRowData } from './useKeyManager'

interface Props {
  row: KeyRowData
  onProbe: (id: string) => Promise<void>
  onDelete: (provider: string, keyIndex: number) => Promise<void>
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  active: { text: '已验证', color: 'bg-green-100 text-green-800' },
  unverified: { text: '待探测', color: 'bg-gray-100 text-gray-800' },
  invalid: { text: '无效', color: 'bg-red-100 text-red-800' },
  rate_limited: { text: '限流', color: 'bg-yellow-100 text-yellow-800' },
  exhausted: { text: '额度耗尽', color: 'bg-orange-100 text-orange-800' },
}

export function KeyRow({ row, onProbe, onDelete }: Props) {
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.unverified
  const label = row.display_name ?? row.provider

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{label}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{badge.text}</span>
          <span className="font-mono text-xs text-gray-500">{row.maskedValue}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => void onProbe(row.id)}
          >
            重新探测
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-red-600"
            onClick={() => void onDelete(row.provider, row.key_index)}
          >
            删除
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        已解锁模型({row.capabilities.length}):
        {row.capabilities.length === 0 ? (
          <span className="ml-1 italic text-gray-400">无(点"重新探测")</span>
        ) : (
          <span className="ml-1">{row.capabilities.join(', ')}</span>
        )}
      </div>
      {row.last_error && (
        <div className="text-xs text-red-500">最近错误:{row.last_error}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: commit**

```bash
git add src/features/settings/KeyManager/KeyRow.tsx
git commit -m "feat(settings): KeyRow component with badge and capabilities"
```

---

## Task 8: AddKeyForm 组件

**Files:**
- Create: `src/features/settings/KeyManager/AddKeyForm.tsx`

- [ ] **Step 1: 实现 AddKeyForm**

`src/features/settings/KeyManager/AddKeyForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { AddKeyInput } from './useKeyManager'

const BUILT_IN = [
  { value: 'kie', label: 'KIE' },
  { value: 'ppio', label: 'PPIO' },
  { value: 'grsai', label: 'GRSAI' },
  { value: 'fal', label: 'fal.ai' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

interface Props {
  onSubmit: (input: AddKeyInput) => Promise<void>
}

export function AddKeyForm({ onSubmit }: Props) {
  const [mode, setMode] = useState<'builtin' | 'custom'>('builtin')
  const [provider, setProvider] = useState('kie')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function customId(): string {
    return 'custom:' + crypto.randomUUID()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'builtin') {
        await onSubmit({ provider, key: apiKey })
      } else {
        if (!baseUrl) throw new Error('自定义端点需要 Base URL')
        await onSubmit({
          provider: customId(),
          key: apiKey,
          base_url: baseUrl,
          protocol: 'openai-compat',
          display_name: displayName || undefined,
        })
      }
      setApiKey('')
      setBaseUrl('')
      setDisplayName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border p-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === 'builtin'} onChange={() => setMode('builtin')} />
          内置 Provider
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          自定义 OpenAI-compat 端点
        </label>
      </div>

      {mode === 'builtin' ? (
        <label className="flex flex-col gap-1 text-sm">
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border px-2 py-1">
            {BUILT_IN.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Base URL
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            显示名(可选)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Aggregator"
              className="rounded border px-2 py-1"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        API Key
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="rounded border px-2 py-1 font-mono"
          required
          minLength={8}
        />
      </label>

      {error && <div className="text-xs text-red-500">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {submitting ? '添加中...' : '添加'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: commit**

```bash
git add src/features/settings/KeyManager/AddKeyForm.tsx
git commit -m "feat(settings): AddKeyForm with builtin/custom mode toggle"
```

---

## Task 9: KeyManager 容器 + 挂载到 settings 页

**Files:**
- Create: `src/features/settings/KeyManager/KeyManager.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: 实现 KeyManager 容器**

`src/features/settings/KeyManager/KeyManager.tsx`:

```typescript
'use client'

import { AddKeyForm } from './AddKeyForm'
import { KeyRow } from './KeyRow'
import { useKeyManager } from './useKeyManager'

export function KeyManager() {
  const { keys, loading, error, addKey, deleteKey, probe } = useKeyManager()

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-gray-500">
          添加内置 provider key 或自定义 OpenAI-compat 端点。保存后点"重新探测"发现可用模型。
        </p>
      </div>

      <AddKeyForm onSubmit={addKey} />

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">加载失败:{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-gray-500">还没有 key,先添加一个。</div>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((k) => (
            <KeyRow key={k.id} row={k} onProbe={probe} onDelete={deleteKey} />
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: 挂载到 settings 页**

打开 `src/app/(app)/settings/page.tsx`,在合适的位置(现有 "API Keys" 节附近,如没有则在页面主容器尾部)添加:

```typescript
import { KeyManager } from '@/features/settings/KeyManager/KeyManager'
```

并在 render 中插入 `<KeyManager />`(替换旧的 API Keys 占位块)。

> **保留向后兼容:**如果原 settings 页已有自己的 API Keys UI,先读该文件再替换对应 section;否则直接追加。不改动其它节(语言、外观等)。

- [ ] **Step 3: 验证 tsc + 现有测试未回归**

```
npx tsc --noEmit
npx vitest run
```

期望:tsc 0 错误;全部测试 passed(M2 新增 + M1 原有)。

- [ ] **Step 4: commit**

```bash
git add src/features/settings/KeyManager/KeyManager.tsx "src/app/(app)/settings/page.tsx"
git commit -m "feat(settings): mount KeyManager on settings page"
```

---

## Task 10: Exit Criteria 验证

**Files:** 无代码改动

- [ ] **Step 1: 全量 tsc**

```
npx tsc --noEmit
```

期望:0 错误。

- [ ] **Step 2: 全量 vitest**

```
npx vitest run
```

期望:所有测试 passed;M2 新增测试数 ≥ 13(crud 4 + prober 4 + probe route 2 + capabilities 2 + hook 2 = 14)。

- [ ] **Step 3: 构建**

```
npm run build
```

期望:无 error、无 warning,新增路由 `/api/settings/api-keys/[id]/probe`、`/api/settings/capabilities` 出现在路由清单。

- [ ] **Step 4: 手动 smoke test**

1. 启动 dev server:`npm run dev`
2. 登录后访问 `/settings`
3. 添加一个 custom OpenAI-compat key(例如填 OpenRouter 的 base_url 和一个有效 key)
4. 点"重新探测",等待 `/api-keys` 列表刷新
5. 验证该行出现"已解锁模型"清单(非空),状态徽章为"已验证"
6. 再添加一个内置 kie key,点"重新探测"
7. 验证出现 kie 在 `provider-catalog` 中声明的模型

验收标准:用户可手动添加 key 并看到已解锁模型清单,Canvas 既有生成路径未受影响。

- [ ] **Step 5: 打 tag + 开 PR**

```bash
git tag -a smart-routing-m2 -m "M2: BYOK + capability probe"
git push -u origin feat/smart-routing-m2
git push origin smart-routing-m2

gh pr create --base main --head feat/smart-routing-m2 \
  --title "feat(smart-routing): M2 BYOK + capability probe" \
  --body "See docs/superpowers/plans/2026-04-22-m2-byok-capability-probe.md"
```

---

## Self-Review Notes

- **Spec 覆盖:** ✅ `POST /api-keys` 扩字段 (Task 1)、`GET /api-keys` 回显 (Task 2)、prober (Task 3)、`/probe` 路由 (Task 4)、`/capabilities` 路由 (Task 5)、KeyManager UI (Task 6-9)。暂不涉及"后台异步探测任务"——MVP 改为前端点按钮手动 probe,符合 Exit Criteria 的"用户手动添加 key 并看到已解锁模型清单"(spec 第 402 行)。spec 第 8.1 节第 2 点的异步后台模型发现延至 M3,通过 `status='unverified'` + 显式 probe 按钮降级实现。
- **类型一致:** `KeyStatus` 在 `types.ts` 定义后被 prober 和 UI 复用;`AddKeyInput`、`KeyRowData` 在 hook 中定义后被 form/row 复用。
- **依赖关系:** T1→T2(同文件),T3 建新模块,T4/T5 依赖 T3,T6 依赖 T1/T2/T4/T5 的 API shape,T7/T8/T9 依赖 T6 的 hook,T10 收尾。

