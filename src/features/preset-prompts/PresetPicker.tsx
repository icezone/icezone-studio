'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, Search, X } from 'lucide-react'
import { usePresetPromptsStore } from '@/stores/presetPromptsStore'

interface PresetPickerButtonProps {
  onInsert: (content: string) => void
}

export function PresetPickerButton({ onInsert }: PresetPickerButtonProps) {
  const { t } = useTranslation()
  const { presets } = usePresetPromptsStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const allTags = Array.from(new Set(presets.flatMap((p) => p.tags)))

  const filtered = presets.filter((p) => {
    const matchesTag = activeTag === null || p.tags.includes(activeTag)
    const q = search.toLowerCase()
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
    return matchesTag && matchesSearch
  })

  function handleSelect(content: string) {
    onInsert(content)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={t('presetPrompts.insertPreset')}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)] hover:text-[var(--canvas-node-fg)]"
      >
        <BookmarkIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-72 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--canvas-node-bg)] shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--canvas-node-fg-muted)]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('presetPrompts.searchPlaceholder')}
              className="flex-1 bg-transparent text-xs text-[var(--canvas-node-fg)] outline-none placeholder:text-[var(--canvas-node-fg-muted)]"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X className="h-3 w-3 text-[var(--canvas-node-fg-muted)]" />
              </button>
            )}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-[rgba(255,255,255,0.08)] px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${activeTag === null ? 'bg-accent text-white' : 'bg-[var(--canvas-node-section-bg)] text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)]'}`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                  className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${activeTag === tag ? 'bg-accent text-white' : 'bg-[var(--canvas-node-section-bg)] text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)]'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="max-h-56 overflow-y-auto ui-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[var(--canvas-node-fg-muted)]">
                {t('presetPrompts.noPresets')}
              </p>
            ) : (
              filtered.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset.content)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--canvas-menu-item-hover)] transition-colors"
                >
                  <p className="text-xs font-medium text-[var(--canvas-node-fg)] truncate">{preset.name}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--canvas-node-fg-muted)] line-clamp-2">{preset.content}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
