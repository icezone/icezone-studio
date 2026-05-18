'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ModelScenario, type LogicalModelEntry, listLogicalModels } from '@/config/logical-models'
import { useUnlockedModels } from '@/hooks/useUnlockedModels'

interface Props {
  scenario: ModelScenario
  value: string | null
  onChange: (id: string) => void
  className?: string
}

interface ModelButtonProps {
  model: LogicalModelEntry
  locked: boolean
  selected: boolean
  onSelect: (id: string) => void
  onLocked: () => void
}

function ModelButton({ model, locked, selected, onSelect, onLocked }: ModelButtonProps) {
  function handleClick() {
    if (locked) {
      onLocked()
    } else {
      onSelect(model.id)
    }
  }

  return (
    <button
      type="button"
      data-testid={`model-option-${model.id}`}
      onClick={handleClick}
      className={[
        'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
        selected
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        locked ? 'opacity-50' : '',
      ].join(' ')}
      title={locked ? '需要配置 API Key — 点击跳转设置' : model.displayName}
      aria-disabled={locked}
    >
      {locked && <Lock size={10} className="shrink-0" aria-hidden="true" />}
      {model.displayName}
    </button>
  )
}

export function LogicalModelPicker({ scenario, value, onChange, className }: Props) {
  const router = useRouter()
  const { unlockedIds, loading } = useUnlockedModels()
  const models = listLogicalModels(scenario)

  function handleLocked() {
    router.push('/settings')
  }

  if (loading) {
    return (
      <div className={`text-xs text-gray-400 ${className ?? ''}`}>加载中...</div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ''}`}>
      {models.map((m) => (
        <ModelButton
          key={m.id}
          model={m}
          locked={!unlockedIds.has(m.id)}
          selected={m.id === value}
          onSelect={onChange}
          onLocked={handleLocked}
        />
      ))}
    </div>
  )
}
