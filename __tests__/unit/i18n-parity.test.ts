import { describe, it, expect } from 'vitest';
import zh from '@/i18n/locales/zh.json';
import en from '@/i18n/locales/en.json';

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n key parity', () => {
  const zhKeys = getKeys(zh).sort();
  const enKeys = getKeys(en).sort();

  it('should have identical keys in zh and en', () => {
    expect(zhKeys).toEqual(enKeys);
  });

  it('should have no empty values in zh', () => {
    const zhValues = getKeys(zh).map((key) => {
      const parts = key.split('.');
      let val: unknown = zh;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return { key, value: val };
    });
    const empties = zhValues.filter((v) => v.value === '' || v.value === null || v.value === undefined);
    expect(empties).toEqual([]);
  });

  it('should have no empty values in en', () => {
    const enValues = getKeys(en).map((key) => {
      const parts = key.split('.');
      let val: unknown = en;
      for (const part of parts) {
        val = (val as Record<string, unknown>)[part];
      }
      return { key, value: val };
    });
    const empties = enValues.filter((v) => v.value === '' || v.value === null || v.value === undefined);
    expect(empties).toEqual([]);
  });
});
