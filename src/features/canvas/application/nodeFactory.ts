import type { XYPosition } from '@xyflow/react';

import { CANVAS_NODE_TYPES, type CanvasNode, type CanvasNodeData, type CanvasNodeType } from '../domain/canvasNodes';
import type { IdGenerator, NodeCatalog, NodeFactory } from './ports';

const IMAGE_EDIT_NODE_DEFAULT_WIDTH = 640;
const IMAGE_EDIT_NODE_DEFAULT_HEIGHT = 420;
const STORYBOARD_GEN_NODE_DEFAULT_WIDTH = 600;
const STORYBOARD_GEN_NODE_DEFAULT_HEIGHT = 480;

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
    }

    return node;
  }
}
