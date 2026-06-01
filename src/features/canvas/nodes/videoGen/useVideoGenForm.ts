import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  type VideoGenNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import {
  canvasVideoAiGateway,
  graphImageResolver,
} from '@/features/canvas/application/canvasServices';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import {
  DEFAULT_VIDEO_MODEL_ID,
  getVideoModel,
  listVideoModels,
} from '@/features/canvas/models';
import { useCanvasStore } from '@/stores/canvasStore';

export interface PickerAnchor {
  left: number;
  top: number;
}

const PICKER_FALLBACK_ANCHOR: PickerAnchor = { left: 8, top: 8 };
const POLL_INTERVAL_MS = 3000;

export interface UseVideoGenFormArgs {
  id: string;
  data: VideoGenNodeData;
}

/**
 * Owns VideoGenNode's transient UI state, derived memos, and the job-status
 * polling lifecycle. The orchestrator keeps the action handlers (generate,
 * retry, download, frame upload) and the render tree.
 */
export function useVideoGenForm({ id, data }: UseVideoGenFormArgs) {
  const { t } = useTranslation();

  const [promptDraft, setPromptDraft] = useState(data.prompt);
  const [error, setError] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor>(PICKER_FALLBACK_ANCHOR);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);
  const [pollingProgress, setPollingProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptHighlightRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const frameUploadRef = useRef<HTMLInputElement>(null);
  const [frameUploadTarget, setFrameUploadTarget] = useState<'start' | 'end' | null>(null);
  const [startFramePickerOpen, setStartFramePickerOpen] = useState(false);
  const [endFramePickerOpen, setEndFramePickerOpen] = useState(false);

  const videoModels = useMemo(() => listVideoModels(), []);
  const selectedModel = useMemo(
    () => getVideoModel(data.model || DEFAULT_VIDEO_MODEL_ID),
    [data.model]
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
        label: `${t('canvas.reference')} ${index + 1}`,
      })),
    [incomingImages, t]
  );

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.videoGen, data, t),
    [data, t]
  );

  // Auto-collapse sections when video generation starts or completes
  useEffect(() => {
    if (data.isGenerating || data.videoUrl) {
      setPromptCollapsed(true);
    }
  }, [data.isGenerating, data.videoUrl]);

  // Cleanup polling on unmount or when generation completes
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Polling effect
  useEffect(() => {
    if (!data.isGenerating || !data.jobId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setPollingProgress(0);
      return;
    }

    const pollStatus = async () => {
      try {
        const status = await canvasVideoAiGateway.pollJobStatus(
          data.jobId!,
          data.model
        );

        if (process.env.NODE_ENV === 'development') {
          console.log('[VideoGenNode] Poll status:', {
            jobId: data.jobId,
            state: status.state,
            videoUrl: status.videoUrl,
            progress: status.progress,
            errorMessage: status.errorMessage,
          });
        }

        if (status.state === 'completed' && status.videoUrl) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          const generationDurationMs = data.generationStartedAt
            ? Date.now() - data.generationStartedAt
            : 0;

          // videoGen already owns its result on its own data; no child exportImage to mirror.
          updateNodeData(id, {
            videoUrl: status.videoUrl,
            isGenerating: false,
            generationStartedAt: null,
            generationDurationMs,
            jobId: null,
            errorMessage: null,
          });
          setError(null);
          setPollingProgress(0);
        } else if (status.state === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          const errorMsg = status.errorMessage || t('videoErrors.generation_failed');
          updateNodeData(id, {
            isGenerating: false,
            generationStartedAt: null,
            jobId: null,
            errorMessage: errorMsg,
          });
          setError(errorMsg);
          setPollingProgress(0);
        } else if (status.state === 'timeout') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          const errorMsg = t('videoErrors.job_timeout');
          updateNodeData(id, {
            isGenerating: false,
            generationStartedAt: null,
            jobId: null,
            errorMessage: errorMsg,
          });
          setError(errorMsg);
          setPollingProgress(0);
        } else {
          // Update progress estimate
          if (data.generationStartedAt && selectedModel.expectedDurationMs) {
            const elapsed = Date.now() - data.generationStartedAt;
            const progress = Math.min((elapsed / selectedModel.expectedDurationMs) * 100, 95);
            setPollingProgress(progress);
          }
        }
      } catch (pollError) {
        console.error('[VideoGenNode] Polling error:', pollError);
        // Don't stop polling on network errors, just log
      }
    };

    // Initial poll
    void pollStatus();

    // Set up interval
    pollIntervalRef.current = setInterval(() => {
      void pollStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [
    data.isGenerating,
    data.jobId,
    data.model,
    data.generationStartedAt,
    data.prompt,
    data.duration,
    data.aspectRatio,
    selectedModel.expectedDurationMs,
    id,
    updateNodeData,
    t,
  ]);

  const durationOptions = useMemo(
    () => selectedModel.durations.map((d) => ({ value: d.value, label: d.label })),
    [selectedModel.durations]
  );

  const aspectRatioOptions = useMemo(
    () => selectedModel.aspectRatios.map((ar) => ({ value: ar.value, label: ar.label })),
    [selectedModel.aspectRatios]
  );

  const selectedDuration = useMemo(
    () => durationOptions.find((opt) => opt.value === data.duration) ?? durationOptions[0],
    [durationOptions, data.duration]
  );

  const selectedAspectRatio = useMemo(
    () => aspectRatioOptions.find((opt) => opt.value === data.aspectRatio) ?? aspectRatioOptions[0],
    [aspectRatioOptions, data.aspectRatio]
  );

  return {
    promptDraft,
    setPromptDraft,
    error,
    setError,
    showImagePicker,
    setShowImagePicker,
    pickerAnchor,
    setPickerAnchor,
    pickerActiveIndex,
    setPickerActiveIndex,
    pollingProgress,
    downloading,
    setDownloading,
    promptCollapsed,
    setPromptCollapsed,
    promptRef,
    promptHighlightRef,
    frameUploadRef,
    frameUploadTarget,
    setFrameUploadTarget,
    startFramePickerOpen,
    setStartFramePickerOpen,
    endFramePickerOpen,
    setEndFramePickerOpen,
    videoModels,
    selectedModel,
    incomingImages,
    incomingImageItems,
    resolvedTitle,
    durationOptions,
    aspectRatioOptions,
    selectedDuration,
    selectedAspectRatio,
  };
}

export type UseVideoGenFormResult = ReturnType<typeof useVideoGenForm>;
