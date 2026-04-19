import { describe, it, expect, beforeEach } from 'vitest'
import { usePresetPromptsStore } from '@/stores/presetPromptsStore'

beforeEach(() => {
  usePresetPromptsStore.setState({ presets: [] })
})

describe('presetPromptsStore', () => {
  it('adds a preset', () => {
    const { addPreset } = usePresetPromptsStore.getState()
    addPreset({ name: 'Test', content: 'Hello world', tags: ['test'] })
    const next = usePresetPromptsStore.getState().presets
    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('Test')
    expect(next[0].content).toBe('Hello world')
    expect(next[0].tags).toEqual(['test'])
    expect(typeof next[0].id).toBe('string')
    expect(typeof next[0].createdAt).toBe('number')
  })

  it('updates a preset', () => {
    const { addPreset } = usePresetPromptsStore.getState()
    addPreset({ name: 'Old', content: 'Old content', tags: [] })
    const id = usePresetPromptsStore.getState().presets[0].id
    usePresetPromptsStore.getState().updatePreset(id, { name: 'New' })
    expect(usePresetPromptsStore.getState().presets[0].name).toBe('New')
  })

  it('deletes a preset', () => {
    const { addPreset } = usePresetPromptsStore.getState()
    addPreset({ name: 'Delete me', content: 'x', tags: [] })
    const id = usePresetPromptsStore.getState().presets[0].id
    usePresetPromptsStore.getState().deletePreset(id)
    expect(usePresetPromptsStore.getState().presets).toHaveLength(0)
  })
})
