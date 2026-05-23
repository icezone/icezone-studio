import {
  CANVAS_NODE_TYPES,
  type CanvasNodeData,
  type CanvasNodeType,
} from './canvasNodes';

export type TranslateFn = (key: string) => string;

/** Hardcoded fallback names (Chinese) — used in non-React contexts (store, registry). */
export const DEFAULT_NODE_DISPLAY_NAME: Record<CanvasNodeType, string> = {
  [CANVAS_NODE_TYPES.upload]: '上传图片',
  [CANVAS_NODE_TYPES.imageEdit]: 'AI 图片',
  [CANVAS_NODE_TYPES.textAnnotation]: '文本注释',
  [CANVAS_NODE_TYPES.group]: '分组',
  [CANVAS_NODE_TYPES.storyboardSplit]: '切割结果',
  [CANVAS_NODE_TYPES.storyboardGen]: '分镜生成',
  [CANVAS_NODE_TYPES.videoGen]: 'AI 视频',
  [CANVAS_NODE_TYPES.novelInput]: '小说/剧本输入',
  [CANVAS_NODE_TYPES.videoAnalysis]: '视频分析',
};

/** i18n key map for node display names. */
const NODE_DISPLAY_NAME_I18N_KEY: Record<CanvasNodeType, string> = {
  [CANVAS_NODE_TYPES.upload]: 'nodeDisplayName.upload',
  [CANVAS_NODE_TYPES.imageEdit]: 'nodeDisplayName.imageEdit',
  [CANVAS_NODE_TYPES.textAnnotation]: 'nodeDisplayName.textAnnotation',
  [CANVAS_NODE_TYPES.group]: 'nodeDisplayName.group',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'nodeDisplayName.storyboardSplit',
  [CANVAS_NODE_TYPES.storyboardGen]: 'nodeDisplayName.storyboardGen',
  [CANVAS_NODE_TYPES.videoGen]: 'nodeDisplayName.videoGen',
  [CANVAS_NODE_TYPES.novelInput]: 'nodeDisplayName.novelInput',
  [CANVAS_NODE_TYPES.videoAnalysis]: 'nodeDisplayName.videoAnalysis',
};

/** Set of all hardcoded Chinese default names — used to detect "is this still a default?" */
const ALL_HARDCODED_DEFAULTS = new Set<string>(Object.values(DEFAULT_NODE_DISPLAY_NAME));

export function getDefaultNodeDisplayName(type: CanvasNodeType, _data: Partial<CanvasNodeData>, t?: TranslateFn): string {
  if (t) return t(NODE_DISPLAY_NAME_I18N_KEY[type]);
  return DEFAULT_NODE_DISPLAY_NAME[type];
}

export function resolveNodeDisplayName(type: CanvasNodeType, data: Partial<CanvasNodeData>, t?: TranslateFn): string {
  const customTitle = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (customTitle && !ALL_HARDCODED_DEFAULTS.has(customTitle)) {
    return customTitle;
  }

  if (type === CANVAS_NODE_TYPES.group) {
    const legacyLabel = typeof (data as { label?: string }).label === 'string'
      ? (data as { label?: string }).label?.trim()
      : '';
    if (legacyLabel && !ALL_HARDCODED_DEFAULTS.has(legacyLabel)) {
      return legacyLabel;
    }
  }

  return getDefaultNodeDisplayName(type, data, t);
}

export function isNodeUsingDefaultDisplayName(type: CanvasNodeType, data: Partial<CanvasNodeData>): boolean {
  const customTitle = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (!customTitle || ALL_HARDCODED_DEFAULTS.has(customTitle)) {
    return true;
  }
  return customTitle === getDefaultNodeDisplayName(type, data);
}
