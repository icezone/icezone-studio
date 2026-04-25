/** key 的连通性状态流转,与 migration 015 中 user_api_keys.status 保持一致 */
export type KeyStatus = 'unverified' | 'active' | 'invalid' | 'rate_limited' | 'exhausted'

export interface CapabilityEntry {
  logical_model_id: string
  source: 'probed' | 'catalog'
}

export interface ProbeResult {
  keyId: string
  status: KeyStatus
  capabilities: CapabilityEntry[]
  /** 探测过程中若失败,记录原因 */
  error?: string
  probedAt: string
}
