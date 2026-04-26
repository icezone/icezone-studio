// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KeyCandidate } from '@/features/routing/application/types'

const mock = vi.hoisted(() => ({
  rows: [
    {
      key_id: 'k1',
      user_api_keys: {
        provider: 'kie',
        display_name: 'My KIE',
        status: 'active',
        base_url: null,
        protocol: 'native',
        encrypted_key: 'enc',
        iv: 'iv1',
        user_id: 'user-1',
      },
    },
    {
      key_id: 'k2',
      user_api_keys: {
        provider: 'fal',
        display_name: null,
        status: 'unverified',
        base_url: null,
        protocol: 'native',
        encrypted_key: 'enc2',
        iv: 'iv2',
        user_id: 'user-1',
      },
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
    const result = await findCandidates(supa as unknown as import('@supabase/supabase-js').SupabaseClient, 'user-1', 'nano-banana-2')
    expect(result).toHaveLength(2)
    expect(result[0].keyId).toBe('k1')
    expect(result[0].provider).toBe('kie')
    expect(result[0].score).toBe(0)
  })

  it('DB 返回 error 时抛异常', async () => {
    const supa = makeSupabase([], { message: 'DB error' })
    await expect(findCandidates(supa as unknown as import('@supabase/supabase-js').SupabaseClient, 'user-1', 'nano-banana-2'))
      .rejects.toThrow('DB error')
  })

  it('无可用 key 时返回空数组', async () => {
    const supa = makeSupabase([])
    const result = await findCandidates(supa as unknown as import('@supabase/supabase-js').SupabaseClient, 'user-1', 'veo-3')
    expect(result).toHaveLength(0)
  })
})
