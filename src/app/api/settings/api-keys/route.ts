import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { z } from 'zod'

const SUPPORTED_PROVIDERS = ['kie', 'ppio', 'grsai', 'fal', 'openai', 'anthropic'] as const
type Provider = (typeof SUPPORTED_PROVIDERS)[number]

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

const upsertSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  key: z.string().min(8),
})

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, provider, encrypted_key, iv, created_at')
    .eq('user_id', user.id)
    .order('provider')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const masked = (data ?? []).map((row) => {
    let maskedValue = '••••••••'
    try {
      maskedValue = maskKey(decrypt(row.encrypted_key, row.iv))
    } catch {
      // If decryption fails, return masked placeholder
    }
    return { id: row.id, provider: row.provider, maskedValue, created_at: row.created_at }
  })

  return NextResponse.json(masked)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { provider, key } = parsed.data
  const { encrypted, iv } = encrypt(key)

  const { error } = await supabase
    .from('user_api_keys')
    .upsert(
      { user_id: user.id, provider, encrypted_key: encrypted, iv },
      { onConflict: 'user_id,provider' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

const providerSchema = z.object({ provider: z.enum(SUPPORTED_PROVIDERS) })

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = providerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', parsed.data.provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
