import type { CanvasNode, CanvasEdge } from '../domain/canvasNodes';

// ─── Types ───────────────────────────────────────────────────────────

export const TEMPLATE_FORMAT_VERSION = 1;

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  parentId?: string;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
}

export interface WorkflowTemplateMetadata {
  name: string;
  description: string;
  author?: string;
  createdWith?: string;
  requiredNodeTypes: string[];
}

export interface WorkflowTemplateData {
  version: number;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  metadata: WorkflowTemplateMetadata;
}

// ─── Runtime fields to clear ─────────────────────────────────────────

/** Fields that hold generated/runtime content and should be nulled out */
const RUNTIME_NULL_FIELDS = [
  'imageUrl',
  'previewImageUrl',
  'videoUrl',
  'thumbnailUrl',
  'referenceImageUrl',
  'startFrameUrl',
  'endFrameUrl',
  'jobId',
  'errorMessage',
  'generationStartedAt',
] as const;

/** Fields that hold runtime boolean state and should be set to false */
const RUNTIME_FALSE_FIELDS = ['isGenerating'] as const;

/** Fields that hold runtime transient data and should be removed entirely */
const RUNTIME_DELETE_FIELDS = [
  'generationDurationMs',
  'analysisProgress',
] as const;

// ─── Serialize ───────────────────────────────────────────────────────

export function serializeCanvasToTemplate(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  metadata: { name: string; description: string }
): WorkflowTemplateData {
  // Deep copy nodes to avoid mutation
  const serializedNodes: SerializedNode[] = nodes.map((node) => {
    const data = structuredClone(node.data) as Record<string, unknown>;

    // Clear runtime fields
    for (const field of RUNTIME_NULL_FIELDS) {
      if (field in data) {
        data[field] = null;
      }
    }
    for (const field of RUNTIME_FALSE_FIELDS) {
      if (field in data) {
        data[field] = false;
      }
    }
    for (const field of RUNTIME_DELETE_FIELDS) {
      delete data[field];
    }

    const serialized: SerializedNode = {
      id: node.id,
      type: node.type!,
      position: { x: node.position.x, y: node.position.y },
      data,
    };

    if (node.width != null) serialized.width = node.width;
    if (node.height != null) serialized.height = node.height;
    if (node.parentId != null) serialized.parentId = node.parentId;

    return serialized;
  });

  // Deep copy edges
  const serializedEdges: SerializedEdge[] = edges.map((edge) => {
    const se: SerializedEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
    };
    if (edge.sourceHandle != null) se.sourceHandle = edge.sourceHandle;
    if (edge.targetHandle != null) se.targetHandle = edge.targetHandle;
    if (edge.type != null) se.type = edge.type;
    return se;
  });

  // Compute unique required node types
  const requiredNodeTypes = [...new Set(serializedNodes.map((n) => n.type))];

  return {
    version: TEMPLATE_FORMAT_VERSION,
    nodes: serializedNodes,
    edges: serializedEdges,
    metadata: {
      name: metadata.name,
      description: metadata.description,
      createdWith: '0.1.0',
      requiredNodeTypes,
    },
  };
}

// ─── Deserialize ─────────────────────────────────────────────────────

export function deserializeTemplateToCanvas(
  template: WorkflowTemplateData,
  offsetPosition?: { x: number; y: number }
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const offset = offsetPosition ?? { x: 0, y: 0 };

  // Build old-id -> new-id mapping
  const idMap = new Map<string, string>();
  for (const node of template.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }

  // Regenerate nodes with new IDs and position offset
  const nodes: CanvasNode[] = template.nodes.map((sn) => {
    const newId = idMap.get(sn.id)!;
    const node: Record<string, unknown> = {
      id: newId,
      type: sn.type,
      position: {
        x: sn.position.x + offset.x,
        y: sn.position.y + offset.y,
      },
      data: structuredClone(sn.data),
    };

    if (sn.width != null) node.width = sn.width;
    if (sn.height != null) node.height = sn.height;

    // Fix parentId reference
    if (sn.parentId != null && idMap.has(sn.parentId)) {
      node.parentId = idMap.get(sn.parentId);
    }

    return node as CanvasNode;
  });

  // Regenerate edges with new IDs and fixed references
  const edges: CanvasEdge[] = template.edges.map((se) => {
    const edge: Record<string, unknown> = {
      id: crypto.randomUUID(),
      source: idMap.get(se.source) ?? se.source,
      target: idMap.get(se.target) ?? se.target,
    };
    if (se.sourceHandle != null) edge.sourceHandle = se.sourceHandle;
    if (se.targetHandle != null) edge.targetHandle = se.targetHandle;
    if (se.type != null) edge.type = se.type;
    return edge as CanvasEdge;
  });

  return { nodes, edges };
}

// ─── JSON Import / Export ────────────────────────────────────────────

export function exportTemplateAsJsonString(template: WorkflowTemplateData): string {
  return JSON.stringify(template, null, 2);
}

export function importTemplateFromJsonString(json: string): WorkflowTemplateData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid template: expected an object');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.version == null) {
    throw new Error('Invalid template: missing version field');
  }

  if (obj.version !== TEMPLATE_FORMAT_VERSION) {
    throw new Error(
      `Incompatible template version: expected ${TEMPLATE_FORMAT_VERSION}, got ${obj.version}`
    );
  }

  if (!Array.isArray(obj.nodes)) {
    throw new Error('Invalid template: missing nodes array');
  }

  if (!Array.isArray(obj.edges)) {
    throw new Error('Invalid template: missing edges array');
  }

  return parsed as WorkflowTemplateData;
}

// ─── File helpers (browser only) ─────────────────────────────────────

export function downloadTemplateAsFile(template: WorkflowTemplateData, filename?: string): void {
  const json = exportTemplateAsJsonString(template);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${template.metadata.name || 'template'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importTemplateFromFile(file: File): Promise<WorkflowTemplateData> {
  const text = await file.text();
  return importTemplateFromJsonString(text);
}
