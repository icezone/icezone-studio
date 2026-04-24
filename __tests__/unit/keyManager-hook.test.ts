import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeyManager } from '@/features/settings/KeyManager/useKeyManager'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  // 清理 stubbed fetch，防止泄漏到后续测试
  vi.unstubAllGlobals()
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
