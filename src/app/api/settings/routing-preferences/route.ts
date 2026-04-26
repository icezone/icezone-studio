import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('routing_preferences')
    .select('id, level, target, preferred_key_id, fallback_enabled, updated_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { level, target, preferred_key_id, fallback_enabled } = body
  if ((level !== 'model' && level !== 'scenario') || typeof target !== 'string' || !target) {
    return NextResponse.json({ error: 'level(model|scenario) and target are required' }, { status: 400 })
  }

  const { error } = await supabase.from('routing_preferences').upsert(
    {
      user_id: user.id,
      level,
      target,
      preferred_key_id: preferred_key_id ?? null,
      fallback_enabled: fallback_enabled !== false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,level,target' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
