/**
 * API Key Rotation — Round-Robin with intelligent error handling.
 *
 * Rotation Strategy:
 * 1. Round-Robin across all active keys
 * 2. Rate limit (429): pause key 60s, auto-recover
 * 3. Quota exhausted (402/1006): blacklist until user manually restores
 * 4. Invalid (401/403): permanent blacklist
 * 5. Unknown errors: 3-strike rule -> blacklist
 * 6. All unavailable: throw clear error with user guidance
 */

export type ApiKeyStatus = 'active' | 'exhausted' | 'invalid' | 'rate_limited'

export type ApiKeyErrorType =
  | 'rate_limited'     // 429 — pause 60s
  | 'quota_exhausted'  // 402/1006 — blacklist
  | 'invalid'          // 401/403 — permanent blacklist
  | 'server_error'     // 5xx — temporary skip (no status change)
  | 'unknown'          // other — count, 3-strike blacklist

export interface KeyEntry {
  provider: string
  userId: string
  keyIndex: number
  key: string
  status: ApiKeyStatus
  errorCount: number
  lastError?: string
  lastUsedAt?: Date
  /** Timestamp when a rate-limited key can be retried */
  rateLimitedUntil?: number
}

const RATE_LIMIT_PAUSE_MS = 60_000
const UNKNOWN_ERROR_STRIKE_LIMIT = 3

/** Cache key for provider+user */
function cacheKey(provider: string, userId: string): string {
  return `${provider}::${userId}`
}

export class ApiKeyRotator {
  /** In-memory key state keyed by provider::userId */
  private keysMap = new Map<string, KeyEntry[]>()
  /** Current round-robin index per provider::userId */
  private indexMap = new Map<string, number>()

  /**
   * Load (or replace) the key set for a provider+user combination.
   * Called when keys are fetched from database.
   */
  loadKeys(provider: string, userId: string, keys: KeyEntry[]): void {
    const ck = cacheKey(provider, userId)
    this.keysMap.set(ck, [...keys])
    // Preserve existing index if within bounds, otherwise reset
    const currentIdx = this.indexMap.get(ck) ?? 0
    if (currentIdx >= keys.length) {
      this.indexMap.set(ck, 0)
    }
  }

  /**
   * Get the next available key using round-robin.
   * Skips keys that are exhausted, invalid, or currently rate-limited.
   */
  getNextKey(provider: string, userId: string): { key: string; index: number } {
    const ck = cacheKey(provider, userId)
    const keys = this.keysMap.get(ck)

    if (!keys || keys.length === 0) {
      throw new AllKeysUnavailableError(
        'No API keys configured for this provider. Please add keys in Settings.'
      )
    }

    const now = Date.now()
    const startIdx = this.indexMap.get(ck) ?? 0
    const total = keys.length

    for (let attempt = 0; attempt < total; attempt++) {
      const idx = (startIdx + attempt) % total
      const entry = keys[idx]

      // Check if key is available
      if (entry.status === 'exhausted' || entry.status === 'invalid') {
        continue
      }

      if (entry.status === 'rate_limited') {
        // Check if rate limit has expired
        if (entry.rateLimitedUntil && now < entry.rateLimitedUntil) {
          continue
        }
        // Rate limit expired — recover
        entry.status = 'active'
        entry.rateLimitedUntil = undefined
      }

      // Found an available key — advance index for next call
      this.indexMap.set(ck, (idx + 1) % total)
      entry.lastUsedAt = new Date()
      return { key: entry.key, index: entry.keyIndex }
    }

    throw new AllKeysUnavailableError(
      'All API keys unavailable. Please check settings.'
    )
  }

  /**
   * Report an error for a specific key. Updates status based on error type.
   */
  reportError(
    provider: string,
    userId: string,
    keyIndex: number,
    errorType: ApiKeyErrorType,
    errorMessage?: string
  ): void {
    const ck = cacheKey(provider, userId)
    const keys = this.keysMap.get(ck)
    if (!keys) return

    const entry = keys.find((k) => k.keyIndex === keyIndex)
    if (!entry) return

    entry.lastError = errorMessage

    switch (errorType) {
      case 'rate_limited':
        entry.status = 'rate_limited'
        entry.rateLimitedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
        break

      case 'quota_exhausted':
        entry.status = 'exhausted'
        break

      case 'invalid':
        entry.status = 'invalid'
        break

      case 'server_error':
        // Temporary — don't change status, just record the error
        break

      case 'unknown':
        entry.errorCount += 1
        if (entry.errorCount >= UNKNOWN_ERROR_STRIKE_LIMIT) {
          entry.status = 'exhausted'
        }
        break
    }
  }

  /**
   * Reset the round-robin index for a provider+user (e.g. after key list change).
   */
  resetIndex(provider: string, userId: string): void {
    const ck = cacheKey(provider, userId)
    this.indexMap.set(ck, 0)
  }

  /**
   * Restore a key to active status (used when user manually resets a key).
   */
  restoreKey(provider: string, userId: string, keyIndex: number): void {
    const ck = cacheKey(provider, userId)
    const keys = this.keysMap.get(ck)
    if (!keys) return

    const entry = keys.find((k) => k.keyIndex === keyIndex)
    if (!entry) return

    entry.status = 'active'
    entry.errorCount = 0
    entry.lastError = undefined
    entry.rateLimitedUntil = undefined
  }

  /**
   * Get current status of all keys for a provider+user.
   */
  getKeyStatuses(provider: string, userId: string): KeyEntry[] {
    const ck = cacheKey(provider, userId)
    return this.keysMap.get(ck) ?? []
  }
}

/**
 * Classify an API error by HTTP status code and response body.
 */
export function classifyError(statusCode: number, errorBody: string): ApiKeyErrorType {
  // Rate limited
  if (statusCode === 429) return 'rate_limited'

  // Quota exhausted
  if (statusCode === 402) return 'quota_exhausted'

  // Invalid credentials
  if (statusCode === 401 || statusCode === 403) return 'invalid'

  // Server error
  if (statusCode >= 500 && statusCode < 600) return 'server_error'

  // Check body for error code 1006 (quota exhausted in some APIs)
  if (errorBody) {
    try {
      const parsed = JSON.parse(errorBody)
      if (parsed.code === 1006) return 'quota_exhausted'
    } catch {
      // Not JSON, check raw string
      if (errorBody.includes('1006')) return 'quota_exhausted'
    }
  }

  return 'unknown'
}

/**
 * Custom error thrown when all keys are unavailable.
 */
export class AllKeysUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AllKeysUnavailableError'
  }
}

/**
 * Singleton rotator instance for server-side use.
 */
export const globalRotator = new ApiKeyRotator()
