import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

const DEFAULT_PAGE_SIZE = 20
const MAX_AGG_LIMIT = 500

/**
 * GET /api/settings/call-history
 *
 * 无参数：返回 30 天聚合统计（向后兼容）
 * ?page=N&pageSize=M：返回原始记录分页列表（page 从 1 开始）
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const rawPage = searchParams.get('page')
  const rawSize = searchParams.get('pageSize')

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 分页模式
  if (rawPage !== null) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(rawSize ?? String(DEFAULT_PAGE_SIZE), 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('model_call_history')
      .select('id, logical_model_id, status, latency_ms, cost_estimate_cents, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      records: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
    })
  }

  // 聚合模式（向后兼容）
  const { data, error } = await supabase
    .from('model_call_history')
    .select('logical_model_id, status, latency_ms, cost_estimate_cents, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(MAX_AGG_LIMIT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length
  const successCount = rows.filter((r: { status: string }) => r.status === 'success').length
  const avgLatencyMs =
    total > 0
      ? Math.round(
          rows.reduce((s: number, r: { latency_ms: number | null }) => s + (r.latency_ms ?? 0), 0) /
            total,
        )
      : 0
  const totalCostCents = rows.reduce(
    (s: number, r: { cost_estimate_cents: number | null }) => s + (r.cost_estimate_cents ?? 0),
    0,
  )

  const byModel: Record<
    string,
    { total: number; success: number; avgLatencyMs: number; totalCostCents: number }
  > = {}
  for (const r of rows as Array<{
    logical_model_id: string
    status: string
    latency_ms: number | null
    cost_estimate_cents: number | null
  }>) {
    const m = r.logical_model_id
    byModel[m] = byModel[m] ?? { total: 0, success: 0, avgLatencyMs: 0, totalCostCents: 0 }
    byModel[m].total++
    if (r.status === 'success') byModel[m].success++
    byModel[m].avgLatencyMs += r.latency_ms ?? 0
    byModel[m].totalCostCents += r.cost_estimate_cents ?? 0
  }
  for (const k of Object.keys(byModel)) {
    byModel[k].avgLatencyMs = Math.round(byModel[k].avgLatencyMs / byModel[k].total)
  }

  return NextResponse.json({ total, successCount, avgLatencyMs, totalCostCents, byModel })
}
