/**
 * 内置 Provider Capability Catalog
 *
 * 声明每个内置 provider(如 kie、fal、grsai、kling、ppio、veo、sora2)
 * 可服务的逻辑模型清单。自定义 OpenAI-compat 端点不在此表中,由动态
 * 能力探测(M2)通过 /v1/models 发现。
 *
 * 维护:新增 provider × logical_model binding 时同步更新。
 */

export type ProviderProtocol = 'native' | 'openai-compat';

export interface ProviderCatalogEntry {
  protocol: ProviderProtocol;
  logicalModels: readonly string[];
}

export const PROVIDER_CATALOG: Readonly<Record<string, ProviderCatalogEntry>> = {
  kie: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro', 'grok-image'],
  },
  fal: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro'],
  },
  grsai: {
    protocol: 'native',
    logicalModels: ['nano-banana-2', 'nano-banana-pro'],
  },
  ppio: {
    protocol: 'native',
    logicalModels: ['gemini-3.1-flash'],
  },
  kling: {
    protocol: 'native',
    logicalModels: ['kling-3.0'],
  },
  sora2: {
    protocol: 'native',
    logicalModels: ['sora2-pro'],
  },
  veo: {
    protocol: 'native',
    logicalModels: ['veo-3'],
  },
};

export function getProviderCapabilities(providerId: string): readonly string[] {
  return PROVIDER_CATALOG[providerId]?.logicalModels ?? [];
}

export function listProvidersForModel(logicalModelId: string): string[] {
  const result: string[] = [];
  for (const [providerId, entry] of Object.entries(PROVIDER_CATALOG)) {
    if (entry.logicalModels.includes(logicalModelId)) {
      result.push(providerId);
    }
  }
  return result;
}
