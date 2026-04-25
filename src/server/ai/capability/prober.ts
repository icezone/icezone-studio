import type { SupabaseClient } from '@supabase/supabase-js'
import { listOpenAICompatModels } from '@/server/ai/providers/openaiCompat'
import { getProviderCapabilities } from '@/config/provider-catalog'
import { decryptApiKey } from '@/server/ai/keyFetcher'
import type { CapabilityEntry, KeyStatus, ProbeResult } from './types'

const CUSTOM_PREFIX = 'custom:'

/**
 * 把 ProbeResult 置为 invalid 状态的内部辅助。
 */
function buildInvalid(keyId: string, error: string, probedAt: string): ProbeResult {
  return {
    keyId,
    status: 'invalid',
    capabilities: [],
    error,
    probedAt,
  }
}

/**
 * 对单个 user_api_keys 行进行能力探测。
 *  - custom:<uuid>:调用 /v1/models,raw id → probed capabilities
 *  - 内置 provider:从 provider-catalog 读已知能力表,source='catalog'
 *
 * 成功写 user_key_capabilities(先清后插)并把 user_api_keys.status 置为 active;
 * 失败时 status 置为 invalid,记录 last_error。所有 DB 调用的 error 字段都会被检查并传播。
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

  // key 不存在或查询报错,直接返回 invalid,不写任何表
  if (fetchError || !row) {
    return buildInvalid(keyId, fetchError?.message ?? 'key not found', now)
  }

  let status: KeyStatus = 'active'
  let capabilities: CapabilityEntry[] = []
  let errorMessage: string | undefined

  try {
    if (typeof row.provider === 'string' && row.provider.startsWith(CUSTOM_PREFIX)) {
      // custom provider:通过 /v1/models 接口探测实际模型列表
      if (!row.base_url) throw new Error('custom provider missing base_url')
      // 解密前字段守卫:缺 encrypted_key/iv 直接 invalid,避免传空串给 AES-CBC
      if (!row.encrypted_key) throw new Error('missing encrypted_key for custom provider')
      if (!row.iv) throw new Error('missing iv for custom provider')
      const apiKey = decryptApiKey(row.encrypted_key, row.iv)
      const ids = await listOpenAICompatModels(row.base_url, apiKey)
      capabilities = ids.map((id) => ({ logical_model_id: id, source: 'probed' as const }))
    } else {
      // 内置 provider:从 catalog 读取已知能力表
      const catalog = getProviderCapabilities(row.provider)
      capabilities = catalog.map((id) => ({ logical_model_id: id, source: 'catalog' as const }))
    }
  } catch (e) {
    status = 'invalid'
    errorMessage = e instanceof Error ? e.message : String(e)
  }

  // M2 暂不处理并发 probe;并发保证后续在 M3 通过 DB 约束或 advisory lock 收紧。
  // (migration 015 的 user_key_capabilities.UNIQUE(key_id, logical_model_id) 可用于 upsert,M3 再切。)
  const deleteResult = await supabase
    .from('user_key_capabilities')
    .delete()
    .eq('key_id', keyId)
  if (deleteResult.error) {
    // delete 失败 → 不继续 insert,尝试把 key 标 invalid 后返回
    const deleteMsg = deleteResult.error.message
    await supabase
      .from('user_api_keys')
      .update({
        status: 'invalid',
        last_error: deleteMsg,
        last_verified_at: now,
      })
      .eq('id', keyId)
      .eq('user_id', userId)
    return buildInvalid(keyId, deleteMsg, now)
  }

  if (status === 'active' && capabilities.length > 0) {
    const insertResult = await supabase.from('user_key_capabilities').insert(
      capabilities.map((c) => ({
        key_id: keyId,
        logical_model_id: c.logical_model_id,
        source: c.source,
      }))
    )
    if (insertResult.error) {
      // insert 失败 → 旧数据已被 delete,需要把 key 置 invalid 并回写
      status = 'invalid'
      errorMessage = insertResult.error.message
      capabilities = []
    }
  }

  // 更新 key 状态与最后探测时间
  const updateResult = await supabase
    .from('user_api_keys')
    .update({
      status,
      last_error: status === 'active' ? null : errorMessage ?? null,
      last_verified_at: now,
    })
    .eq('id', keyId)
    .eq('user_id', userId)

  // update 失败:仍返回内存计算的 result,但把 update 错误信息追加到 error 中
  if (updateResult.error) {
    const suffix = `failed to persist key status: ${updateResult.error.message}`
    errorMessage = errorMessage ? `${errorMessage}; ${suffix}` : suffix
  }

  return { keyId, status, capabilities, error: errorMessage, probedAt: now }
}
