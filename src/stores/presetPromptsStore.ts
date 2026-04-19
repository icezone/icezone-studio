import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export interface PresetPrompt {
  id: string
  name: string
  content: string
  tags: string[]
  createdAt: number
}

interface PresetPromptsState {
  presets: PresetPrompt[]
  addPreset: (input: Omit<PresetPrompt, 'id' | 'createdAt'>) => void
  updatePreset: (id: string, patch: Partial<Omit<PresetPrompt, 'id' | 'createdAt'>>) => void
  deletePreset: (id: string) => void
}

export const usePresetPromptsStore = create<PresetPromptsState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (input) =>
        set((state) => ({
          presets: [...state.presets, { ...input, id: nanoid(), createdAt: Date.now() }],
        })),
      updatePreset: (id, patch) =>
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    { name: 'preset-prompts-storage', version: 1 }
  )
)
