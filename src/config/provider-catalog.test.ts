import { describe, expect, it } from 'vitest';
import {
  PROVIDER_CATALOG,
  getProviderCapabilities,
  listProvidersForModel,
} from './provider-catalog';

describe('provider-catalog', () => {
  it('应该为已知 provider 返回逻辑模型清单', () => {
    const caps = getProviderCapabilities('kie');
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('应该为未知 provider 返回空数组', () => {
    expect(getProviderCapabilities('unknown-xyz')).toEqual([]);
  });

  it('listProvidersForModel 应该反查所有支持该模型的 provider', () => {
    const providers = listProvidersForModel('nano-banana-2');
    expect(providers).toEqual(expect.arrayContaining(['kie', 'fal', 'grsai']));
  });

  it('反查未知模型返回空数组', () => {
    expect(listProvidersForModel('nothing-here')).toEqual([]);
  });

  it('PROVIDER_CATALOG 所有条目结构合法', () => {
    for (const [providerId, entry] of Object.entries(PROVIDER_CATALOG)) {
      expect(typeof providerId).toBe('string');
      expect(Array.isArray(entry.logicalModels)).toBe(true);
      expect(['native', 'openai-compat']).toContain(entry.protocol);
    }
  });
});
