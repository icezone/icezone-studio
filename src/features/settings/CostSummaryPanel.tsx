'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ModelStats {
  total: number
  success: number
  avgLatencyMs: number
  totalCostCents: number
}

interface CallHistoryStats {
  total: number
  successCount: number
  avgLatencyMs: number
  totalCostCents: number
  byModel: Record<string, ModelStats>
}

/** 将美分转为带 $ 前缀的字符串，保留 4 位小数 */
function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`
}

export function CostSummaryPanel() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<CallHistoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/settings/call-history')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: CallHistoryStats) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-xs text-[var(--ui-fg-muted)]">{t('settings.costPanel.loading')}</p>
  }
  if (error) {
    return <p className="text-xs text-red-500">{t('settings.costPanel.error')}</p>
  }
  if (!stats || stats.total === 0) {
    return <p className="text-xs text-[var(--ui-fg-muted)]">{t('settings.costPanel.empty')}</p>
  }

  const successRate = Math.round((stats.successCount / stats.total) * 100)
  const kpis = [
    { label: t('settings.costPanel.totalCalls'), value: String(stats.total) },
    { label: t('settings.costPanel.successRate'), value: `${successRate}%` },
    { label: t('settings.costPanel.avgLatency'), value: `${stats.avgLatencyMs}ms` },
    { label: t('settings.costPanel.totalCost'), value: formatCost(stats.totalCostCents) },
  ]

  const modelRows = Object.entries(stats.byModel).sort(
    ([, a], [, b]) => b.total - a.total,
  )

  return (
    <div className="space-y-4">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--ui-line)] bg-[var(--ui-surface-field)] p-3"
          >
            <p className="text-xs text-[var(--ui-fg-muted)]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ui-fg)]">{value}</p>
          </div>
        ))}
      </div>

      {/* 按模型明细表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--ui-line)] text-left">
              {[
                t('settings.costPanel.model'),
                t('settings.costPanel.calls'),
                t('settings.costPanel.success'),
                t('settings.costPanel.latency'),
                t('settings.costPanel.cost'),
              ].map((h) => (
                <th key={h} className="pb-1.5 pr-4 font-medium text-[var(--ui-fg-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelRows.map(([modelId, m]) => (
              <tr key={modelId} className="border-b border-[var(--ui-line)]/30 text-[var(--ui-fg)]">
                <td className="py-1.5 pr-4 font-medium">{modelId}</td>
                <td className="py-1.5 pr-4">{m.total}</td>
                <td className="py-1.5 pr-4">{Math.round((m.success / m.total) * 100)}%</td>
                <td className="py-1.5 pr-4">{m.avgLatencyMs}ms</td>
                <td className="py-1.5">{formatCost(m.totalCostCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
