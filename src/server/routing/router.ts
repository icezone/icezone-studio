// src/server/routing/router.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { findCandidates } from './candidates'
import { computeScores, fetchHistory } from './scoring'
import { decryptApiKey } from '@/server/ai/keyFetcher'
import type {
  RouteRequest, RouteDecision, RoutingError,
  KeyCandidate, FallbackAttempt, CallHistoryEntry, Scenario,
} from '@/features/routing/application/types'

/** 主路由入口:三层偏好 → retry chain → 写历史 → 返回结果 */
export async function route<T = unknown>(req: RouteRequest<T>): Promise<RouteDecision<T> | RoutingError> {
  const { supabase, userId, logicalModelId, scenario, callFn } = req

  const candidates = await findCandidates(supabase, userId, logicalModelId)
  if (candidates.length === 0) {
    return {
      code: 'NO_CANDIDATES',
      fallbackAttempts: [],
      suggestion: '请先在 Settings 添加并探测 API key,或为该模型添加新的 provider',
    }
  }

  const history = await fetchHistory(supabase, userId, logicalModelId)
  const scored = computeScores(candidates, history, logicalModelId)
  const ordered = await applyPreferences(supabase, userId, logicalModelId, scenario, scored)

  const attempts: FallbackAttempt[] = []
  for (const candidate of ordered) {
    let decryptedKey: string
    try {
      decryptedKey = decryptApiKey(candidate.encryptedKey, candidate.iv)
    } catch {
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'failed', errorCode: 'DECRYPT_FAILED' })
      continue
    }

    const start = Date.now()
    try {
      const result = await callFn(candidate, decryptedKey)
      const latencyMs = Date.now() - start
      await writeHistory(supabase, { userId, keyId: candidate.keyId, logicalModelId, scenario, status: 'success', latencyMs })
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'success', latencyMs })

      const toast = attempts.length > 1 ? {
        message: `已切换至 ${candidate.displayName ?? candidate.provider} 完成请求`,
        fallbackChain: attempts,
      } : undefined
      return { result, keyId: candidate.keyId, provider: candidate.provider, toast }
    } catch (err) {
      const latencyMs = Date.now() - start
      const errorCode = err instanceof Error ? err.message.slice(0, 100) : 'unknown'
      await writeHistory(supabase, { userId, keyId: candidate.keyId, logicalModelId, scenario, status: 'failed', latencyMs, errorCode })
      attempts.push({ keyId: candidate.keyId, displayName: candidate.displayName, status: 'failed', latencyMs, errorCode })
    }
  }

  return {
    code: 'ALL_CANDIDATES_FAILED',
    fallbackAttempts: attempts,
    suggestion: '请检查 API key 余额或在 Settings 添加新的 provider',
  }
}

/** 三层偏好解析:model 级 > scenario 级 > 按 score 排序 */
async function applyPreferences(
  supabase: SupabaseClient,
  userId: string,
  logicalModelId: string,
  scenario: Scenario,
  scored: KeyCandidate[]
): Promise<KeyCandidate[]> {
  const { data } = await supabase
    .from('routing_preferences')
    .select('level, target, preferred_key_id')
    .eq('user_id', userId)
    .in('level', ['model', 'scenario'])
    .in('target', [logicalModelId, scenario])

  if (!data || data.length === 0) return scored

  // 过滤出合法的偏好行,防止 schema 变化产生 undefined key
  const validPrefs = (data as Array<Record<string, unknown>>).filter(
    p => typeof p['level'] === 'string' && typeof p['target'] === 'string' && p['preferred_key_id']
  )

  const prefMap = new Map<string, string>(
    validPrefs.map(p => [
      `${p['level']}:${p['target']}`,
      p['preferred_key_id'] as string,
    ])
  )

  const preferredKeyId =
    prefMap.get(`model:${logicalModelId}`) ??
    prefMap.get(`scenario:${scenario}`)

  if (!preferredKeyId) return scored

  const idx = scored.findIndex(c => c.keyId === preferredKeyId)
  if (idx <= 0) return scored

  const copy = [...scored]
  const [preferred] = copy.splice(idx, 1)
  copy.unshift(preferred)
  return copy
}

/** 写入 model_call_history */
async function writeHistory(
  supabase: SupabaseClient,
  entry: CallHistoryEntry
): Promise<void> {
  const { error } = await supabase.from('model_call_history').insert({
    user_id: entry.userId,
    key_id: entry.keyId,
    logical_model_id: entry.logicalModelId,
    scenario: entry.scenario,
    status: entry.status,
    latency_ms: entry.latencyMs ?? null,
    error_code: entry.errorCode ?? null,
    cost_estimate_cents: entry.costEstimateCents ?? null,
  })
  if (error) console.error('[writeHistory] insert failed:', error.message)
  // 不中断主流程,历史写入失败不应影响用户请求
}
