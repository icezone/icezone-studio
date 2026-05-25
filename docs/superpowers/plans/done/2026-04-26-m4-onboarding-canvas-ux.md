# M4 引导与 Canvas UX 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小白用户 3 步完成 API key 配置，Canvas 节点只显示逻辑模型名（不暴露 provider），无 key 时引导去设置页。

**Architecture:** 新增 `LogicalModelPicker` 组件，通过 `useUnlockedModels` hook 从已有的 `/api/settings/capabilities` 获取解锁状态；新增 `OnboardingWizard` 3 步模态框（添加 key → 探测模型 → 设偏好）首次无 key 时弹出；`ImageEditNode` 改为发送 `logicalModelId`，M3 路由引擎选 provider。无需新 Supabase 迁移，引导状态存 localStorage。

**Tech Stack:** React 18, Next.js 15 App Router, Vitest + @testing-library/react (jsdom), Tailwind CSS, Lucide icons

---

## 文件结构

**新增：**
- `src/config/logical-models.ts` — 逻辑模型目录（id、displayName、scenario）
- `src/config/logical-models.test.ts`
- `src/hooks/useUnlockedModels.ts` — 拉取 capabilities API，返回解锁集合 + hasKeys 标志
- `src/hooks/useUnlockedModels.test.ts`
- `src/features/canvas/ui/LogicalModelPicker.tsx` — 平铺逻辑模型列表，🔒 弱化态，点击跳转
- `src/features/canvas/ui/LogicalModelPicker.test.tsx`
- `src/features/onboarding/useOnboardingState.ts` — 读写 localStorage + keyCount 判断
- `src/features/onboarding/useOnboardingState.test.ts`
- `src/features/onboarding/OnboardingWizard.tsx` — 3 步模态框

**修改：**
- `src/features/canvas/nodes/ImageEditNode.tsx` — 增加 `logicalModelId` 数据字段，发起调用时优先用 logicalModelId
- `src/app/(app)/dashboard/page.tsx` — 挂载 OnboardingWizard

---

### Task 1: 逻辑模型目录

**Files:**
- Create: `src/config/logical-models.ts`
- Create: `src/config/logical-models.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/config/logical-models.test.ts
import { describe, it, expect } from 'vitest'
import {
  listLogicalModels,
  getLogicalModel,
  LOGICAL_MODELS,
} from './logical-models'

describe('logical-models', () => {
  it('LOGICAL_MODELS 包含至少 6 个条目', () => {
    expect(LOGICAL_MODELS.length).toBeGreaterThanOrEqual(6)
  })

  it('listLogicalModels() 不传参数返回全部', () => {
    expect(listLogicalModels().length).toBe(LOGICAL_MODELS.length)
  })

  it('listLogicalModels("image") 只返回 image 类型', () => {
    const result = listLogicalModels('image')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((m) => expect(m.scenario).toBe('image'))
  })

  it('listLogicalModels("video") 只返回 video 类型', () => {
    const result = listLogicalModels('video')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((m) => expect(m.scenario).toBe('video'))
  })

  it('getLogicalModel("nano-banana-2") 返回正确条目', () => {
    const m = getLogicalModel('nano-banana-2')
    expect(m).toBeDefined()
    expect(m?.displayName).toBeTruthy()
    expect(m?.scenario).toBe('image')
  })

  it('getLogicalModel("not-exist") 返回 undefined', () => {
    expect(getLogicalModel('not-exist')).toBeUndefined()
  })

  it('每个条目的 id 唯一', () => {
    const ids = LOGICAL_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
rtk npx vitest run src/config/logical-models.test.ts
```

期望：FAIL（模块不存在）

- [ ] **Step 3: 实现逻辑模型目录**

```ts
// src/config/logical-models.ts

export type ModelScenario = 'image' | 'video' | 'text' | 'analysis'

export interface LogicalModelEntry {
  id: string           // 路由引擎使用的 ID，e.g. 'nano-banana-2'
  displayName: string  // 用户看到的名称，e.g. 'Nano Banana 2'
  scenario: ModelScenario
}

export const LOGICAL_MODELS: readonly LogicalModelEntry[] = [
  // 图片模型
  { id: 'nano-banana-2',   displayName: 'Nano Banana 2',   scenario: 'image' },
  { id: 'nano-banana-pro', displayName: 'Nano Banana Pro', scenario: 'image' },
  { id: 'grok-image',      displayName: 'Grok Image',      scenario: 'image' },
  { id: 'gemini-3.1-flash',displayName: 'Gemini 3.1 Flash',scenario: 'image' },
  // 视频模型
  { id: 'kling-3.0',  displayName: 'Kling 3.0',  scenario: 'video' },
  { id: 'sora2-pro',  displayName: 'Sora2 Pro',  scenario: 'video' },
  { id: 'veo-3',      displayName: 'Veo 3',       scenario: 'video' },
]

export function listLogicalModels(scenario?: ModelScenario): LogicalModelEntry[] {
  if (!scenario) return [...LOGICAL_MODELS]
  return LOGICAL_MODELS.filter((m) => m.scenario === scenario)
}

export function getLogicalModel(id: string): LogicalModelEntry | undefined {
  return LOGICAL_MODELS.find((m) => m.id === id)
}

/**
 * 将 logicalModelId 映射到 canvas 内部 provider/model ID（用于参数控件显示）。
 * 优先级：kie > fal > grsai > ppio，取第一个注册过的 canvas 模型。
 */
export function mapToCanvasModelId(
  logicalModelId: string,
  availableCanvasIds: readonly string[],
): string | null {
  const priority = ['kie', 'fal', 'grsai', 'ppio']
  for (const p of priority) {
    const candidate = `${p}/${logicalModelId}`
    if (availableCanvasIds.includes(candidate)) return candidate
  }
  // 部分模型直接是 provider/model 格式 ID，如 ppio/gemini-3.1-flash
  const direct = availableCanvasIds.find((id) => id.endsWith(`/${logicalModelId}`))
  return direct ?? null
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
rtk npx vitest run src/config/logical-models.test.ts
```

期望：所有测试 PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/config/logical-models.ts src/config/logical-models.test.ts
rtk git commit -m "feat(m4): add logical model catalog with scenario grouping"
```

---

### Task 2: useUnlockedModels Hook

**Files:**
- Create: `src/hooks/useUnlockedModels.ts`
- Create: `src/hooks/useUnlockedModels.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/hooks/useUnlockedModels.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUnlockedModels } from './useUnlockedModels'

describe('useUnlockedModels', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始状态 loading=true, unlockedIds 为空集合', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // pending
    const { result } = renderHook(() => useUnlockedModels())
    expect(result.current.loading).toBe(true)
    expect(result.current.unlockedIds.size).toBe(0)
    expect(result.current.hasKeys).toBe(false)
  })

  it('成功拉取后 unlockedIds 包含 all 字段的模型', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ byKey: { 'k1': ['nano-banana-2'] }, all: ['nano-banana-2'] }),
    } as Response)
    const { result } = renderHook(() => useUnlockedModels())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unlockedIds.has('nano-banana-2')).toBe(true)
    expect(result.current.hasKeys).toBe(true)
  })

  it('all 为空时 hasKeys=false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ byKey: {}, all: [] }),
    } as Response)
    const { result } = renderHook(() => useUnlockedModels())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasKeys).toBe(false)
  })

  it('fetch 失败时 loading 变为 false，unlockedIds 为空', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useUnlockedModels())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unlockedIds.size).toBe(0)
  })

  it('401 响应时 hasKeys=false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    } as Response)
    const { result } = renderHook(() => useUnlockedModels())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasKeys).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
rtk npx vitest run src/hooks/useUnlockedModels.test.ts
```

期望：FAIL（模块不存在）

- [ ] **Step 3: 实现 hook**

```ts
// src/hooks/useUnlockedModels.ts
'use client'

import { useEffect, useState } from 'react'

interface CapabilitiesResponse {
  byKey: Record<string, string[]>
  all: string[]
}

export interface UnlockedModelsState {
  unlockedIds: Set<string>
  loading: boolean
  /** 用户是否有至少一个已解锁模型（等价于是否已添加 key 且探测成功） */
  hasKeys: boolean
}

export function useUnlockedModels(): UnlockedModelsState {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/capabilities')
      .then((r) => {
        if (!r.ok) throw new Error(`capabilities ${r.status}`)
        return r.json() as Promise<CapabilitiesResponse>
      })
      .then((data) => {
        if (!cancelled) {
          setUnlockedIds(new Set(data.all))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { unlockedIds, loading, hasKeys: unlockedIds.size > 0 }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
rtk npx vitest run src/hooks/useUnlockedModels.test.ts
```

期望：5 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useUnlockedModels.ts src/hooks/useUnlockedModels.test.ts
rtk git commit -m "feat(m4): add useUnlockedModels hook"
```

---

### Task 3: LogicalModelPicker 组件

**Files:**
- Create: `src/features/canvas/ui/LogicalModelPicker.tsx`
- Create: `src/features/canvas/ui/LogicalModelPicker.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
// src/features/canvas/ui/LogicalModelPicker.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogicalModelPicker } from './LogicalModelPicker'

// mock useUnlockedModels
vi.mock('@/hooks/useUnlockedModels', () => ({
  useUnlockedModels: vi.fn(),
}))
// mock next/navigation
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useUnlockedModels } from '@/hooks/useUnlockedModels'

describe('LogicalModelPicker', () => {
  const onChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loading 时显示骨架文本', () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(),
      loading: true,
      hasKeys: false,
    })
    render(
      <LogicalModelPicker scenario="image" value={null} onChange={onChange} />,
    )
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('显示 image 场景的逻辑模型名称', async () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(['nano-banana-2']),
      loading: false,
      hasKeys: true,
    })
    render(
      <LogicalModelPicker scenario="image" value="nano-banana-2" onChange={onChange} />,
    )
    expect(screen.getByText('Nano Banana 2')).toBeInTheDocument()
  })

  it('未解锁的模型显示 🔒 标记', () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(['nano-banana-2']),
      loading: false,
      hasKeys: true,
    })
    render(
      <LogicalModelPicker scenario="image" value="nano-banana-2" onChange={onChange} />,
    )
    // nano-banana-pro 未解锁，应显示锁图标或文字标记
    expect(screen.getByText('Nano Banana Pro')).toBeInTheDocument()
    const proItem = screen.getByTestId('model-option-nano-banana-pro')
    expect(proItem).toHaveClass('opacity-50')
  })

  it('点击已解锁模型调用 onChange', () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(['nano-banana-2', 'nano-banana-pro']),
      loading: false,
      hasKeys: true,
    })
    render(
      <LogicalModelPicker scenario="image" value="nano-banana-2" onChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('model-option-nano-banana-pro'))
    expect(onChange).toHaveBeenCalledWith('nano-banana-pro')
  })

  it('点击锁定模型跳转到 /settings 而不调用 onChange', () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(['nano-banana-2']),
      loading: false,
      hasKeys: true,
    })
    render(
      <LogicalModelPicker scenario="image" value="nano-banana-2" onChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('model-option-nano-banana-pro'))
    expect(pushMock).toHaveBeenCalledWith('/settings')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('无任何解锁模型时所有条目都显示锁标记', () => {
    vi.mocked(useUnlockedModels).mockReturnValue({
      unlockedIds: new Set(),
      loading: false,
      hasKeys: false,
    })
    render(
      <LogicalModelPicker scenario="image" value={null} onChange={onChange} />,
    )
    // 所有 image 模型都应有 opacity-50
    const items = screen.getAllByTestId(/^model-option-/)
    items.forEach((item) => expect(item).toHaveClass('opacity-50'))
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
rtk npx vitest run src/features/canvas/ui/LogicalModelPicker.test.tsx
```

期望：FAIL（模块不存在）

- [ ] **Step 3: 实现 LogicalModelPicker**

```tsx
// src/features/canvas/ui/LogicalModelPicker.tsx
'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ModelScenario, listLogicalModels } from '@/config/logical-models'
import { useUnlockedModels } from '@/hooks/useUnlockedModels'

interface Props {
  scenario: ModelScenario
  value: string | null
  onChange: (id: string) => void
  className?: string
}

export function LogicalModelPicker({ scenario, value, onChange, className }: Props) {
  const router = useRouter()
  const { unlockedIds, loading } = useUnlockedModels()
  const models = listLogicalModels(scenario)

  if (loading) {
    return (
      <div className={`text-xs text-gray-400 ${className ?? ''}`}>加载中...</div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ''}`}>
      {models.map((m) => {
        const locked = !unlockedIds.has(m.id)
        const selected = m.id === value

        function handleClick() {
          if (locked) {
            router.push('/settings')
          } else {
            onChange(m.id)
          }
        }

        return (
          <button
            key={m.id}
            type="button"
            data-testid={`model-option-${m.id}`}
            onClick={handleClick}
            className={[
              'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
              selected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              locked ? 'opacity-50' : '',
            ].join(' ')}
            title={locked ? '需要配置 API Key — 点击跳转设置' : m.displayName}
          >
            {locked && <Lock size={10} className="shrink-0" />}
            {m.displayName}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
rtk npx vitest run src/features/canvas/ui/LogicalModelPicker.test.tsx
```

期望：5 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/canvas/ui/LogicalModelPicker.tsx src/features/canvas/ui/LogicalModelPicker.test.tsx
rtk git commit -m "feat(m4): add LogicalModelPicker with lock state and settings redirect"
```

---

### Task 4: useOnboardingState Hook

**Files:**
- Create: `src/features/onboarding/useOnboardingState.ts`
- Create: `src/features/onboarding/useOnboardingState.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/features/onboarding/useOnboardingState.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnboardingState, ONBOARDING_STORAGE_KEY } from './useOnboardingState'

describe('useOnboardingState', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('keyCount=0 且未完成引导 → show=true', () => {
    const { result } = renderHook(() => useOnboardingState(0))
    expect(result.current.show).toBe(true)
  })

  it('keyCount>0 → show=false（已有 key，跳过引导）', () => {
    const { result } = renderHook(() => useOnboardingState(3))
    expect(result.current.show).toBe(false)
  })

  it('localStorage 已设置完成标志 → show=false', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    const { result } = renderHook(() => useOnboardingState(0))
    expect(result.current.show).toBe(false)
  })

  it('dismiss() 设置 localStorage 并 show 变为 false', () => {
    const { result } = renderHook(() => useOnboardingState(0))
    expect(result.current.show).toBe(true)
    act(() => result.current.dismiss())
    expect(result.current.show).toBe(false)
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
rtk npx vitest run src/features/onboarding/useOnboardingState.test.ts
```

期望：FAIL（模块不存在）

- [ ] **Step 3: 实现 hook**

```ts
// src/features/onboarding/useOnboardingState.ts
'use client'

import { useState } from 'react'

export const ONBOARDING_STORAGE_KEY = 'smart-routing-onboarded'

export interface OnboardingState {
  show: boolean
  dismiss: () => void
}

export function useOnboardingState(keyCount: number): OnboardingState {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  })

  const show = !dismissed && keyCount === 0

  function dismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    }
    setDismissed(true)
  }

  return { show, dismiss }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
rtk npx vitest run src/features/onboarding/useOnboardingState.test.ts
```

期望：4 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/onboarding/useOnboardingState.ts src/features/onboarding/useOnboardingState.test.ts
rtk git commit -m "feat(m4): add useOnboardingState hook with localStorage persistence"
```

---

### Task 5: OnboardingWizard 组件（3 步模态框）

**Files:**
- Create: `src/features/onboarding/OnboardingWizard.tsx`

> 注意：OnboardingWizard 是纯 UI 组件，无 unit test（交互依赖 KeyManager 等复杂子组件，
> 集成测试在 E2E Task 8 中覆盖）。

步骤设计：
- **Step 1（添加 Key）**：内嵌 `AddKeyForm`，提交成功后自动进入步骤 2
- **Step 2（探测模型）**：显示探测状态或"等待探测"提示，用户点"继续"进入步骤 3（探测在后台进行）
- **Step 3（设偏好）**：内嵌 `ScenarioDefaults`，完成后点"完成配置"

- [ ] **Step 1: 实现 OnboardingWizard**

```tsx
// src/features/onboarding/OnboardingWizard.tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { AddKeyForm } from '@/features/settings/KeyManager/AddKeyForm'
import { ScenarioDefaults } from '@/features/settings/ScenarioDefaults'
import type { AddKeyInput } from '@/features/settings/KeyManager/useKeyManager'

type Step = 1 | 2 | 3

interface Props {
  show: boolean
  onDismiss: () => void
}

const STEP_LABELS: Record<Step, string> = {
  1: '添加 API Key',
  2: '发现可用模型',
  3: '设置使用偏好',
}

export function OnboardingWizard({ show, onDismiss }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [addedKeyId, setAddedKeyId] = useState<string | null>(null)

  if (!show) return null

  async function handleAddKey(input: AddKeyInput) {
    const res = await fetch('/api/settings/api-keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as Record<string, string>).error ?? '添加失败')
    }
    const data = (await res.json()) as { id: string }
    setAddedKeyId(data.id)
    // 后台触发探测，不阻塞用户
    void fetch(`/api/settings/api-keys/${data.id}/probe`, { method: 'POST' })
    setStep(2)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="跳过引导"
        >
          <X size={18} />
        </button>

        {/* 步骤指示器 */}
        <div className="mb-6 flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {s < step ? '✓' : s}
              </div>
              <span
                className={`text-xs ${s === step ? 'font-medium text-gray-800' : 'text-gray-400'}`}
              >
                {STEP_LABELS[s]}
              </span>
              {s < 3 && <div className="h-px w-4 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* 步骤 1：添加 Key */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 text-base font-semibold">添加你的第一个 API Key</h2>
            <p className="mb-4 text-sm text-gray-500">
              支持 KIE、PPIO、FAL、GRSAI 等内置 provider，也可以自定义 OpenAI 兼容端点。
            </p>
            <AddKeyForm onSubmit={handleAddKey} />
          </div>
        )}

        {/* 步骤 2：探测模型 */}
        {step === 2 && (
          <div>
            <h2 className="mb-1 text-base font-semibold">正在发现可用模型</h2>
            <p className="mb-4 text-sm text-gray-500">
              Key 已保存，系统正在后台探测可用模型。这通常只需几秒钟。
              你可以继续，稍后在设置页查看解锁的模型列表。
            </p>
            {addedKeyId && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                ✓ Key 已添加，探测任务已启动
              </div>
            )}
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              继续
            </button>
          </div>
        )}

        {/* 步骤 3：设偏好 */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 text-base font-semibold">设置使用偏好</h2>
            <p className="mb-4 text-sm text-gray-500">
              指定不同场景下优先使用哪种策略：自动最优、最低成本或最快速度。
            </p>
            <ScenarioDefaults />
            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              完成配置
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
rtk npx tsc --noEmit 2>&1 | head -30
```

期望：无与 OnboardingWizard 相关的错误

- [ ] **Step 3: Commit**

```bash
rtk git add src/features/onboarding/OnboardingWizard.tsx
rtk git commit -m "feat(m4): add OnboardingWizard 3-step modal"
```

---

### Task 6: 在 Dashboard 挂载 OnboardingWizard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

背景：Dashboard 已有 `useEffect` 和 `useState`。需要：
1. 在现有 `fetch('/api/projects')` 时，同时拉取 `/api/settings/capabilities`
2. 用 key 数量驱动 `useOnboardingState`
3. 挂载 `<OnboardingWizard />`

- [ ] **Step 1: 读取 Dashboard 当前完整代码**

```bash
cat src/app/\(app\)/dashboard/page.tsx
```

确认当前 import 列表和 state 结构，再做最小改动。

- [ ] **Step 2: 修改 Dashboard**

在现有 `imports` 末尾追加：

```ts
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard'
import { useOnboardingState } from '@/features/onboarding/useOnboardingState'
```

在 `SettingsPage`（`DashboardPage`）组件中，在现有 state 声明后追加：

```ts
const [keyCount, setKeyCount] = useState(0)
```

在现有的 `useEffect`（拉 projects 的那个）内部，并行拉取 capabilities：

```ts
// 并行拉取 projects 和 key 数量
const [projectsRes, capRes] = await Promise.all([
  fetch('/api/projects'),
  fetch('/api/settings/capabilities').catch(() => null),
])
// ... 现有 projects 处理逻辑 ...
if (capRes?.ok) {
  const cap = (await capRes.json()) as { all: string[] }
  setKeyCount(cap.all.length > 0 ? 1 : 0)
}
```

> 注意：不要打破现有 projects fetch 逻辑，仅在其后添加 capabilities 处理。

在 `useEffect` 同级，添加 onboarding state：

```ts
const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboardingState(keyCount)
```

在 JSX return 的最外层 `<div>` 内最开始，添加（在 `<h1>` 之前）：

```tsx
<OnboardingWizard show={showOnboarding} onDismiss={dismissOnboarding} />
```

- [ ] **Step 3: TypeScript 检查**

```bash
rtk npx tsc --noEmit 2>&1 | head -30
```

期望：0 错误

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/\(app\)/dashboard/page.tsx
rtk git commit -m "feat(m4): mount OnboardingWizard on dashboard for first-time users"
```

---

### Task 7: ImageEditNode 集成 LogicalModelPicker

**Files:**
- Modify: `src/features/canvas/nodes/ImageEditNode.tsx`

目标：
1. 在现有 `ModelParamsControls` 上方添加一行 `LogicalModelPicker`（保留参数控件）
2. 节点 data 新增可选字段 `logicalModelId?: string`
3. `handleGenerate` 时，若存在 `data.logicalModelId`，在 API body 中包含 `logicalModelId`（M3 路由生效）
4. `LogicalModelPicker` 选中时，更新 `data.logicalModelId` 并自动将 `data.model` 映射到对应的 canvas 模型（保持参数控件正常显示）

- [ ] **Step 1: 读取 ImageEditNode generate 调用部分**

```bash
grep -n 'handleGenerate\|fetch.*generate\|modelId\|logicalModelId\|body.*JSON' src/features/canvas/nodes/ImageEditNode.tsx | head -30
```

记录 API 调用的位置（行号）和当前 body 结构。

- [ ] **Step 2: 修改 ImageEditNode**

在文件顶部 imports 后追加：

```ts
import { LogicalModelPicker } from '@/features/canvas/ui/LogicalModelPicker'
import { mapToCanvasModelId, listLogicalModels } from '@/config/logical-models'
```

在组件内 `imageModels` useMemo 后追加：

```ts
// 逻辑模型 ID 列表（用于 mapToCanvasModelId）
const allCanvasModelIds = useMemo(
  () => imageModels.map((m) => m.id),
  [imageModels],
)

// 处理逻辑模型选择：更新 logicalModelId + 同步 data.model 到 canvas 模型 ID
function handleLogicalModelChange(logicalModelId: string) {
  const canvasModelId = mapToCanvasModelId(logicalModelId, allCanvasModelIds)
  updateNodeData(id, {
    logicalModelId,
    ...(canvasModelId ? { model: canvasModelId } : {}),
  })
}
```

在 `handleGenerate`（或对应的 API fetch body 构造处）修改：将现有 body 中加入 `logicalModelId`：

```ts
// 原有 body（保持原有字段不变）：
const body = {
  modelId: selectedModel.id,
  prompt,
  // ... 其他现有字段
}
// M4 新增：若有 logicalModelId，路由引擎优先使用
if (data.logicalModelId) {
  Object.assign(body, { logicalModelId: data.logicalModelId })
}
```

在 `ModelParamsControls` 组件上方（即该组件的 JSX 前一行），插入：

```tsx
<LogicalModelPicker
  scenario="image"
  value={data.logicalModelId ?? null}
  onChange={handleLogicalModelChange}
  className="mb-2"
/>
```

- [ ] **Step 3: TypeScript 检查 + 单元测试**

```bash
rtk npx tsc --noEmit 2>&1 | head -30
rtk npx vitest run src/features/canvas 2>&1 | tail -20
```

期望：0 TypeScript 错误，现有 canvas 测试 PASS

- [ ] **Step 4: Commit**

```bash
rtk git add src/features/canvas/nodes/ImageEditNode.tsx
rtk git commit -m "feat(m4): integrate LogicalModelPicker into ImageEditNode, send logicalModelId to routing engine"
```

---

### Task 8: 全量验证 + E2E 测试补充

**Files:**
- Modify: `__tests__/e2e/wave0-features.spec.ts`（在 Wave 1 describe 块末尾追加）

- [ ] **Step 1: 运行全量单元测试**

```bash
rtk npx vitest run
```

期望：全部 PASS（任何失败都需要先修复）

- [ ] **Step 2: TypeScript 全量检查**

```bash
rtk npx tsc --noEmit
```

期望：0 错误

- [ ] **Step 3: Lint 检查**

```bash
rtk npm run lint
```

期望：0 错误

- [ ] **Step 4: 追加 E2E 测试**

在 `__tests__/e2e/wave0-features.spec.ts` 末尾追加新的 describe 块：

```ts
test.describe('Wave M4: Onboarding & Canvas UX', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('M4-N1: LogicalModelPicker - Image 节点显示逻辑模型名', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)
      // ImageEdit 节点
      const imageEditOption = page.locator('text=图片生成, text=图片编辑').first()
      await expect(imageEditOption).toBeVisible({ timeout: 5000 })
      await imageEditOption.click()

      // 验证节点存在
      const node = page.locator('[data-testid="node-imageEdit"], [data-testid="node-upload"]').first()
      await expect(node).toBeVisible({ timeout: 5000 })

      // 验证逻辑模型名出现（不应显示 "kie/" 前缀）
      const modelPicker = page.locator('[data-testid^="model-option-"]').first()
      await expect(modelPicker).toBeVisible({ timeout: 5000 })
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('M4-N2: Dashboard - OnboardingWizard 可被跳过', async ({ page }) => {
    // 清除 localStorage 引导完成标志以触发向导
    await page.goto('/dashboard')
    await page.evaluate(() => localStorage.removeItem('smart-routing-onboarded'))
    await page.reload()

    // 如果用户有 keys，向导不显示 — 测试跳过
    const wizard = page.locator('text=添加你的第一个 API Key')
    const hasWizard = await wizard.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasWizard) {
      console.log('用户已有 keys，跳过向导测试（符合预期）')
      return
    }

    // 向导可被关闭
    const closeBtn = page.locator('button[aria-label="跳过引导"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(wizard).not.toBeVisible({ timeout: 3000 })
  })
})
```

- [ ] **Step 5: 运行 build 验证**

```bash
rtk npm run build 2>&1 | tail -10
```

期望：Build 成功，无 error

- [ ] **Step 6: Commit**

```bash
rtk git add __tests__/e2e/wave0-features.spec.ts
rtk git commit -m "test(m4): add E2E tests for LogicalModelPicker and OnboardingWizard"
```

- [ ] **Step 7: Push 并创建 PR**

```bash
rtk git push --set-upstream origin feat/smart-routing-m4
rtk gh pr create \
  --title "feat(smart-routing): M4 引导 + Canvas UX — 逻辑模型选择器 + Onboarding Wizard" \
  --body "## Summary
- 新增逻辑模型目录 \`src/config/logical-models.ts\`（7 个模型，image/video）
- 新增 \`useUnlockedModels\` hook，读取 \`/api/settings/capabilities\` 解锁集合
- 新增 \`LogicalModelPicker\` 组件：展示逻辑模型名、🔒 弱化锁定态、点击跳转 /settings
- 新增 \`OnboardingWizard\` 3 步模态框：添加 key → 探测模型 → 设偏好
- Dashboard 首次无 key 时自动弹出引导（localStorage 记录完成状态）
- \`ImageEditNode\` 集成 \`LogicalModelPicker\`，API 调用携带 \`logicalModelId\` 走 M3 路由引擎

## M4 Exit Criteria
- [x] 小白用户 3 步完成配置（Onboarding Wizard）
- [x] Canvas 符合「只显示模型」（LogicalModelPicker 显示逻辑模型名，无 provider 前缀）
- [x] 无可用 key 时点击模型跳转到 /settings
- [x] TypeScript 0 error, Lint 0 error, 全量单元测试 PASS

## Test plan
- [ ] \`rtk npx vitest run\` 全量 PASS
- [ ] \`rtk npx tsc --noEmit\` 0 错误
- [ ] E2E M4-N1, M4-N2 测试通过

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## M4 Exit Criteria 检查清单

| 标准 | 验证方式 |
|------|----------|
| 小白用户 3 步完成配置 | OnboardingWizard: AddKey → ProbeResult → ScenarioDefaults |
| Canvas 符合"只显示模型" | LogicalModelPicker 展示逻辑名（无 kie/fal 前缀） |
| 无 key 时 🔒 弱化 + 点击跳转 | LogicalModelPicker locked 状态 + router.push('/settings') |
| ImageEditNode 通过路由引擎调用 | body 含 logicalModelId → M3 route() 选优 |
| TypeScript 0 error | `tsc --noEmit` |
| 全量测试 PASS | `vitest run` |
