'use client'

import type { KeyRowData } from './useKeyManager'

interface Props {
  row: KeyRowData
  onProbe: (id: string) => Promise<void>
  onDelete: (provider: string, keyIndex: number) => Promise<void>
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  active: { text: '已验证', color: 'bg-green-100 text-green-800' },
  unverified: { text: '待探测', color: 'bg-gray-100 text-gray-800' },
  invalid: { text: '无效', color: 'bg-red-100 text-red-800' },
  rate_limited: { text: '限流', color: 'bg-yellow-100 text-yellow-800' },
  exhausted: { text: '额度耗尽', color: 'bg-orange-100 text-orange-800' },
}

export function KeyRow({ row, onProbe, onDelete }: Props) {
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.unverified
  const label = row.display_name ?? row.provider

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{label}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{badge.text}</span>
          <span className="font-mono text-xs text-gray-500">{row.maskedValue}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => void onProbe(row.id)}
          >
            重新探测
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-red-600"
            onClick={() => void onDelete(row.provider, row.key_index)}
          >
            删除
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        已解锁模型({row.capabilities.length}):
        {row.capabilities.length === 0 ? (
          <span className="ml-1 italic text-gray-400">无(点&ldquo;重新探测&rdquo;)</span>
        ) : (
          <span className="ml-1">{row.capabilities.join(', ')}</span>
        )}
      </div>
      {row.last_error && (
        <div className="text-xs text-red-500">最近错误:{row.last_error}</div>
      )}
    </div>
  )
}
