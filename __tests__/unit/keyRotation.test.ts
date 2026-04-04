// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  ApiKeyRotator,
  classifyError,
  type ApiKeyErrorType,
  type KeyEntry,
} from '@/server/ai/keyRotation'

function makeKeys(count: number, provider = 'kie', userId = 'user-1'): KeyEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    provider,
    userId,
    keyIndex: i,
    key: `sk-key-${i}`,
    status: 'active' as const,
    errorCount: 0,
  }))
}

describe('ApiKeyRotator', () => {
  let rotator: ApiKeyRotator

  beforeEach(() => {
    rotator = new ApiKeyRotator()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getNextKey', () => {
    it('does Round-Robin rotation', () => {
      const keys = makeKeys(3)
      rotator.loadKeys('kie', 'user-1', keys)

      const first = rotator.getNextKey('kie', 'user-1')
      const second = rotator.getNextKey('kie', 'user-1')
      const third = rotator.getNextKey('kie', 'user-1')
      const fourth = rotator.getNextKey('kie', 'user-1')

      expect(first.index).toBe(0)
      expect(second.index).toBe(1)
      expect(third.index).toBe(2)
      // Wraps around
      expect(fourth.index).toBe(0)
    })

    it('skips blacklisted keys', () => {
      const keys = makeKeys(3)
      keys[1].status = 'exhausted'
      rotator.loadKeys('kie', 'user-1', keys)

      const first = rotator.getNextKey('kie', 'user-1')
      const second = rotator.getNextKey('kie', 'user-1')
      const third = rotator.getNextKey('kie', 'user-1')

      expect(first.index).toBe(0)
      expect(second.index).toBe(2)
      // Wraps, skipping index 1
      expect(third.index).toBe(0)
    })

    it('throws error when all keys unavailable', () => {
      const keys = makeKeys(2)
      keys[0].status = 'exhausted'
      keys[1].status = 'invalid'
      rotator.loadKeys('kie', 'user-1', keys)

      expect(() => rotator.getNextKey('kie', 'user-1')).toThrow(
        /All API keys unavailable/
      )
    })

    it('throws error when no keys loaded', () => {
      expect(() => rotator.getNextKey('kie', 'user-1')).toThrow(
        /No API keys configured/
      )
    })
  })

  describe('reportError', () => {
    it('blacklists quota_exhausted keys', () => {
      const keys = makeKeys(2)
      rotator.loadKeys('kie', 'user-1', keys)

      rotator.reportError('kie', 'user-1', 0, 'quota_exhausted')

      // Key 0 should be skipped
      const next = rotator.getNextKey('kie', 'user-1')
      expect(next.index).toBe(1)
    })

    it('permanently marks invalid keys', () => {
      const keys = makeKeys(2)
      rotator.loadKeys('kie', 'user-1', keys)

      rotator.reportError('kie', 'user-1', 0, 'invalid')

      const next = rotator.getNextKey('kie', 'user-1')
      expect(next.index).toBe(1)

      // Even after a long time, invalid key stays blacklisted
      vi.advanceTimersByTime(300_000)
      const nextAgain = rotator.getNextKey('kie', 'user-1')
      expect(nextAgain.index).toBe(1)
    })

    it('pauses rate_limited keys for 60s then recovers', () => {
      const keys = makeKeys(2)
      rotator.loadKeys('kie', 'user-1', keys)

      rotator.reportError('kie', 'user-1', 0, 'rate_limited')

      // Key 0 is paused, should get key 1
      const next = rotator.getNextKey('kie', 'user-1')
      expect(next.index).toBe(1)

      // After 60s, key 0 should recover
      vi.advanceTimersByTime(60_000)

      // Reset round-robin counter so we start from 0
      rotator.resetIndex('kie', 'user-1')
      const recovered = rotator.getNextKey('kie', 'user-1')
      expect(recovered.index).toBe(0)
    })

    it('blacklists after 3 unknown errors', () => {
      const keys = makeKeys(2)
      rotator.loadKeys('kie', 'user-1', keys)

      rotator.reportError('kie', 'user-1', 0, 'unknown')
      rotator.reportError('kie', 'user-1', 0, 'unknown')

      // 2 errors — still active
      rotator.resetIndex('kie', 'user-1')
      const stillActive = rotator.getNextKey('kie', 'user-1')
      expect(stillActive.index).toBe(0)

      // 3rd error — blacklisted
      rotator.reportError('kie', 'user-1', 0, 'unknown')
      rotator.resetIndex('kie', 'user-1')
      const afterBlacklist = rotator.getNextKey('kie', 'user-1')
      expect(afterBlacklist.index).toBe(1)
    })

    it('does not blacklist on server_error (temporary skip only)', () => {
      const keys = makeKeys(1)
      rotator.loadKeys('kie', 'user-1', keys)

      rotator.reportError('kie', 'user-1', 0, 'server_error')

      // server_error is temporary — key stays active
      const next = rotator.getNextKey('kie', 'user-1')
      expect(next.index).toBe(0)
    })
  })

  describe('classifyError', () => {
    it('correctly categorizes 429 as rate_limited', () => {
      expect(classifyError(429, '')).toBe('rate_limited')
    })

    it('correctly categorizes 402 as quota_exhausted', () => {
      expect(classifyError(402, '')).toBe('quota_exhausted')
    })

    it('correctly categorizes error body with 1006 as quota_exhausted', () => {
      expect(classifyError(400, '{"code": 1006, "message": "quota exhausted"}')).toBe(
        'quota_exhausted'
      )
    })

    it('correctly categorizes 401 as invalid', () => {
      expect(classifyError(401, '')).toBe('invalid')
    })

    it('correctly categorizes 403 as invalid', () => {
      expect(classifyError(403, '')).toBe('invalid')
    })

    it('correctly categorizes 5xx as server_error', () => {
      expect(classifyError(500, '')).toBe('server_error')
      expect(classifyError(502, '')).toBe('server_error')
      expect(classifyError(503, '')).toBe('server_error')
    })

    it('categorizes other status codes as unknown', () => {
      expect(classifyError(400, '')).toBe('unknown')
      expect(classifyError(404, '')).toBe('unknown')
      expect(classifyError(200, '')).toBe('unknown')
    })
  })
})
