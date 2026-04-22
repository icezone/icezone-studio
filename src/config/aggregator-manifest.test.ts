import { describe, expect, it } from 'vitest';
import {
  FALLBACK_AGGREGATOR_MANIFEST,
  listRecommendedAggregators,
  getAggregatorById,
  type AggregatorDescriptor,
} from './aggregator-manifest';

describe('aggregator-manifest', () => {
  it('fallback manifest 包含 version 与非空 aggregators 数组', () => {
    expect(FALLBACK_AGGREGATOR_MANIFEST.version).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(Array.isArray(FALLBACK_AGGREGATOR_MANIFEST.aggregators)).toBe(true);
    expect(FALLBACK_AGGREGATOR_MANIFEST.aggregators.length).toBeGreaterThan(0);
  });

  it('每个 aggregator 条目字段完整', () => {
    for (const agg of FALLBACK_AGGREGATOR_MANIFEST.aggregators) {
      const a = agg as AggregatorDescriptor;
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(['native', 'openai-compat']).toContain(a.protocol);
      expect(Array.isArray(a.categories)).toBe(true);
      expect(typeof a.recommended).toBe('boolean');
    }
  });

  it('listRecommendedAggregators 只返回 recommended=true 的条目', () => {
    const recs = listRecommendedAggregators();
    expect(recs.every((a) => a.recommended)).toBe(true);
  });

  it('getAggregatorById 能根据 id 查到已知条目', () => {
    const first = FALLBACK_AGGREGATOR_MANIFEST.aggregators[0];
    expect(getAggregatorById(first.id)?.id).toBe(first.id);
  });

  it('getAggregatorById 对未知 id 返回 undefined', () => {
    expect(getAggregatorById('no-such-aggregator')).toBeUndefined();
  });
});
