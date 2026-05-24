import type { XYPosition } from '@xyflow/react';

import { CANVAS_NODE_TYPES, type CanvasNode, type CanvasNodeData, type CanvasNodeType } from '../domain/canvasNodes';
import type { IdGenerator, NodeCatalog, NodeFactory } from './ports';

// Width defaults — height is intentionally NOT set so React Flow measures the
// container from content. This means collapsed split-layout nodes only occupy
// the preview card's natural height (~150px) instead of a fixed 420px box that
// would block other nodes/canvas pan in the empty area below.
const IMAGE_EDIT_NODE_DEFAULT_WIDTH = 560;
const STORYBOARD_GEN_NODE_DEFAULT_WIDTH = 600;
const VIDEO_GEN_NODE_DEFAULT_WIDTH = 560;
const VIDEO_ANALYSIS_NODE_DEFAULT_WIDTH = 560;
const NOVEL_INPUT_NODE_DEFAULT_WIDTH = 560;

export class CanvasNodeFactory implements NodeFactory {
  constructor(
    private readonly idGenerator: IdGenerator,
    private readonly nodeCatalog: NodeCatalog
  ) {}

  createNode(
    type: CanvasNodeType,
    position: XYPosition,
    data: Partial<CanvasNodeData> = {}
  ): CanvasNode {
    const definition = this.nodeCatalog.getDefinition(type);
    const nodeData = {
      ...definition.createDefaultData(),
      ...data,
    } as CanvasNodeData;

    const node: CanvasNode = {
      id: this.idGenerator.next(),
      type,
      position,
      data: nodeData,
    };

    // Set initial WIDTH for nodes that need specific sizes — height is left
    // unset so React Flow measures it from content (preview-card when
    // collapsed, preview + settings panel when expanded).
    if (type === CANVAS_NODE_TYPES.imageEdit) {
      node.style = { ...node.style, width: IMAGE_EDIT_NODE_DEFAULT_WIDTH };
    } else if (type === CANVAS_NODE_TYPES.storyboardGen) {
      node.style = { ...node.style, width: STORYBOARD_GEN_NODE_DEFAULT_WIDTH };
    } else if (type === CANVAS_NODE_TYPES.videoAnalysis) {
      node.style = { ...node.style, width: VIDEO_ANALYSIS_NODE_DEFAULT_WIDTH };
    } else if (type === CANVAS_NODE_TYPES.videoGen) {
      node.style = { ...node.style, width: VIDEO_GEN_NODE_DEFAULT_WIDTH };
    } else if (type === CANVAS_NODE_TYPES.novelInput) {
      node.style = { ...node.style, width: NOVEL_INPUT_NODE_DEFAULT_WIDTH };
    }

    // Split-layout nodes have a fixed node-container size that's bigger than the
    // visible preview card when collapsed. Restrict drag-from-empty-area by
    // limiting drag triggers to the actual visible parts (preview area when
    // collapsed, plus the settings panel when expanded).
    const SPLIT_LAYOUT_TYPES: CanvasNodeType[] = [
      CANVAS_NODE_TYPES.imageEdit,
      CANVAS_NODE_TYPES.storyboardGen,
      CANVAS_NODE_TYPES.videoAnalysis,
      CANVAS_NODE_TYPES.videoGen,
      CANVAS_NODE_TYPES.storyboardSplit,
    ];
    if (SPLIT_LAYOUT_TYPES.includes(type)) {
      node.dragHandle = '.node-preview-area, .node-settings-panel';
    }

    return node;
  }
}
