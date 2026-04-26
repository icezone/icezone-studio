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
    expect(result.current.error).toBeInstanceOf(Error)
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
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
