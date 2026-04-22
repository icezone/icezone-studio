import type { AIProvider } from './types'
import { createOpenAICompatProvider } from './providers/openaiCompat'

const providers = new Map<string, AIProvider>()

/** 前缀判定:custom:<uuid> 表示用户自定义 OpenAI-compat 端点 */
const CUSTOM_PROVIDER_PREFIX = 'custom:'

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.id, provider)
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id)
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values())
}

export interface ResolveProviderContext {
  /** custom:<uuid> 时必填;内置 provider 可省略 */
  baseUrl?: string
  /** custom:<uuid> 时必填;内置 provider 从 env / user_api_keys 解析,不经此处 */
  apiKey?: string
}

/**
 * 按 providerId 解析 provider 实例:
 *   - 以 `custom:` 开头 → 动态构造 OpenAI-compat 实例(要求 baseUrl + apiKey)
 *   - 否则 → 查静态注册表(内置 provider)
 *
 * 非 custom 且未注册的 id 返回 undefined(调用方决定如何处理)。
 */
export function resolveProvider(
  providerId: string,
  context: ResolveProviderContext
): AIProvider | undefined {
  if (providerId.startsWith(CUSTOM_PROVIDER_PREFIX)) {
    if (!context.baseUrl) {
      throw new Error(
        `resolveProvider: custom provider "${providerId}" requires baseUrl`
      )
    }
    if (!context.apiKey) {
      throw new Error(
        `resolveProvider: custom provider "${providerId}" requires apiKey`
      )
    }
    return createOpenAICompatProvider({
      id: providerId,
      baseUrl: context.baseUrl,
      apiKey: context.apiKey,
    })
  }

  return providers.get(providerId)
}

/**
 * 仅测试环境使用:重置注册表,保证测试用例互不污染。
 * 生产代码请勿调用。
 */
export function clearProvidersForTest(): void {
  providers.clear()
}
