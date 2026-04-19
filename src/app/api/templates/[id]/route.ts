import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { updateTemplateSchema } from '@/lib/validation'

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

export async function PATCH(request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  const body = await request.json()
  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const patch = parsed.data
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.description !== undefined) updates.description = patch.description
  if (patch.tags !== undefined) updates.tags = patch.tags
  if (patch.thumbnailUrl !== undefined) updates.thumbnail_url = patch.thumbnailUrl
  if (patch.isPublic !== undefined) {
    updates.is_public = patch.isPublic
    updates.category = patch.isPublic ? 'shared' : 'custom'
  }
  if (patch.templateData !== undefined) {
    updates.template_data = patch.templateData
    updates.node_count = patch.templateData.nodes.length
  }

  const { data, error } = await supabase
    .from('workflow_templates')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, category, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}
