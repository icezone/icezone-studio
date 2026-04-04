/**
 * Helper to execute provider calls with key rotation.
 * Manages the lifecycle of fetching keys, trying with rotation,
 * and reporting errors.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { globalRotator, classifyError, AllKeysUnavailableError } from './keyRotation'
import { loadUserKeysForProvider, persistKeyStatus } from './keyFetcher'

/** Maps provider IDs to their env var names */
const PROVIDER_KEY_ENV_MAP: Record<string, string> = {
  kie: 'KIE_API_KEY',
  ppio: 'PPIO_API_KEY',
  grsai: 'GRSAI_API_KEY',
  fal: 'FAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

interface RotationCallResult<T> {
  result: T
  keyIndex: number
}

/**
 * Execute a function with key rotation. On failure, classifies the error,
 * reports to the rotator, and retries with the next key.
 *
 * @param supabase - Supabase client for DB access
 * @param userId - The current user ID
 * @param providerId - Provider identifier (e.g. 'kie')
 * @param fn - The function to execute (provider call)
 * @param maxRetries - Maximum number of different keys to try (default: 3)
 */
export async function withKeyRotation<T>(
  supabase: SupabaseClient,
  userId: string,
  providerId: string,
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<RotationCallResult<T>> {
  // Load user keys into the rotator
  const keys = await loadUserKeysForProvider(supabase, userId, providerId)

  // If no user keys configured, fall back to env var (system key)
  if (keys.length === 0) {
    const envKey = PROVIDER_KEY_ENV_MAP[providerId]
    if (envKey && process.env[envKey]) {
      // No rotation possible — just call directly with the env key
      const result = await fn()
      return { result, keyIndex: -1 }
    }
    throw new AllKeysUnavailableError(
      'No API keys configured for this provider. Please add keys in Settings.'
    )
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < Math.min(maxRetries, keys.length); attempt++) {
    let keyIndex: number

    try {
      const nextKey = globalRotator.getNextKey(providerId, userId)
      keyIndex = nextKey.index

      // Temporarily set the env var so the provider uses this key
      const envVarName = PROVIDER_KEY_ENV_MAP[providerId]
      const originalEnvValue = envVarName ? process.env[envVarName] : undefined

      try {
        if (envVarName) {
          process.env[envVarName] = nextKey.key
        }
        const result = await fn()
        // Restore env var
        if (envVarName) {
          if (originalEnvValue !== undefined) {
            process.env[envVarName] = originalEnvValue
          } else {
            delete process.env[envVarName]
          }
        }
        return { result, keyIndex }
      } catch (providerError) {
        // Restore env var
        if (envVarName) {
          if (originalEnvValue !== undefined) {
            process.env[envVarName] = originalEnvValue
          } else {
            delete process.env[envVarName]
          }
        }
        throw providerError
      }
    } catch (error) {
      if (error instanceof AllKeysUnavailableError) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))

      // Try to classify the error from the message
      const statusMatch = lastError.message.match(/(\d{3})/)
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0
      const errorType = classifyError(statusCode, lastError.message)

      // We need keyIndex from the getNextKey call above
      // Since we caught the error, keyIndex should be defined from the outer try
      const currentKeyIndex = globalRotator.getKeyStatuses(providerId, userId)
        .find((k) => k.status !== 'exhausted' && k.status !== 'invalid')?.keyIndex ?? 0

      globalRotator.reportError(providerId, userId, currentKeyIndex, errorType, lastError.message)

      // Persist error status to DB (non-blocking)
      const keyEntry = globalRotator.getKeyStatuses(providerId, userId)
        .find((k) => k.keyIndex === currentKeyIndex)
      if (keyEntry) {
        void persistKeyStatus(
          supabase,
          userId,
          providerId,
          currentKeyIndex,
          keyEntry.status,
          keyEntry.errorCount,
          lastError.message
        )
      }

      // Continue to next attempt
    }
  }

  throw lastError ?? new AllKeysUnavailableError(
    'All API keys unavailable. Please check settings.'
  )
}
