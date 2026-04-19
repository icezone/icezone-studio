import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { createTemplateSchema } from '@/lib/validation'

export async function GET(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const sort = searchParams.get('sort') ?? 'newest'
  const tag = searchParams.get('tag')

  let query = supabase
    .from('workflow_templates')
    .select('id, user_id, name, description, category, tags, thumbnail_url, node_count, is_public, use_count, created_at, updated_at')

  if (category === 'official') {
    query = query.is('user_id', null)
  } else if (category === 'shared') {
    query = query.eq('is_public', true).eq('category', 'shared')
  } else if (category === 'custom') {
    query = query.eq('user_id', user.id)
  } else {
    // Default: own templates + official
    query = query.or(`user_id.eq.${user.id},user_id.is.null,is_public.eq.true`)
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (sort === 'popular') {
    query = query.order('use_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, tags, thumbnailUrl, isPublic, templateData } = parsed.data

  const { data, error } = await supabase
    .from('workflow_templates')
    .insert({
      user_id: user.id,
      name,
      description,
      tags,
      thumbnail_url: thumbnailUrl,
      template_data: templateData,
      node_count: templateData.nodes.length,
      category: isPublic ? 'shared' : 'custom',
      is_public: isPublic,
    })
    .select('id, name, category, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
