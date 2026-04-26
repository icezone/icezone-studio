'use client'
import { useState } from 'react'
import type { FallbackToastPayload } from '@/features/routing/application/types'

interface FallbackToastProps {
  payload: FallbackToastPayload
  onDismiss: () => void
}

export function FallbackToast({ payload, onDismiss }: FallbackToastProps) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 rounded-lg bg-gray-900 p-3 text-sm text-white shadow-xl">
      <div className="flex items-center gap-2">
        <span>{payload.message}</span>
        <button className="ml-2 text-xs underline opacity-70" onClick={() => setShowDetail(s => !s)}>
          {showDetail ? '收起' : '查看详情'}
        </button>
        <button className="ml-auto text-xs opacity-50" onClick={onDismiss}>✕</button>
      </div>
      {showDetail && (
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-gray-300">
          {payload.fallbackChain.map((a, i) => (
            <div key={a.keyId ?? i} className="flex items-center gap-1">
              <span>{a.status === 'success' ? '✓' : '✗'}</span>
              <span>{a.displayName ?? a.keyId}</span>
              {a.latencyMs != null && <span className="opacity-60">{a.latencyMs}ms</span>}
              {a.errorCode != null && <span className="text-red-300 opacity-80">{a.errorCode}</span>}
            </div>
          ))}
          <a href="/settings" className="mt-1 text-blue-300 underline">在 Settings 调整偏好</a>
        </div>
      )}
    </div>
  )
}
