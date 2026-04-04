import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  const { data, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  // RLS ensures only own templates can be deleted
  const { data, error } = await supabase
    .from('workflow_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ deleted: data.id })
}
