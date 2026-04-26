import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('model_call_history')
    .select('logical_model_id, status, latency_ms, cost_estimate_cents, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length
  const successCount = rows.filter((r: { status: string }) => r.status === 'success').length
  const avgLatencyMs = total > 0
    ? Math.round(rows.reduce((s: number, r: { latency_ms: number | null }) => s + (r.latency_ms ?? 0), 0) / total)
    : 0
  const totalCostCents = rows.reduce((s: number, r: { cost_estimate_cents: number | null }) => s + (r.cost_estimate_cents ?? 0), 0)

  const byModel: Record<string, { total: number; success: number; avgLatencyMs: number; totalCostCents: number }> = {}
  for (const r of rows as Array<{ logical_model_id: string; status: string; latency_ms: number | null; cost_estimate_cents: number | null }>) {
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
