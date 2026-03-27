import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { uuidSchema, saveDraftSchema } from '@/lib/validation'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('project_drafts')
    .select('data, revision, updated_at')
    .eq('project_id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = saveDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Step 1: 检查当前 revision
  const { data: current, error: fetchError } = await supabase
    .from('project_drafts')
    .select('revision')
    .eq('project_id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // Step 2: revision 冲突检测 (INV-5)
  if (current.revision !== parsed.data.expectedRevision) {
    return NextResponse.json(
      { error: 'conflict', serverRevision: current.revision },
      { status: 409 }
    )
  }

  // Step 3: 更新草稿，revision + 1
  const newRevision = current.revision + 1
  const { data: updated, error: updateError } = await supabase
    .from('project_drafts')
    .update({
      data: parsed.data.data,
      revision: newRevision,
    })
    .eq('project_id', id)
    .select('revision')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ revision: updated.revision })
}
