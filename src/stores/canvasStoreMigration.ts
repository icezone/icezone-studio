import type { CanvasNode, CanvasEdge } from '@/features/canvas/domain/canvasNodes';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';

const RECOGNISED_PARENT_TYPES = new Set<string>([
  CANVAS_NODE_TYPES.imageEdit,
  CANVAS_NODE_TYPES.storyboardGen,
]);

export function migrateLegacyExportImageNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const incomingByTarget = new Map<string, CanvasEdge[]>();
  for (const e of edges) {
    const arr = incomingByTarget.get(e.target) ?? [];
    arr.push(e);
    incomingByTarget.set(e.target, arr);
  }

  const nodesToDelete = new Set<string>();
  const edgesToDelete = new Set<string>();
  const dataPatches = new Map<string, Partial<CanvasNode['data']>>();

  for (const n of nodes) {
    if (n.type !== CANVAS_NODE_TYPES.exportImage) continue;
    const incoming = incomingByTarget.get(n.id) ?? [];
    if (incoming.length !== 1) continue;
    const parent = nodesById.get(incoming[0].source);
    if (!parent || !RECOGNISED_PARENT_TYPES.has(parent.type as string)) continue;

    const resultImageUrl = (n.data as { imageUrl?: string | null }).imageUrl;
    if (!resultImageUrl) continue;

    nodesToDelete.add(n.id);
    edgesToDelete.add(incoming[0].id);
    dataPatches.set(parent.id, { imageUrl: resultImageUrl } as Partial<CanvasNode['data']>);
  }

  if (nodesToDelete.size === 0) return { nodes, edges };

  const outNodes = nodes
    .filter((n) => !nodesToDelete.has(n.id))
    .map((n) => {
      const patch = dataPatches.get(n.id);
      return patch ? ({ ...n, data: { ...n.data, ...patch } } as CanvasNode) : n;
    });
  const outEdges = edges.filter((e) => !edgesToDelete.has(e.id));

  return { nodes: outNodes, edges: outEdges };
}
