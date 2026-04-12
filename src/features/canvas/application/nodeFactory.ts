import type { XYPosition } from '@xyflow/react';

import { CANVAS_NODE_TYPES, type CanvasNode, type CanvasNodeData, type CanvasNodeType } from '../domain/canvasNodes';
import type { IdGenerator, NodeCatalog, NodeFactory } from './ports';

const IMAGE_EDIT_NODE_DEFAULT_WIDTH = 560;
const IMAGE_EDIT_NODE_DEFAULT_HEIGHT = 420;
const STORYBOARD_GEN_NODE_DEFAULT_WIDTH = 600;
const STORYBOARD_GEN_NODE_DEFAULT_HEIGHT = 480;
const VIDEO_GEN_NODE_DEFAULT_WIDTH = 560;
const VIDEO_GEN_NODE_DEFAULT_HEIGHT = 420;
const VIDEO_ANALYSIS_NODE_DEFAULT_WIDTH = 560;
const VIDEO_ANALYSIS_NODE_DEFAULT_HEIGHT = 420;
const NOVEL_INPUT_NODE_DEFAULT_WIDTH = 560;
const NOVEL_INPUT_NODE_DEFAULT_HEIGHT = 420;

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

    // Set initial dimensions for nodes that need specific sizes
    if (type === CANVAS_NODE_TYPES.imageEdit) {
      node.style = {
        ...node.style,
        width: IMAGE_EDIT_NODE_DEFAULT_WIDTH,
        height: IMAGE_EDIT_NODE_DEFAULT_HEIGHT,
      };
    } else if (type === CANVAS_NODE_TYPES.storyboardGen) {
      node.style = {
        ...node.style,
        width: STORYBOARD_GEN_NODE_DEFAULT_WIDTH,
        height: STORYBOARD_GEN_NODE_DEFAULT_HEIGHT,
      };
    } else if (type === CANVAS_NODE_TYPES.videoAnalysis) {
      node.style = {
        ...node.style,
        width: VIDEO_ANALYSIS_NODE_DEFAULT_WIDTH,
        height: VIDEO_ANALYSIS_NODE_DEFAULT_HEIGHT,
      };
    } else if (type === CANVAS_NODE_TYPES.videoGen) {
      node.style = {
        ...node.style,
        width: VIDEO_GEN_NODE_DEFAULT_WIDTH,
        height: VIDEO_GEN_NODE_DEFAULT_HEIGHT,
      };
    } else if (type === CANVAS_NODE_TYPES.novelInput) {
      node.style = {
        ...node.style,
        width: NOVEL_INPUT_NODE_DEFAULT_WIDTH,
        height: NOVEL_INPUT_NODE_DEFAULT_HEIGHT,
      };
    }

    return node;
  }
}
