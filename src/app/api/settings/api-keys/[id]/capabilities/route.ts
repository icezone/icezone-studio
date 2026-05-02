import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

async function verifyOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data, error } = await supabase
    .from('user_key_capabilities')
    .select('logical_model_id, source')
    .eq('key_id', keyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    capabilities: (data ?? []).map((r) => ({
      logicalModelId: r.logical_model_id,
      source: r.source,
    })),
  })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = (await req.json()) as { logicalModelId?: string }
  if (!body.logicalModelId)
    return NextResponse.json({ error: 'logicalModelId required' }, { status: 400 })

  const { error } = await supabase
    .from('user_key_capabilities')
    .upsert(
      { key_id: keyId, logical_model_id: body.logicalModelId, source: 'alias' },
      { onConflict: 'key_id,logical_model_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id: keyId } = await ctx.params
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!(await verifyOwner(supabase, user.id, keyId)))
    return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = (await req.json()) as { logicalModelId?: string }
  if (!body.logicalModelId)
    return NextResponse.json({ error: 'logicalModelId required' }, { status: 400 })

  const { error } = await supabase
    .from('user_key_capabilities')
    .delete()
    .eq('key_id', keyId)
    .eq('logical_model_id', body.logicalModelId)
    .eq('source', 'alias')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
