'use client'

import { useTranslation } from 'react-i18next'
import { AddKeyForm } from './AddKeyForm'
import { KeyRow } from './KeyRow'
import { useKeyManager } from './useKeyManager'

export function KeyManager() {
  const { t } = useTranslation()
  const { keys, loading, error, addKey, deleteKey, probe } = useKeyManager()

  return (
    <div className="flex flex-col gap-4">
      <AddKeyForm onSubmit={addKey} />
      {error && (
        <div className="rounded bg-red-500/10 p-2 text-sm text-red-500">
          加载失败: {error}
        </div>
      )}
      {loading ? (
        <div className="text-sm text-[var(--ui-fg-muted)]">{t('common.loading')}</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-[var(--ui-fg-muted)]">{t('settings.multiKeyAddKey')}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((k) => (
            <KeyRow key={k.id} row={k} onProbe={probe} onDelete={deleteKey} />
          ))}
        </div>
      )}
    </div>
  )
}
