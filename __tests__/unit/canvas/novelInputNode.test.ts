import { describe, it, expect } from 'vitest';
import {
  CANVAS_NODE_TYPES,
  type NovelInputNodeData,
} from '@/features/canvas/domain/canvasNodes';
import {
  canvasNodeDefinitions,
  getMenuNodeDefinitions,
  getNodeDefinition,
  nodeHasSourceHandle,
  nodeHasTargetHandle,
} from '@/features/canvas/domain/nodeRegistry';
import {
  DEFAULT_NODE_DISPLAY_NAME,
} from '@/features/canvas/domain/nodeDisplay';

describe('NovelInputNode registration', () => {
  it('should be registered in CANVAS_NODE_TYPES', () => {
    expect(CANVAS_NODE_TYPES.novelInput).toBe('novelInputNode');
  });

  it('should be registered in canvasNodeDefinitions', () => {
    const def = canvasNodeDefinitions[CANVAS_NODE_TYPES.novelInput];
    expect(def).toBeDefined();
    expect(def.type).toBe('novelInputNode');
  });

  it('should be visible in menu', () => {
    const menuDefs = getMenuNodeDefinitions();
    const novelDef = menuDefs.find((d) => d.type === CANVAS_NODE_TYPES.novelInput);
    expect(novelDef).toBeDefined();
    expect(novelDef!.visibleInMenu).toBe(true);
  });

  it('should only have sourceHandle (no targetHandle)', () => {
    expect(nodeHasSourceHandle(CANVAS_NODE_TYPES.novelInput)).toBe(true);
    expect(nodeHasTargetHandle(CANVAS_NODE_TYPES.novelInput)).toBe(false);
  });

  it('should have correct connectivity', () => {
    const def = getNodeDefinition(CANVAS_NODE_TYPES.novelInput);
    expect(def.connectivity).toEqual({
      sourceHandle: true,
      targetHandle: false,
      outputDataType: 'text',
      inputDataTypes: [],
      connectMenu: {
        fromSource: true,
        fromTarget: false,
      },
    });
  });

  it('should have toolbar capability but not promptInput', () => {
    const def = getNodeDefinition(CANVAS_NODE_TYPES.novelInput);
    expect(def.capabilities).toEqual({
      toolbar: true,
      promptInput: false,
    });
  });

  it('createDefaultData should return empty text and correct defaults', () => {
    const def = getNodeDefinition(CANVAS_NODE_TYPES.novelInput);
    const data = def.createDefaultData() as NovelInputNodeData;

    expect(data.text).toBe('');
    expect(data.textLength).toBe(0);
    expect(data.language).toBe('auto');
    expect(data.maxScenes).toBe(20);
    expect(data.sceneGranularity).toBe('medium');
    expect(data.isAnalyzing).toBe(false);
    expect(data.errorMessage).toBeNull();
    expect(data.characters).toEqual([]);
    expect(data.scenes).toEqual([]);
  });

  it('should have a default display name', () => {
    expect(DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.novelInput]).toBeDefined();
    expect(typeof DEFAULT_NODE_DISPLAY_NAME[CANVAS_NODE_TYPES.novelInput]).toBe('string');
  });

  it('should have menuLabelKey set', () => {
    const def = getNodeDefinition(CANVAS_NODE_TYPES.novelInput);
    expect(def.menuLabelKey).toBe('node.menu.novelInput');
  });
});
