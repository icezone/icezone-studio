import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  // Read current use_count
  const { data: current, error: readError } = await supabase
    .from('workflow_templates')
    .select('use_count')
    .eq('id', id)
    .single()

  if (readError || !current) {
    return NextResponse.json({ error: 'template not found' }, { status: 404 })
  }

  const newCount = ((current as Record<string, unknown>).use_count as number ?? 0) + 1

  const { data, error } = await supabase
    .from('workflow_templates')
    .update({ use_count: newCount })
    .eq('id', id)
    .select('id, use_count')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, use_count: data.use_count })
}
