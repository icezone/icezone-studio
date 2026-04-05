import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NovelScene } from '@/features/canvas/domain/canvasNodes';
import { batchGenerateStoryboards } from '@/features/canvas/application/novelToStoryboard';

describe('batchGenerateStoryboards', () => {
  const mockAddNode = vi.fn().mockReturnValue('new-node-id');
  const mockAddEdge = vi.fn().mockReturnValue('new-edge-id');

  const baseNodes = [
    {
      id: 'novel-1',
      type: 'novelInputNode',
      position: { x: 100, y: 200 },
      data: { text: 'some text' },
    },
  ];

  const mockCanvasStore = {
    nodes: baseNodes,
    addNode: mockAddNode,
    addEdge: mockAddEdge,
  };

  const sampleScenes: NovelScene[] = [
    {
      id: 's1',
      order: 1,
      title: 'Scene 1: Rainy Bar',
      summary: 'A detective enters a bar',
      visualPrompt: 'A dimly lit bar in the rain, a man in a trench coat walks in',
      characters: ['detective'],
      location: 'bar',
      mood: 'noir',
      selected: true,
    },
    {
      id: 's2',
      order: 2,
      title: 'Scene 2: Dark Alley',
      summary: 'A chase through an alley',
      visualPrompt: 'A dark alley at midnight, two figures running',
      characters: ['detective', 'suspect'],
      location: 'alley',
      mood: 'tense',
      selected: false,
    },
    {
      id: 's3',
      order: 3,
      title: 'Scene 3: Office',
      summary: 'Evidence review',
      visualPrompt: 'A cluttered police office with documents spread on the desk',
      characters: ['detective'],
      location: 'office',
      mood: 'calm',
      selected: true,
    },
  ];

  beforeEach(() => {
    mockAddNode.mockClear();
    mockAddEdge.mockClear();
    mockAddNode.mockReturnValue('new-node-id');
  });

  it('creates storyboardGenNode for each selected scene', () => {
    batchGenerateStoryboards('novel-1', sampleScenes, mockCanvasStore);

    // Only 2 scenes are selected (s1 and s3)
    expect(mockAddNode).toHaveBeenCalledTimes(2);

    // First call should be for Scene 1
    const firstCall = mockAddNode.mock.calls[0];
    expect(firstCall[0]).toBe('storyboardGenNode');
    expect(firstCall[2]).toMatchObject({
      displayName: 'Scene 1: Rainy Bar',
    });

    // Second call should be for Scene 3
    const secondCall = mockAddNode.mock.calls[1];
    expect(secondCall[0]).toBe('storyboardGenNode');
    expect(secondCall[2]).toMatchObject({
      displayName: 'Scene 3: Office',
    });
  });

  it('creates edge connections from novel node to each storyboard node', () => {
    batchGenerateStoryboards('novel-1', sampleScenes, mockCanvasStore);

    // 2 edges for 2 selected scenes
    expect(mockAddEdge).toHaveBeenCalledTimes(2);

    // Each edge should connect from the novel node
    for (const call of mockAddEdge.mock.calls) {
      expect(call[0]).toBe('novel-1');
      expect(call[1]).toBe('new-node-id');
    }
  });

  it('positions new nodes in a vertical stack from source', () => {
    batchGenerateStoryboards('novel-1', sampleScenes, mockCanvasStore);

    const firstPos = mockAddNode.mock.calls[0][1];
    const secondPos = mockAddNode.mock.calls[1][1];

    // Should be offset to the right of the novel node
    expect(firstPos.x).toBe(100 + 400);
    expect(secondPos.x).toBe(100 + 400);

    // Should be vertically stacked with spacing
    expect(secondPos.y).toBeGreaterThan(firstPos.y);
    expect(secondPos.y - firstPos.y).toBe(300);
  });

  it('fills visualPrompt into frame descriptions', () => {
    batchGenerateStoryboards('novel-1', sampleScenes, mockCanvasStore);

    // Check that the frames contain the visual prompt as description
    const firstData = mockAddNode.mock.calls[0][2];
    expect(firstData.frames).toBeDefined();
    expect(firstData.frames.length).toBeGreaterThan(0);
    expect(firstData.frames[0].description).toBe(
      'A dimly lit bar in the rain, a man in a trench coat walks in'
    );
  });

  it('does nothing when novel node is not found', () => {
    const storeWithoutNode = {
      ...mockCanvasStore,
      nodes: [],
    };

    batchGenerateStoryboards('nonexistent', sampleScenes, storeWithoutNode);

    expect(mockAddNode).not.toHaveBeenCalled();
    expect(mockAddEdge).not.toHaveBeenCalled();
  });

  it('does nothing when no scenes are selected', () => {
    const noSelectedScenes = sampleScenes.map((s) => ({ ...s, selected: false }));
    batchGenerateStoryboards('novel-1', noSelectedScenes, mockCanvasStore);

    expect(mockAddNode).not.toHaveBeenCalled();
    expect(mockAddEdge).not.toHaveBeenCalled();
  });
});
