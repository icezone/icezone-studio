import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { z } from 'zod'

const BUILT_IN_PROVIDERS = ['kie', 'ppio', 'grsai', 'fal', 'openai', 'anthropic'] as const

const CUSTOM_PREFIX = 'custom:'

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'dev-fallback-key'
  return scryptSync(secret, 'scw-salt-v1', 32)
}

function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
  }
}

function decrypt(encryptedBase64: string, ivBase64: string): string {
  const key = getEncryptionKey()
  const iv = Buffer.from(ivBase64, 'base64')
  const encrypted = Buffer.from(encryptedBase64, 'base64')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

function maskKey(plaintext: string): string {
  if (plaintext.length <= 8) return '••••••••'
  return plaintext.slice(0, 4) + '••••' + plaintext.slice(-4)
}

const addKeySchema = z
  .object({
    provider: z.string().min(1),
    key: z.string().min(8),
    key_index: z.number().int().min(0).optional(),
    base_url: z
      .string()
      .url()
      .refine((v) => /^https?:\/\//i.test(v), {
        message: 'base_url must use http or https scheme',
      })
      .optional(),
    protocol: z.enum(['native', 'openai-compat']).optional(),
    display_name: z.string().max(80).optional(),
  })
  .refine(
    (v) =>
      v.provider.startsWith(CUSTOM_PREFIX) ||
      (BUILT_IN_PROVIDERS as readonly string[]).includes(v.provider),
    { message: 'provider must be built-in or start with "custom:"', path: ['provider'] }
  )
  .refine(
    (v) => !v.provider.startsWith(CUSTOM_PREFIX) || Boolean(v.base_url),
    { message: 'custom provider requires base_url', path: ['base_url'] }
  )
  .refine(
    (v) => !v.provider.startsWith(CUSTOM_PREFIX) || v.provider.length > CUSTOM_PREFIX.length,
    { message: 'custom provider id must include a suffix (custom:<id>)', path: ['provider'] }
  )

const deleteKeySchema = z.object({
  provider: z.string(),
  key_index: z.number().int().min(0).optional(),
})

const updateStatusSchema = z.object({
  provider: z.string(),
  key_index: z.number().int().min(0),
  status: z.enum(['active', 'exhausted', 'invalid', 'rate_limited']),
})

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, provider, encrypted_key, iv, key_index, status, last_error, last_used_at, error_count, created_at, base_url, protocol, display_name, last_verified_at')
    .eq('user_id', user.id)
    .order('provider')
    .order('key_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const masked = (data ?? []).map((row) => {
    let maskedValue = '••••••••'
    try {
      maskedValue = maskKey(decrypt(row.encrypted_key, row.iv))
    } catch {
      // If decryption fails, return masked placeholder
    }
    return {
      id: row.id,
      provider: row.provider,
      maskedValue,
      key_index: row.key_index ?? 0,
      status: row.status ?? 'active',
      last_error: row.last_error,
      last_used_at: row.last_used_at,
      error_count: row.error_count ?? 0,
      created_at: row.created_at,
      base_url: row.base_url ?? null,
      protocol: row.protocol ?? 'native',
      display_name: row.display_name ?? null,
      last_verified_at: row.last_verified_at ?? null,
    }
  })

  return NextResponse.json(masked)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = addKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider, key } = parsed.data
  const { encrypted, iv } = encrypt(key)

  // If key_index is provided, use it. Otherwise, auto-assign the next available index.
  let keyIndex = parsed.data.key_index
  if (keyIndex === undefined) {
    const { data: existing } = await supabase
      .from('user_api_keys')
      .select('key_index')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .order('key_index', { ascending: false })
      .limit(1)

    keyIndex = existing && existing.length > 0 ? (existing[0].key_index ?? 0) + 1 : 0
  }

  const protocol = parsed.data.protocol ?? (parsed.data.base_url ? 'openai-compat' : 'native')

  const { error } = await supabase
    .from('user_api_keys')
    .upsert(
      {
        user_id: user.id,
        provider,
        encrypted_key: encrypted,
        iv,
        key_index: keyIndex,
        status: 'unverified',
        error_count: 0,
        last_error: null,
        base_url: parsed.data.base_url,
        protocol,
        display_name: parsed.data.display_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,key_index' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, key_index: keyIndex })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider, key_index, status } = parsed.data

  const { error } = await supabase
    .from('user_api_keys')
    .update({
      status,
      error_count: status === 'active' ? 0 : undefined,
      last_error: status === 'active' ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', provider)
    .eq('key_index', key_index)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = deleteKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider, key_index } = parsed.data

  let query = supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  // If key_index specified, delete only that key; otherwise delete all keys for the provider
  if (key_index !== undefined) {
    query = query.eq('key_index', key_index)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
