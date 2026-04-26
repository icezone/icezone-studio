// src/features/routing/application/types.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type Scenario = 'text' | 'image' | 'video' | 'analysis' | 'edit'
export type CallStatus = 'success' | 'failed' | 'timeout'

/** 候选 key:能服务目标 logical model 且处于可用状态 */
export interface KeyCandidate {
  keyId: string
  provider: string                     // e.g. 'kie' | 'custom:uuid'
  displayName: string | null
  status: 'active' | 'unverified'
  baseUrl: string | null               // custom OpenAI-compat 端点
  protocol: 'native' | 'openai-compat'
  encryptedKey: string
  iv: string
  score: number                        // scoring 后填入,初始 0
}

/** router 路由请求 */
export interface RouteRequest<T = unknown> {
  /** M3 直接依赖 SupabaseClient;M4 可提取 IKeyRepository port */
  supabase: SupabaseClient
  userId: string
  logicalModelId: string               // e.g. 'nano-banana-2'
  scenario: Scenario
  /** 调用方提供的实际 AI 调用函数;router 传入选中的候选 key */
  callFn: (candidate: KeyCandidate, decryptedApiKey: string) => Promise<T>
}

/** router 路由成功结果 */
export interface RouteDecision<T = unknown> {
  result: T
  keyId: string
  provider: string
  toast?: FallbackToastPayload         // 仅在发生 fallback 时存在
}

/** 单次 fallback 尝试记录 */
export interface FallbackAttempt {
  keyId: string
  displayName: string | null
  status: Exclude<CallStatus, 'timeout'>   // fallback 不产生 timeout 状态
  latencyMs?: number
  errorCode?: string
}

/** 成功但经过 fallback — 通知前端显示 Toast */
export interface FallbackToastPayload {
  message: string                      // "已切换至 <displayName> 完成请求"
  fallbackChain: FallbackAttempt[]
}

/** 全部候选失败 */
export interface RoutingError {
  code: 'ALL_CANDIDATES_FAILED' | 'NO_CANDIDATES'
  fallbackAttempts: FallbackAttempt[]
  suggestion: string
}

export function isRoutingError(v: unknown): v is RoutingError {
  return typeof v === 'object' && v !== null && 'code' in v
}

/** 写入 model_call_history 的载体 */
export interface CallHistoryEntry {
  userId: string
  keyId: string
  logicalModelId: string
  scenario: Scenario
  status: CallStatus
  latencyMs?: number
  errorCode?: string
  costEstimateCents?: number
}
