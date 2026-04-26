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
  it('数据不足时使用默认值 success_rate=1.0', () => {
    const candidates = [baseCandidate('k1')]
    const scored = computeScores(candidates, [], 'nano-banana-2')
    expect(scored[0].score).toBeGreaterThan(0)
  })

  it('多候选:高成功率 > 低成功率 时 score 更高', () => {
    const candidates = [baseCandidate('k1'), baseCandidate('k2')]
    const history = [
      ...Array(5).fill({ key_id: 'k1', status: 'success', latency_ms: 500, cost_estimate_cents: 4 }),
      ...Array(5).fill({ key_id: 'k2', status: 'failed', latency_ms: 500, cost_estimate_cents: 4 }),
    ]
    const scored = computeScores(candidates, history, 'nano-banana-2')
    const k1 = scored.find(c => c.keyId === 'k1')!
    const k2 = scored.find(c => c.keyId === 'k2')!
    expect(k1.score).toBeGreaterThan(k2.score)
  })

  it('低延迟 key score 高于高延迟 key', () => {
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

  it('低成本 key score 高于高成本 key(0.5 权重)', () => {
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

  it('单候选时 score 为 1.0', () => {
    const candidates = [baseCandidate('only')]
    const history = Array(5).fill({ key_id: 'only', status: 'success', latency_ms: 500, cost_estimate_cents: 4 })
    const scored = computeScores(candidates, history, 'nano-banana-2')
    expect(scored[0].score).toBe(1.0)
  })
})
