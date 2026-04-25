import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { probeKey } from '@/server/ai/capability/prober'

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const result = await probeKey(supabase, user.id, id)
  return NextResponse.json(result)
}
