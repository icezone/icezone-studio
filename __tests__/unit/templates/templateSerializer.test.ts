import { describe, it, expect } from 'vitest';
import {
  serializeCanvasToTemplate,
  deserializeTemplateToCanvas,
  exportTemplateAsJsonString,
  importTemplateFromJsonString,
  TEMPLATE_FORMAT_VERSION,
  type WorkflowTemplateData,
} from '@/features/canvas/application/templateSerializer';
import type { CanvasNode, CanvasEdge } from '@/features/canvas/domain/canvasNodes';

function makeImageEditNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'node-1',
    type: 'imageNode',
    position: { x: 100, y: 200 },
    data: {
      displayName: 'My Image',
      prompt: 'a beautiful sunset',
      model: 'grs-ai/flux-1',
      size: '1K' as const,
      requestAspectRatio: '16:9',
      aspectRatio: '16:9',
      extraParams: { quality: 'hd' },
      imageUrl: 'https://example.com/generated.png',
      previewImageUrl: 'https://example.com/preview.png',
      isGenerating: true,
      generationStartedAt: 1700000000,
      generationDurationMs: 5000,
    },
    ...overrides,
  } as CanvasNode;
}

function makeUploadNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'node-2',
    type: 'uploadNode',
    position: { x: 300, y: 100 },
    data: {
      displayName: 'Upload',
      imageUrl: 'https://example.com/upload.png',
      previewImageUrl: 'https://example.com/upload-preview.png',
      aspectRatio: '1:1',
      sourceFileName: 'photo.jpg',
    },
    ...overrides,
  } as CanvasNode;
}

function makeGroupNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'group-1',
    type: 'groupNode',
    position: { x: 50, y: 50 },
    data: {
      displayName: 'My Group',
      label: 'Group',
    },
    ...overrides,
  } as CanvasNode;
}

function makeVideoGenNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'node-3',
    type: 'videoGenNode',
    position: { x: 500, y: 200 },
    data: {
      displayName: 'Video',
      prompt: 'a flying bird',
      model: 'kling/kling-3.0',
      duration: 5,
      aspectRatio: '16:9',
      enableAudio: true,
      seed: 12345,
      extraParams: {},
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      referenceImageUrl: 'https://example.com/ref.jpg',
      startFrameUrl: null,
      endFrameUrl: null,
      isGenerating: false,
      generationStartedAt: null,
      generationDurationMs: 8000,
      jobId: 'job-123',
      errorMessage: 'some error',
    },
    ...overrides,
  } as CanvasNode;
}

function makeEdge(overrides: Partial<CanvasEdge> = {}): CanvasEdge {
  return {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    ...overrides,
  } as CanvasEdge;
}

function makeStoryboardGenNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'node-4',
    type: 'storyboardGenNode',
    position: { x: 200, y: 400 },
    data: {
      displayName: 'Storyboard',
      gridRows: 2,
      gridCols: 3,
      frames: [{ id: 'f1', description: 'Frame 1', referenceIndex: null }],
      model: 'grs-ai/flux-1',
      size: '1K' as const,
      requestAspectRatio: '16:9',
      aspectRatio: '16:9',
      imageUrl: 'https://example.com/storyboard.png',
      previewImageUrl: null,
      isGenerating: false,
      generationStartedAt: null,
    },
    ...overrides,
  } as CanvasNode;
}

describe('TemplateSerializer', () => {
  describe('serializeCanvasToTemplate', () => {
    it('should clear runtime data (imageUrl, isGenerating, etc.)', () => {
      const nodes = [makeImageEditNode()];
      const edges: CanvasEdge[] = [];
      const result = serializeCanvasToTemplate(nodes, edges, {
        name: 'Test',
        description: 'desc',
      });

      const nodeData = result.nodes[0].data as Record<string, unknown>;
      expect(nodeData.imageUrl).toBeNull();
      expect(nodeData.previewImageUrl).toBeNull();
      expect(nodeData.isGenerating).toBe(false);
      expect(nodeData.generationStartedAt).toBeNull();
      expect(nodeData.generationDurationMs).toBeUndefined();
    });

    it('should clear videoUrl, jobId, errorMessage from video nodes', () => {
      const nodes = [makeVideoGenNode()];
      const result = serializeCanvasToTemplate(nodes, [], {
        name: 'Test',
        description: '',
      });

      const nodeData = result.nodes[0].data as Record<string, unknown>;
      expect(nodeData.videoUrl).toBeNull();
      expect(nodeData.thumbnailUrl).toBeNull();
      expect(nodeData.jobId).toBeNull();
      expect(nodeData.errorMessage).toBeNull();
      expect(nodeData.isGenerating).toBe(false);
    });

    it('should preserve structural data (prompt, model, gridRows, etc.)', () => {
      const nodes = [makeImageEditNode(), makeStoryboardGenNode()];
      const result = serializeCanvasToTemplate(nodes, [], {
        name: 'Test',
        description: '',
      });

      const imgData = result.nodes[0].data as Record<string, unknown>;
      expect(imgData.prompt).toBe('a beautiful sunset');
      expect(imgData.model).toBe('grs-ai/flux-1');
      expect(imgData.size).toBe('1K');
      expect(imgData.requestAspectRatio).toBe('16:9');
      expect(imgData.extraParams).toEqual({ quality: 'hd' });

      const storyData = result.nodes[1].data as Record<string, unknown>;
      expect(storyData.gridRows).toBe(2);
      expect(storyData.gridCols).toBe(3);
      expect(storyData.frames).toEqual([{ id: 'f1', description: 'Frame 1', referenceIndex: null }]);
    });

    it('should generate correct metadata', () => {
      const nodes = [makeImageEditNode(), makeUploadNode()];
      const edges = [makeEdge()];
      const result = serializeCanvasToTemplate(nodes, edges, {
        name: 'My Template',
        description: 'A test template',
      });

      expect(result.version).toBe(TEMPLATE_FORMAT_VERSION);
      expect(result.metadata.name).toBe('My Template');
      expect(result.metadata.description).toBe('A test template');
      expect(result.metadata.requiredNodeTypes).toContain('imageNode');
      expect(result.metadata.requiredNodeTypes).toContain('uploadNode');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should compute requiredNodeTypes as unique set', () => {
      const nodes = [makeImageEditNode(), makeImageEditNode({ id: 'node-1b' })];
      const result = serializeCanvasToTemplate(nodes, [], {
        name: 'Test',
        description: '',
      });

      expect(result.metadata.requiredNodeTypes).toEqual(['imageNode']);
    });
  });

  describe('deserializeTemplateToCanvas', () => {
    function makeTemplate(): WorkflowTemplateData {
      return serializeCanvasToTemplate(
        [
          makeImageEditNode(),
          makeUploadNode(),
        ],
        [makeEdge()],
        { name: 'Test', description: '' }
      );
    }

    it('should regenerate all node IDs', () => {
      const template = makeTemplate();
      const originalIds = template.nodes.map((n) => n.id);
      const result = deserializeTemplateToCanvas(template);

      const newIds = result.nodes.map((n) => n.id);
      // All IDs should be different from originals
      newIds.forEach((id, i) => {
        expect(id).not.toBe(originalIds[i]);
      });
      // All new IDs should be unique
      expect(new Set(newIds).size).toBe(newIds.length);
    });

    it('should fix Edge source/target references', () => {
      const template = makeTemplate();
      const result = deserializeTemplateToCanvas(template);

      const edge = result.edges[0];
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(edge.source);
      expect(nodeIds).toContain(edge.target);
      // Edge ID should also be regenerated
      expect(edge.id).not.toBe(template.edges[0].id);
    });

    it('should fix Group parentId references', () => {
      const group = makeGroupNode();
      const child = makeImageEditNode({ id: 'child-1', parentId: 'group-1' });
      const template = serializeCanvasToTemplate(
        [group, child],
        [],
        { name: 'Test', description: '' }
      );

      const result = deserializeTemplateToCanvas(template);
      const groupNode = result.nodes.find((n) => n.type === 'groupNode')!;
      const childNode = result.nodes.find((n) => n.type === 'imageNode')!;

      expect(childNode.parentId).toBe(groupNode.id);
      expect(childNode.parentId).not.toBe('group-1');
    });

    it('should apply position offset', () => {
      const template = makeTemplate();
      const originalPositions = template.nodes.map((n) => ({ ...n.position }));
      const offset = { x: 50, y: 100 };
      const result = deserializeTemplateToCanvas(template, offset);

      result.nodes.forEach((node, i) => {
        expect(node.position.x).toBe(originalPositions[i].x + 50);
        expect(node.position.y).toBe(originalPositions[i].y + 100);
      });
    });

    it('should apply zero offset by default', () => {
      const template = makeTemplate();
      const originalPositions = template.nodes.map((n) => ({ ...n.position }));
      const result = deserializeTemplateToCanvas(template);

      result.nodes.forEach((node, i) => {
        expect(node.position.x).toBe(originalPositions[i].x);
        expect(node.position.y).toBe(originalPositions[i].y);
      });
    });
  });

  describe('JSON Import/Export', () => {
    it('should round-trip preserving structure', () => {
      const template = serializeCanvasToTemplate(
        [makeImageEditNode(), makeUploadNode()],
        [makeEdge()],
        { name: 'Round Trip', description: 'testing' }
      );

      const json = exportTemplateAsJsonString(template);
      const imported = importTemplateFromJsonString(json);

      expect(imported.version).toBe(template.version);
      expect(imported.nodes).toHaveLength(template.nodes.length);
      expect(imported.edges).toHaveLength(template.edges.length);
      expect(imported.metadata.name).toBe(template.metadata.name);
    });

    it('should reject invalid JSON format', () => {
      expect(() => importTemplateFromJsonString('not json')).toThrow();
    });

    it('should reject missing version', () => {
      const invalid = JSON.stringify({ nodes: [], edges: [] });
      expect(() => importTemplateFromJsonString(invalid)).toThrow(/version/i);
    });

    it('should reject incompatible version', () => {
      const invalid = JSON.stringify({
        version: 999,
        nodes: [],
        edges: [],
        metadata: { name: 'x', description: '', requiredNodeTypes: [] },
      });
      expect(() => importTemplateFromJsonString(invalid)).toThrow(/version/i);
    });

    it('should reject missing nodes array', () => {
      const invalid = JSON.stringify({
        version: TEMPLATE_FORMAT_VERSION,
        edges: [],
        metadata: { name: 'x', description: '', requiredNodeTypes: [] },
      });
      expect(() => importTemplateFromJsonString(invalid)).toThrow(/nodes/i);
    });
  });
});
