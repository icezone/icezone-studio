import type { SupabaseClient } from '@supabase/supabase-js'
import { listOpenAICompatModels } from '@/server/ai/providers/openaiCompat'
import { getProviderCapabilities } from '@/config/provider-catalog'
import { decryptKeyForTesting } from '@/server/ai/keyFetcher'
import type { CapabilityEntry, KeyStatus, ProbeResult } from './types'

const CUSTOM_PREFIX = 'custom:'

/**
 * 对单个 user_api_keys 行进行能力探测。
 *  - custom:<uuid>:调用 /v1/models,raw id → probed capabilities
 *  - 内置 provider:从 provider-catalog 读已知能力表,source='catalog'
 *
 * 成功写 user_key_capabilities(先清后插)并把 user_api_keys.status 置为 active;
 * 失败时 status 置为 invalid,记录 last_error。
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

  // key 不存在或查询报错,直接返回 invalid
  if (fetchError || !row) {
    return {
      keyId,
      status: 'invalid',
      capabilities: [],
      error: fetchError?.message ?? 'key not found',
      probedAt: now,
    }
  }

  let status: KeyStatus = 'active'
  let capabilities: CapabilityEntry[] = []
  let errorMessage: string | undefined

  try {
    if (typeof row.provider === 'string' && row.provider.startsWith(CUSTOM_PREFIX)) {
      // custom provider:通过 /v1/models 接口探测实际模型列表
      if (!row.base_url) throw new Error('custom provider missing base_url')
      const apiKey = decryptKeyForTesting(row.encrypted_key, row.iv)
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

  // 先清旧能力,再插新能力,保证不残留历史数据
  await supabase.from('user_key_capabilities').delete().eq('key_id', keyId)
  if (capabilities.length > 0) {
    await supabase.from('user_key_capabilities').insert(
      capabilities.map((c) => ({
        key_id: keyId,
        logical_model_id: c.logical_model_id,
        source: c.source,
      }))
    )
  }

  // 更新 key 状态与最后探测时间
  await supabase
    .from('user_api_keys')
    .update({
      status,
      last_error: status === 'active' ? null : errorMessage ?? null,
      last_verified_at: now,
    })
    .eq('id', keyId)
    .eq('user_id', userId)

  return { keyId, status, capabilities, error: errorMessage, probedAt: now }
}
