import { describe, expect, it, beforeEach } from 'vitest'
import type { AIProvider } from './types'
import {
  registerProvider,
  getProvider,
  resolveProvider,
  clearProvidersForTest,
} from './registry'

const fakeKieProvider: AIProvider = { id: 'kie', name: 'kie' }

describe('registry', () => {
  beforeEach(() => {
    clearProvidersForTest()
  })

  it('registerProvider + getProvider 保持原行为', () => {
    registerProvider(fakeKieProvider)
    expect(getProvider('kie')?.id).toBe('kie')
    expect(getProvider('missing')).toBeUndefined()
  })

  it('resolveProvider 对内置 id 走静态查询', () => {
    registerProvider(fakeKieProvider)
    const p = resolveProvider('kie', {})
    expect(p?.id).toBe('kie')
  })

  it('resolveProvider 对 custom:<uuid> 前缀动态构造', () => {
    const p = resolveProvider('custom:a1b2c3d4', {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
    })

    expect(p?.id).toBe('custom:a1b2c3d4')
    expect(typeof (p as { chatComplete?: unknown }).chatComplete).toBe('function')
  })

  it('resolveProvider 对 custom:<uuid> 缺少 baseUrl 抛错', () => {
    expect(() =>
      resolveProvider('custom:abc', { apiKey: 'sk' })
    ).toThrow(/baseUrl/)
  })

  it('resolveProvider 对 custom:<uuid> 缺少 apiKey 抛错', () => {
    expect(() =>
      resolveProvider('custom:abc', { baseUrl: 'https://x' })
    ).toThrow(/apiKey/)
  })

  it('resolveProvider 对未注册且非 custom 前缀的 id 返回 undefined', () => {
    expect(resolveProvider('no-such', {})).toBeUndefined()
  })
})
