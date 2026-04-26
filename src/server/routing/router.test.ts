// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
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
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const supa = {
    from: (table: string) => {
      if (table === 'routing_preferences') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                in: () => Promise.resolve({ data: prefRows, error: null })
              })
            })
          })
        }
      }
      if (table === 'model_call_history') {
        return { insert: insertMock }
      }
      return {}
    },
  }
  return { supa: supa as unknown as SupabaseClient, insertMock }
}

describe('route()', () => {
  beforeEach(() => {
    vi.mocked(findCandidates).mockReset().mockResolvedValue([fakeCandidate])
  })

  it('无候选时返回 NO_CANDIDATES error', async () => {
    vi.mocked(findCandidates).mockResolvedValue([])
    const req: RouteRequest = {
      supabase: makeSupabase().supa,
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
    const { supa, insertMock } = makeSupabase()
    const req: RouteRequest = {
      supabase: supa,
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
    expect(insertMock).toHaveBeenCalledOnce()
    expect(insertMock.mock.calls[0][0]).toMatchObject({ status: 'success' })
  })

  it('首选失败 fallback 到第二候选,返回 toast', async () => {
    const k2: KeyCandidate = { ...fakeCandidate, keyId: 'k2', displayName: 'FAL Key', provider: 'fal' }
    vi.mocked(findCandidates).mockResolvedValue([fakeCandidate, k2])
    const callFn = vi.fn()
      .mockRejectedValueOnce(new Error('k1 failed'))
      .mockResolvedValueOnce({ imageUrl: 'http://fallback-img' })
    const req: RouteRequest = {
      supabase: makeSupabase().supa,
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
      supabase: makeSupabase().supa,
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
    const prefRows = [{ level: 'model', target: 'nano-banana-2', preferred_key_id: 'k1' }]
    const callFn = vi.fn().mockResolvedValue({ imageUrl: 'http://img' })
    const req: RouteRequest = {
      supabase: makeSupabase(prefRows).supa,
      userId: 'u1',
      logicalModelId: 'nano-banana-2',
      scenario: 'image',
      callFn,
    }
    await route(req)
    expect(callFn.mock.calls[0][0].keyId).toBe('k1')
  })
})
