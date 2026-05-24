import { canvasNodeDefinitions } from './nodeRegistry';
import type { CanvasNodeType } from './canvasNodes';

/**
 * Returns true iff a connection from `sourceType`'s source-handle to
 * `targetType`'s target-handle is semantically valid based on declared
 * outputDataType / inputDataTypes in the node registry.
 *
 * Widening rule: `image-set` is accepted wherever `image` is accepted —
 * multi-frame producers (storyboardGen, storyboardSplit, videoAnalysis)
 * can feed downstream nodes that expect a single image (each frame is
 * treated independently by the consumer).
 */
export function isValidConnectionByDataType(
  sourceType: CanvasNodeType,
  targetType: CanvasNodeType
): boolean {
  const srcDef = canvasNodeDefinitions[sourceType];
  const tgtDef = canvasNodeDefinitions[targetType];
  if (!srcDef || !tgtDef) return false;
  if (!srcDef.connectivity.sourceHandle) return false;
  if (!tgtDef.connectivity.targetHandle) return false;

  const out = srcDef.connectivity.outputDataType;
  const acceptedIn = tgtDef.connectivity.inputDataTypes;
  if (!out || acceptedIn.length === 0) return false;

  // image-set widens to image at the consumer side
  if (out === 'image-set' && acceptedIn.includes('image')) return true;

  return acceptedIn.includes(out);
}
