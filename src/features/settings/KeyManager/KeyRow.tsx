'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LOGICAL_MODELS } from '@/config/logical-models'
import type { KeyRowData } from './useKeyManager'

interface Props {
  row: KeyRowData
  onProbe: (id: string) => Promise<void>
  onDelete: (provider: string, keyIndex: number) => Promise<void>
  onAddAlias: (keyId: string, logicalModelId: string) => Promise<void>
  onRemoveAlias: (keyId: string, logicalModelId: string) => Promise<void>
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  active:       { text: '已验证',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  unverified:   { text: '待探测',   color: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/50' },
  invalid:      { text: '无效',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  rate_limited: { text: '限流',     color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  exhausted:    { text: '额度耗尽', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
}

export function KeyRow({ row, onProbe, onDelete, onAddAlias, onRemoveAlias }: Props) {
  const { t } = useTranslation()
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.unverified
  const label = row.display_name ?? row.provider
  const isCustom = row.provider.startsWith('custom:')
  const [selectedModel, setSelectedModel] = useState('')
  const [adding, setAdding] = useState(false)

  const available = LOGICAL_MODELS.filter((m) => !row.capabilities.includes(m.id))

  async function handleAddAlias() {
    if (!selectedModel) return
    setAdding(true)
    try {
      await onAddAlias(row.id, selectedModel)
      setSelectedModel('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--ui-line)] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ui-fg)]">{label}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{badge.text}</span>
          <span className="font-mono text-xs text-[var(--ui-fg-muted)]">{row.maskedValue}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-[var(--ui-fg)] hover:bg-[var(--ui-surface-field)]"
            onClick={() => void onProbe(row.id)}
          >
            重新探测
          </button>
          <button
            type="button"
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
            onClick={() => void onDelete(row.provider, row.key_index)}
          >
            删除
          </button>
        </div>
      </div>

      <div className="text-xs text-[var(--ui-fg-muted)]">
        已解锁模型（{row.capabilities.length}）
      </div>
      {row.capabilities.length === 0 ? (
        <p className="text-xs italic text-[var(--ui-fg-muted)]">
          无{isCustom ? '（可在下方手动添加）' : '（点"重新探测"）'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.capabilities.map((cap) => {
            const isAlias = row.aliasIds.includes(cap)
            return (
              <span
                key={cap}
                className="flex items-center gap-1 rounded bg-[var(--ui-surface-field)] px-2 py-0.5 text-xs text-[var(--ui-fg)]"
              >
                {cap}
                <span className="text-[var(--ui-fg-muted)]">
                  ({isAlias
                    ? t('settings.aliasMap.aliasSource')
                    : t('settings.aliasMap.probeSource')})
                </span>
                {isAlias && (
                  <button
                    type="button"
                    className="ml-0.5 leading-none text-[var(--ui-fg-muted)] hover:text-red-500"
                    title={t('settings.aliasMap.removeBtn')}
                    onClick={() => void onRemoveAlias(row.id, cap)}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {isCustom && (
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="ui-field border flex-1 px-2 py-1 text-xs"
          >
            <option value="">{t('settings.aliasMap.addPlaceholder')}</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedModel || adding}
            onClick={() => void handleAddAlias()}
            className="rounded border border-[var(--ui-line)] px-2 py-1 text-xs text-[var(--ui-fg)] disabled:opacity-40 hover:bg-[var(--ui-surface-field)]"
          >
            {t('settings.aliasMap.addBtn')}
          </button>
        </div>
      )}

      {row.last_error && (
        <div className="text-xs text-red-500">最近错误：{row.last_error}</div>
      )}
    </div>
  )
}
