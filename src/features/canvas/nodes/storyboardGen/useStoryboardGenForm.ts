// src/features/canvas/nodes/storyboardGen/useStoryboardGenForm.ts
import {
  useMemo,
  useState,
  useRef,
  useEffect,
  type RefObject,
  type MutableRefObject,
} from 'react';
import type React from 'react';
import {
  AUTO_REQUEST_ASPECT_RATIO,
  CANVAS_NODE_TYPES,
  DEFAULT_ASPECT_RATIO,
  type StoryboardRatioControlMode,
  type StoryboardGenNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { graphImageResolver } from '@/features/canvas/application/canvasServices';
import { resolveImageDisplayUrl, parseAspectRatio } from '@/features/canvas/application/imageData';
import { type BatchProgress } from '@/features/canvas/application/storyboardBatchGenerate';
import {
  DEFAULT_IMAGE_MODEL_ID,
  getImageModel,
  listImageModels,
  resolveImageModelResolution,
  resolveImageModelResolutions,
  type ImageModelDefinition,
} from '@/features/canvas/models';
import { GRSAI_NANO_BANANA_PRO_MODEL_ID } from '@/features/canvas/models/image/grsai/nanoBananaPro';
import { useTranslation } from 'react-i18next';
import { findReferenceTokens } from '@/features/canvas/application/referenceTokenEditing';

// ─── Exported types ──────────────────────────────────────────────────────────

export interface AspectRatioChoice {
  value: string;
  label: string;
}

export interface PickerAnchor {
  left: number;
  top: number;
}

export interface IncomingImageItem {
  imageUrl: string;
  displayUrl: string;
  label: string;
}

// ─── Module-level constants needed by the hook ───────────────────────────────

const PICKER_FALLBACK_ANCHOR: PickerAnchor = { left: 8, top: 8 };

const STORYBOARD_NODE_HORIZONTAL_PADDING_PX = 24;
const STORYBOARD_GRID_GAP_PX = 2;
const STORYBOARD_GRID_BASE_CELL_HEIGHT_PX = 140;
const STORYBOARD_GRID_MAX_WIDTH_PX = 660;
const STORYBOARD_CONTROL_ROW_WIDTH_PX = 274;
const STORYBOARD_PARAMS_ROW_WIDTH_PX = 320;
const STORYBOARD_GEN_NODE_MIN_WIDTH_PX = 600;
const STORYBOARD_GEN_NODE_MIN_HEIGHT_PX = 480;
const FRAME_GRID_GAP_PX = 2;
const CONTROL_ROW_HEIGHT_PX = 20;
const CONTROL_ROW_MARGIN_BOTTOM_PX = 10;
const FRAME_GRID_MARGIN_BOTTOM_PX = 8;
const PARAM_ROW_HEIGHT_PX = 20;
const NODE_VERTICAL_PADDING_PX = 24;
const FRAME_CELL_MIN_WIDTH_PX = 24;
const FRAME_CELL_MIN_HEIGHT_PX = 16;

const AUTO_ASPECT_RATIO_OPTION: AspectRatioChoice = {
  value: AUTO_REQUEST_ASPECT_RATIO,
  label: '自动',
};

const FRIENDLY_ASPECT_RATIO_CANDIDATES = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function buildFrameDescriptionDrafts(
  frames: StoryboardGenNodeData['frames']
): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const frame of frames) {
    drafts[frame.id] = frame.description;
  }
  return drafts;
}

function areFrameDescriptionDraftsEqual(
  left: Record<string, string>,
  right: Record<string, string>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  for (const [key, value] of leftEntries) {
    if (right[key] !== value) {
      return false;
    }
  }

  return true;
}

function pickClosestAspectRatio(targetRatio: number, candidates: string[]): string {
  let bestCandidate = candidates[0] ?? '1:1';
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const candidateRatio = parseAspectRatio(candidate);
    const distance = Math.abs(Math.log(candidateRatio / targetRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function ratioValueToAspectRatioString(ratioValue: number): string {
  const snapped = pickClosestAspectRatio(ratioValue, FRIENDLY_ASPECT_RATIO_CANDIDATES);
  const [snappedW = '16', snappedH = '9'] = snapped.split(':');
  const snappedValue = parseFloat(snappedW) / parseFloat(snappedH);
  const snapDistance = Math.abs(Math.log(snappedValue / ratioValue));
  if (snapDistance <= Math.log(1.04)) {
    return snapped;
  }
  if (ratioValue >= 1) {
    return `${ratioValue.toFixed(2)}:1`;
  }
  return `1:${(1 / ratioValue).toFixed(2)}`;
}

function resolveStoryboardAspectRatios(
  mode: StoryboardRatioControlMode,
  controlRatioValue: number,
  rows: number,
  cols: number
): {
  cellRatioValue: number;
  overallRatioValue: number;
  cellAspectRatio: string;
  overallAspectRatio: string;
  cellAspectRatioLabel: string;
  overallAspectRatioLabel: string;
} {
  let cellRatioValue: number;
  let overallRatioValue: number;

  const safeRatio = Number.isFinite(controlRatioValue) && controlRatioValue > 0
    ? controlRatioValue
    : 16 / 9;
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);

  if (mode === 'overall') {
    overallRatioValue = safeRatio;
    cellRatioValue = (safeCols / safeRows) * safeRatio;
  } else {
    cellRatioValue = safeRatio;
    overallRatioValue = (safeRows / safeCols) * safeRatio;
  }

  function formatFriendlyAspectRatioLocal(ratioVal: number): string {
    if (!Number.isFinite(ratioVal) || ratioVal <= 0) {
      return DEFAULT_ASPECT_RATIO;
    }
    const snapped = pickClosestAspectRatio(ratioVal, FRIENDLY_ASPECT_RATIO_CANDIDATES);
    const [snW = '16', snH = '9'] = snapped.split(':');
    const snappedValue = parseFloat(snW) / parseFloat(snH);
    const snapDistance = Math.abs(Math.log(snappedValue / ratioVal));
    if (snapDistance <= Math.log(1.04)) {
      return snapped;
    }
    if (ratioVal >= 1) {
      return `${ratioVal.toFixed(2)}:1`;
    }
    return `1:${(1 / ratioVal).toFixed(2)}`;
  }

  return {
    cellRatioValue,
    overallRatioValue,
    cellAspectRatio: ratioValueToAspectRatioString(cellRatioValue),
    overallAspectRatio: ratioValueToAspectRatioString(overallRatioValue),
    cellAspectRatioLabel: formatFriendlyAspectRatioLocal(cellRatioValue),
    overallAspectRatioLabel: formatFriendlyAspectRatioLocal(overallRatioValue),
  };
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseStoryboardGenFormArgs {
  id: string;
  data: StoryboardGenNodeData;
  selected: boolean | undefined;
}

export interface UseStoryboardGenFormResult {
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  batchProgress: BatchProgress | null;
  setBatchProgress: React.Dispatch<React.SetStateAction<BatchProgress | null>>;

  rootRef: RefObject<HTMLDivElement | null>;
  activeFrameTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  frameTextareaRefs: MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  frameHighlightRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  lastPointerAnchorRef: MutableRefObject<{ frameIndex: number; anchor: PickerAnchor } | null>;

  activeReferenceEditorFrameIndex: number | null;
  setActiveReferenceEditorFrameIndex: React.Dispatch<React.SetStateAction<number | null>>;
  activeFrameControlEditorFrameIndex: number | null;
  setActiveFrameControlEditorFrameIndex: React.Dispatch<React.SetStateAction<number | null>>;

  showImagePicker: boolean;
  setShowImagePicker: React.Dispatch<React.SetStateAction<boolean>>;
  pickerFrameIndex: number | null;
  setPickerFrameIndex: React.Dispatch<React.SetStateAction<number | null>>;
  pickerCursor: number | null;
  setPickerCursor: React.Dispatch<React.SetStateAction<number | null>>;
  pickerActiveIndex: number;
  setPickerActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  pickerAnchor: PickerAnchor;
  setPickerAnchor: React.Dispatch<React.SetStateAction<PickerAnchor>>;

  frameDescriptionDrafts: Record<string, string>;
  setFrameDescriptionDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  frameDescriptionDraftsRef: MutableRefObject<Record<string, string>>;

  resolvedTitle: string;
  incomingImages: string[];
  incomingImageItems: IncomingImageItem[];
  incomingImageViewerList: string[];
  imageModels: ImageModelDefinition[];
  selectedModel: ImageModelDefinition;
  effectiveExtraParams: Record<string, unknown>;
  resolutionOptions: AspectRatioChoice[];
  selectedResolution: AspectRatioChoice;
  aspectRatioOptions: AspectRatioChoice[];
  selectedAspectRatio: AspectRatioChoice;
  controlAspectRatioValue: string;
  resolvedAspectRatios: ReturnType<typeof resolveStoryboardAspectRatios>;
  baseFrameLayout: { nodeWidth: number; nodeHeight: number };
  supportedAspectRatioValues: string[];
  mappedOverallRequestAspectRatio: string;
  totalFrames: number;
}

// ─── Hook implementation ──────────────────────────────────────────────────────

export function useStoryboardGenForm({
  id,
  data,
}: UseStoryboardGenFormArgs): UseStoryboardGenFormResult {
  const { t } = useTranslation();
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const grsaiNanoBananaProModel = useSettingsStore((state) => state.grsaiNanoBananaProModel);
  const showStoryboardGenAdvancedRatioControls = useSettingsStore(
    (state) => state.showStoryboardGenAdvancedRatioControls
  );

  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeFrameTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeReferenceEditorFrameIndex, setActiveReferenceEditorFrameIndex] = useState<number | null>(null);
  const [activeFrameControlEditorFrameIndex, setActiveFrameControlEditorFrameIndex] = useState<number | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerFrameIndex, setPickerFrameIndex] = useState<number | null>(null);
  const [pickerCursor, setPickerCursor] = useState<number | null>(null);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor>(PICKER_FALLBACK_ANCHOR);
  const lastPointerAnchorRef = useRef<{ frameIndex: number; anchor: PickerAnchor } | null>(null);
  const frameTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const frameHighlightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const nodeData = data as StoryboardGenNodeData;
  const [frameDescriptionDrafts, setFrameDescriptionDrafts] = useState<Record<string, string>>(() =>
    buildFrameDescriptionDrafts(nodeData.frames)
  );
  const frameDescriptionDraftsRef = useRef(frameDescriptionDrafts);
  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.storyboardGen, nodeData, t),
    [nodeData, t]
  );

  const incomingImages = useMemo(
    () => graphImageResolver.collectInputImages(id, nodes, edges),
    [id, nodes, edges]
  );
  const incomingImageItems = useMemo(
    () =>
      incomingImages.map((imageUrl, index) => ({
        imageUrl,
        displayUrl: resolveImageDisplayUrl(imageUrl),
        label: `图${index + 1}`,
      })),
    [incomingImages]
  );
  const incomingImageViewerList = useMemo(
    () => incomingImageItems.map((item) => resolveImageDisplayUrl(item.imageUrl)),
    [incomingImageItems]
  );

  const imageModels = useMemo(() => listImageModels(), []);

  const selectedModel = useMemo(() => {
    const modelId = nodeData.model ?? DEFAULT_IMAGE_MODEL_ID;
    return getImageModel(modelId);
  }, [nodeData.model]);
  const effectiveExtraParams = useMemo(
    () => ({
      ...(nodeData.extraParams ?? {}),
      ...(selectedModel.id === GRSAI_NANO_BANANA_PRO_MODEL_ID
        ? { grsai_pro_model: grsaiNanoBananaProModel }
        : {}),
    }),
    [grsaiNanoBananaProModel, nodeData.extraParams, selectedModel.id]
  );
  const resolutionOptions = useMemo(
    () => resolveImageModelResolutions(selectedModel, { extraParams: effectiveExtraParams }),
    [effectiveExtraParams, selectedModel]
  );

  const selectedResolution = useMemo((): AspectRatioChoice => {
    return resolveImageModelResolution(selectedModel, nodeData.size, {
      extraParams: effectiveExtraParams,
    });
  }, [effectiveExtraParams, nodeData.size, selectedModel]);

  const aspectRatioOptions = useMemo<AspectRatioChoice[]>(
    () => [AUTO_ASPECT_RATIO_OPTION, ...selectedModel.aspectRatios],
    [selectedModel.aspectRatios]
  );

  const selectedAspectRatio = useMemo((): AspectRatioChoice => {
    const nodeAspectRatio = nodeData.requestAspectRatio;
    const found = nodeAspectRatio ? aspectRatioOptions.find((item) => item.value === nodeAspectRatio) : undefined;
    return found ?? AUTO_ASPECT_RATIO_OPTION;
  }, [aspectRatioOptions, nodeData.requestAspectRatio]);

  const ratioControlMode: StoryboardRatioControlMode = showStoryboardGenAdvancedRatioControls
    ? (nodeData.ratioControlMode === 'overall' ? 'overall' : 'cell')
    : 'cell';
  const controlAspectRatioValue = useMemo(() => {
    if (selectedAspectRatio.value === AUTO_REQUEST_ASPECT_RATIO) {
      return nodeData.aspectRatio || DEFAULT_ASPECT_RATIO;
    }
    return selectedAspectRatio.value || DEFAULT_ASPECT_RATIO;
  }, [nodeData.aspectRatio, selectedAspectRatio.value]);
  const resolvedAspectRatios = useMemo(
    () => resolveStoryboardAspectRatios(
      ratioControlMode,
      parseAspectRatio(controlAspectRatioValue),
      nodeData.gridRows,
      nodeData.gridCols
    ),
    [controlAspectRatioValue, nodeData.gridCols, nodeData.gridRows, ratioControlMode]
  );
  const frameAspectRatioValue = resolvedAspectRatios.cellAspectRatio;

  const baseFrameLayout = useMemo(() => {
    const aspectRatio = Math.max(0.1, parseAspectRatio(frameAspectRatioValue));
    let cellWidth = STORYBOARD_GRID_BASE_CELL_HEIGHT_PX * aspectRatio;
    let gridWidth = nodeData.gridCols * cellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;

    if (gridWidth > STORYBOARD_GRID_MAX_WIDTH_PX) {
      const scale = STORYBOARD_GRID_MAX_WIDTH_PX / gridWidth;
      cellWidth *= scale;
      gridWidth =
        nodeData.gridCols * cellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;
    }

    const roundedCellWidth = Math.max(FRAME_CELL_MIN_WIDTH_PX, Math.round(cellWidth));
    const roundedCellHeight = Math.max(FRAME_CELL_MIN_HEIGHT_PX, Math.round(roundedCellWidth / aspectRatio));
    const roundedGridWidth =
      nodeData.gridCols * roundedCellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;
    const roundedGridHeight =
      nodeData.gridRows * roundedCellHeight + Math.max(0, nodeData.gridRows - 1) * FRAME_GRID_GAP_PX;
    const nodeInnerWidth = Math.max(
      STORYBOARD_CONTROL_ROW_WIDTH_PX,
      STORYBOARD_PARAMS_ROW_WIDTH_PX,
      roundedGridWidth
    );
    const nodeWidth = Math.max(
      STORYBOARD_GEN_NODE_MIN_WIDTH_PX,
      Math.round(nodeInnerWidth + STORYBOARD_NODE_HORIZONTAL_PADDING_PX)
    );
    const nodeHeight = Math.max(
      STORYBOARD_GEN_NODE_MIN_HEIGHT_PX,
      Math.round(
        NODE_VERTICAL_PADDING_PX +
        CONTROL_ROW_HEIGHT_PX +
        CONTROL_ROW_MARGIN_BOTTOM_PX +
        roundedGridHeight +
        FRAME_GRID_MARGIN_BOTTOM_PX +
        PARAM_ROW_HEIGHT_PX
      )
    );

    return {
      nodeWidth,
      nodeHeight,
    };
  }, [frameAspectRatioValue, nodeData.gridCols, nodeData.gridRows]);

  const supportedAspectRatioValues = useMemo(
    () => selectedModel.aspectRatios.map((item) => item.value),
    [selectedModel.aspectRatios]
  );
  const mappedOverallRequestAspectRatio = useMemo(
    () =>
      pickClosestAspectRatio(
        resolvedAspectRatios.overallRatioValue,
        supportedAspectRatioValues
      ),
    [resolvedAspectRatios.overallRatioValue, supportedAspectRatioValues]
  );

  const totalFrames = useMemo(
    () => (nodeData.gridRows ?? 1) * (nodeData.gridCols ?? 1),
    [nodeData.gridRows, nodeData.gridCols]
  );

  // Side-effects that are pure consequences of the state/memos above

  useEffect(() => {
    frameDescriptionDraftsRef.current = frameDescriptionDrafts;
  }, [frameDescriptionDrafts]);

  useEffect(() => {
    const nextDrafts = buildFrameDescriptionDrafts(nodeData.frames);
    setFrameDescriptionDrafts((previous) =>
      areFrameDescriptionDraftsEqual(previous, nextDrafts) ? previous : nextDrafts
    );
  }, [nodeData.frames]);

  useEffect(() => {
    if (incomingImages.length === 0) {
      setShowImagePicker(false);
      setPickerFrameIndex(null);
      setPickerCursor(null);
      setPickerActiveIndex(0);
      return;
    }

    setPickerActiveIndex((previous) => Math.min(previous, incomingImages.length - 1));
  }, [incomingImages.length]);

  return {
    error,
    setError,
    batchProgress,
    setBatchProgress,

    rootRef,
    activeFrameTextareaRef,
    frameTextareaRefs,
    frameHighlightRefs,
    lastPointerAnchorRef,

    activeReferenceEditorFrameIndex,
    setActiveReferenceEditorFrameIndex,
    activeFrameControlEditorFrameIndex,
    setActiveFrameControlEditorFrameIndex,

    showImagePicker,
    setShowImagePicker,
    pickerFrameIndex,
    setPickerFrameIndex,
    pickerCursor,
    setPickerCursor,
    pickerActiveIndex,
    setPickerActiveIndex,
    pickerAnchor,
    setPickerAnchor,

    frameDescriptionDrafts,
    setFrameDescriptionDrafts,
    frameDescriptionDraftsRef,

    resolvedTitle,
    incomingImages,
    incomingImageItems,
    incomingImageViewerList,
    imageModels,
    selectedModel,
    effectiveExtraParams,
    resolutionOptions,
    selectedResolution,
    aspectRatioOptions,
    selectedAspectRatio,
    controlAspectRatioValue,
    resolvedAspectRatios,
    baseFrameLayout,
    supportedAspectRatioValues,
    mappedOverallRequestAspectRatio,
    totalFrames,
  };
}
