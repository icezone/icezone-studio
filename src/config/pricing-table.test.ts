import { describe, expect, it } from 'vitest';
import {
  PRICING_TABLE,
  getModelPriceCents,
  type PriceEntry,
} from './pricing-table';

describe('pricing-table', () => {
  it('应该为已知逻辑模型返回非负整数 cents', () => {
    expect(getModelPriceCents('nano-banana-pro')).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(getModelPriceCents('nano-banana-pro'))).toBe(true);
  });

  it('应该为未知逻辑模型返回默认值 0', () => {
    expect(getModelPriceCents('unknown-model-xyz')).toBe(0);
  });

  it('PRICING_TABLE 每个条目结构正确', () => {
    for (const [modelId, entry] of Object.entries(PRICING_TABLE)) {
      expect(typeof modelId).toBe('string');
      expect(modelId.length).toBeGreaterThan(0);
      const typed = entry as PriceEntry;
      expect(typed.priceCents).toBeGreaterThanOrEqual(0);
      expect(['image', 'video', 'text', 'analysis']).toContain(typed.scenario);
    }
  });

  it('应该包含至少一个图片模型和一个视频模型', () => {
    const scenarios = Object.values(PRICING_TABLE).map((e) => e.scenario);
    expect(scenarios).toContain('image');
    expect(scenarios).toContain('video');
  });
});
