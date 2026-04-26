// src/server/routing/candidates.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeyCandidate } from '@/features/routing/application/types'

/**
 * 查询能服务指定 logical model 且状态可用的 key 列表。
 * 联表 user_key_capabilities + user_api_keys。
 */
export async function findCandidates(
  supabase: SupabaseClient,
  userId: string,
  logicalModelId: string
): Promise<KeyCandidate[]> {
  const { data, error } = await supabase
    .from('user_key_capabilities')
    .select(
      `logical_model_id,
       key_id,
       user_api_keys!inner(
         id, provider, display_name, status,
         base_url, protocol, encrypted_key, iv, user_id
       )`
    )
    .eq('logical_model_id', logicalModelId)
    .eq('user_api_keys.user_id', userId)
    .in('user_api_keys.status', ['active', 'unverified'])

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const k = row['user_api_keys'] as Record<string, unknown>
    return {
      keyId: row['key_id'] as string,
      provider: k['provider'] as string,
      displayName: (k['display_name'] as string | null) ?? null,
      status: k['status'] as 'active' | 'unverified',
      baseUrl: (k['base_url'] as string | null) ?? null,
      protocol: k['protocol'] as 'native' | 'openai-compat',
      encryptedKey: k['encrypted_key'] as string,
      iv: k['iv'] as string,
      score: 0,
    }
  })
}
