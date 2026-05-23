/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures need
   structural-only stand-ins for CanvasNode/Edge data, not real interfaces. */
import { describe, it, expect } from 'vitest';
import { migrateLegacyExportImageNodes } from '@/stores/canvasStoreMigration';
import type { CanvasNode, CanvasEdge } from '@/features/canvas/domain/canvasNodes';

// 'exportImageNode' is the legacy type string that no longer appears in the
// CanvasNodeType union (Phase 5 removed it). The migration explicitly accepts
// raw strings, so the test fixtures cast through `as unknown as CanvasNode`.

describe('migrateLegacyExportImageNodes', () => {
  it('folds an exportImage result back into its imageEdit parent', () => {
    const nodes: CanvasNode[] = [
      {
        id: 'gen-1',
        type: 'imageNode',
        position: { x: 0, y: 0 },
        data: { imageUrl: null, prompt: 'cat', model: 'm', size: '1024' } as any,
      },
      {
        id: 'res-1',
        type: 'exportImageNode' as unknown as CanvasNode['type'],
        position: { x: 200, y: 0 },
        data: { imageUrl: 'https://example/r.png', resultKind: 'generic' } as any,
      },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'gen-1', target: 'res-1', type: 'disconnectableEdge' } as any,
    ];

    const { nodes: outNodes, edges: outEdges } = migrateLegacyExportImageNodes(nodes, edges);

    expect(outNodes.find((n) => n.id === 'gen-1')?.data).toMatchObject({ imageUrl: 'https://example/r.png' });
    expect(outNodes.find((n) => n.id === 'res-1')).toBeUndefined();
    expect(outEdges.find((e) => e.id === 'e1')).toBeUndefined();
  });

  it('leaves exportImage alone if it has multiple incoming edges (ambiguous)', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'imageNode', position: { x: 0, y: 0 }, data: { imageUrl: null } as any },
      { id: 'b', type: 'imageNode', position: { x: 0, y: 100 }, data: { imageUrl: null } as any },
      { id: 'res', type: 'exportImageNode' as unknown as CanvasNode['type'], position: { x: 200, y: 0 }, data: { imageUrl: 'https://x/r.png' } as any },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'a', target: 'res' } as any,
      { id: 'e2', source: 'b', target: 'res' } as any,
    ];

    const { nodes: outNodes } = migrateLegacyExportImageNodes(nodes, edges);
    expect(outNodes.find((n) => n.id === 'res')).toBeDefined();
  });

  it('leaves exportImage alone if parent is not a recognised generator type', () => {
    const nodes: CanvasNode[] = [
      { id: 'upload', type: 'uploadNode', position: { x: 0, y: 0 }, data: {} as any },
      { id: 'res', type: 'exportImageNode' as unknown as CanvasNode['type'], position: { x: 200, y: 0 }, data: { imageUrl: 'https://x.png' } as any },
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'upload', target: 'res' } as any,
    ];

    const { nodes: outNodes } = migrateLegacyExportImageNodes(nodes, edges);
    expect(outNodes.find((n) => n.id === 'res')).toBeDefined();
  });
});
