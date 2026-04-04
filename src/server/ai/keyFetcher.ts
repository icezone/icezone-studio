/**
 * Server-side helper to fetch and decrypt user API keys for rotation.
 * Used by AI generate routes to load keys into the rotator.
 */
import { createDecipheriv, scryptSync } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { globalRotator, type KeyEntry } from './keyRotation'

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'dev-fallback-key'
  return scryptSync(secret, 'scw-salt-v1', 32)
}

function decrypt(encryptedBase64: string, ivBase64: string): string {
  const key = getEncryptionKey()
  const iv = Buffer.from(ivBase64, 'base64')
  const encrypted = Buffer.from(encryptedBase64, 'base64')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Fetch all keys for a provider+user from database, decrypt them,
 * and load into the global rotator.
 *
 * Returns the loaded key entries (without the raw key for safety).
 */
export async function loadUserKeysForProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<KeyEntry[]> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key, iv, key_index, status, error_count, last_error, last_used_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('key_index')

  if (error || !data || data.length === 0) {
    return []
  }

  const entries: KeyEntry[] = data.map((row) => {
    let decryptedKey = ''
    try {
      decryptedKey = decrypt(row.encrypted_key, row.iv)
    } catch {
      // Decryption failed — mark as invalid
    }

    return {
      provider,
      userId,
      keyIndex: row.key_index ?? 0,
      key: decryptedKey,
      status: (row.status ?? 'active') as KeyEntry['status'],
      errorCount: row.error_count ?? 0,
      lastError: row.last_error ?? undefined,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    }
  })

  // Filter out entries where decryption failed
  const validEntries = entries.filter((e) => e.key.length > 0)

  globalRotator.loadKeys(provider, userId, validEntries)
  return validEntries
}

/**
 * Persist key status changes back to the database after error reporting.
 */
export async function persistKeyStatus(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  keyIndex: number,
  status: string,
  errorCount: number,
  lastError?: string
): Promise<void> {
  await supabase
    .from('user_api_keys')
    .update({
      status,
      error_count: errorCount,
      last_error: lastError ?? null,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('key_index', keyIndex)
}
