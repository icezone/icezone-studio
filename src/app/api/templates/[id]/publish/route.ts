import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Params) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = await request.json()
  const action = body.action as string ?? 'publish'

  const isPublish = action === 'publish'

  const updatePayload = isPublish
    ? {
        is_public: true,
        category: 'shared',
        ...(body.description != null ? { description: body.description } : {}),
        ...(body.tags != null ? { tags: body.tags } : {}),
        ...(body.thumbnailUrl != null ? { thumbnail_url: body.thumbnailUrl } : {}),
      }
    : {
        is_public: false,
        category: 'custom',
      }

  const { data, error } = await supabase
    .from('workflow_templates')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id) // Ensure ownership
    .select('id, is_public, category')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}
