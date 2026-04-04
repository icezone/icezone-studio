import { describe, it, expect } from 'vitest'
import type { StoryboardGenFrameItem } from '@/features/canvas/domain/canvasNodes'
import { createDefaultStoryboardGenFrame } from '@/features/canvas/domain/canvasNodes'

describe('StoryboardGenFrameItem Enhancement', () => {
  it('should support startFrameUrl and endFrameUrl', () => {
    const frame: StoryboardGenFrameItem = {
      id: 'frame-1',
      description: 'test frame',
      referenceIndex: null,
      startFrameUrl: 'https://example.com/start.png',
      endFrameUrl: 'https://example.com/end.png',
    }
    expect(frame.startFrameUrl).toBe('https://example.com/start.png')
    expect(frame.endFrameUrl).toBe('https://example.com/end.png')
  })

  it('should support referenceImageUrls array', () => {
    const frame: StoryboardGenFrameItem = {
      id: 'frame-2',
      description: 'multi-ref frame',
      referenceIndex: null,
      referenceImageUrls: [
        'https://example.com/ref1.png',
        'https://example.com/ref2.png',
        'https://example.com/ref3.png',
      ],
    }
    expect(frame.referenceImageUrls).toHaveLength(3)
    expect(frame.referenceImageUrls![0]).toBe('https://example.com/ref1.png')
  })

  it('should support referenceWeights array', () => {
    const frame: StoryboardGenFrameItem = {
      id: 'frame-3',
      description: 'weighted refs',
      referenceIndex: null,
      referenceImageUrls: ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
      referenceWeights: [0.8, 0.5],
    }
    expect(frame.referenceWeights).toHaveLength(2)
    expect(frame.referenceWeights![0]).toBe(0.8)
    expect(frame.referenceWeights![1]).toBe(0.5)
  })

  it('should default startFrameMode to none', () => {
    const frame = createDefaultStoryboardGenFrame()
    expect(frame.startFrameMode).toBe('none')
  })

  it('should default endFrameMode to none', () => {
    const frame = createDefaultStoryboardGenFrame()
    expect(frame.endFrameMode).toBe('none')
  })

  it('should support startFrameMode and endFrameMode values', () => {
    const frameRef: StoryboardGenFrameItem = {
      id: 'frame-4',
      description: 'mode test',
      referenceIndex: null,
      startFrameMode: 'reference',
      endFrameMode: 'strict',
    }
    expect(frameRef.startFrameMode).toBe('reference')
    expect(frameRef.endFrameMode).toBe('strict')
  })

  it('should have null/undefined optional fields by default', () => {
    const frame = createDefaultStoryboardGenFrame()
    expect(frame.startFrameUrl).toBeUndefined()
    expect(frame.endFrameUrl).toBeUndefined()
    expect(frame.referenceImageUrls).toBeUndefined()
    expect(frame.referenceWeights).toBeUndefined()
  })
})
