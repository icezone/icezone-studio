import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // 查询用户的所有 API Key
  const { data: keys, error: keyErr } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('user_id', user.id)
  if (keyErr) return NextResponse.json({ error: keyErr.message }, { status: 500 })

  const keyIds = (keys ?? []).map((k) => k.id)
  if (keyIds.length === 0) {
    return NextResponse.json({ byKey: {}, all: [] })
  }

  // 查询这些 Key 对应的能力
  const { data: rows, error } = await supabase
    .from('user_key_capabilities')
    .select('key_id, logical_model_id, source')
    .in('key_id', keyIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 构建两种视图：byKey (按 key 分组) 和 all (去重后的全量)
  const byKey: Record<string, string[]> = {}
  const all = new Set<string>()
  for (const r of rows ?? []) {
    byKey[r.key_id] = byKey[r.key_id] ?? []
    byKey[r.key_id].push(r.logical_model_id)
    all.add(r.logical_model_id)
  }

  return NextResponse.json({ byKey, all: Array.from(all) })
}
