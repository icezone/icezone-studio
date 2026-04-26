// src/server/routing/scoring.ts
import type { KeyCandidate } from '@/features/routing/application/types'
import type { SupabaseClient } from '@supabase/supabase-js'

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
const MIN_HISTORY = 5
const DEFAULT_LATENCY_MS = 1000
const DEFAULT_COST_CENTS = 1
const MAX_LATENCY_CAP = 10_000

/**
 * 根据 30 天历史计算每个候选 key 的 score,并按降序排列。
 * 纯函数,无 DB 依赖。
 * score = 0.3 * success_rate + 0.2 * latency_norm_inv + 0.5 * cost_norm_inv
 */
export function computeScores(
  candidates: KeyCandidate[],
  history: HistoryRow[],
  _logicalModelId: string  // 预留:未来按 model 差异化默认成本;当前使用固定默认值
): KeyCandidate[] {
  // 单候选:归一化无意义,直接给满分
  if (candidates.length === 1) {
    return [{ ...candidates[0], score: 1.0 }]
  }

  const grouped = new Map<string, HistoryRow[]>()
  for (const row of history) {
    const arr = grouped.get(row.key_id) ?? []
    arr.push(row)
    grouped.set(row.key_id, arr)
  }

  const stats = new Map<string, KeyStats>()
  for (const c of candidates) {
    const rows = grouped.get(c.keyId) ?? []
    if (rows.length < MIN_HISTORY) {
      stats.set(c.keyId, { successRate: 1.0, latencyMs: DEFAULT_LATENCY_MS, costCents: DEFAULT_COST_CENTS })
    } else {
      const total = rows.length
      const successes = rows.filter(r => r.status === 'success').length
      const latencies = rows.map(r => r.latency_ms ?? DEFAULT_LATENCY_MS).sort((a, b) => a - b)
      const medianLatency = latencies[Math.floor(latencies.length / 2)]
      const avgCost = rows.reduce((s, r) => s + (r.cost_estimate_cents ?? DEFAULT_COST_CENTS), 0) / total
      stats.set(c.keyId, { successRate: successes / total, latencyMs: medianLatency, costCents: avgCost })
    }
  }

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
  supabase: SupabaseClient,
  userId: string,
  logicalModelId: string
): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from('model_call_history')
    .select('key_id, status, latency_ms, cost_estimate_cents')
    .eq('user_id', userId)
    .eq('logical_model_id', logicalModelId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return ((data ?? []) as HistoryRow[])
}
