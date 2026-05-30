import type { VideoModelDefinition } from '@/features/canvas/models';
import { VideoParamsControls } from '@/features/canvas/ui/VideoParamsControls';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_MODEL_CHIP_CLASS,
  NODE_CONTROL_PARAMS_CHIP_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';

interface DurationOption {
  value: number;
  label: string;
}

interface AspectRatioOption {
  value: string;
  label: string;
}

interface IncomingImageItem {
  imageUrl: string;
  displayUrl: string;
  label: string;
}

export interface VideoGenSettingsProps {
  videoModels: VideoModelDefinition[];
  selectedModel: VideoModelDefinition;
  selectedDuration: DurationOption | undefined;
  selectedAspectRatio: AspectRatioOption;
  durationOptions: DurationOption[];
  aspectRatioOptions: AspectRatioOption[];
  onModelChange: (modelId: string) => void;
  onDurationChange: (duration: number) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
  extraParams?: Record<string, unknown>;
  onExtraParamChange: (key: string, value: boolean | number | string | unknown) => void;
  incomingImages?: IncomingImageItem[];
  enableAudio?: boolean;
  onEnableAudioChange: (enabled: boolean) => void;
  seed?: number | null;
  onSeedChange: (seed: number | null) => void;
  klingElements?: unknown[];
  onKlingElementsChange: (elements: unknown[]) => void;
}

export function VideoGenSettings(props: VideoGenSettingsProps) {
  const {
    videoModels,
    selectedModel,
    selectedDuration,
    selectedAspectRatio,
    durationOptions,
    aspectRatioOptions,
    onModelChange,
    onDurationChange,
    onAspectRatioChange,
    extraParams,
    onExtraParamChange,
    incomingImages,
    enableAudio,
    onEnableAudioChange,
    seed,
    onSeedChange,
    klingElements,
    onKlingElementsChange,
  } = props;

  return (
    <VideoParamsControls
      videoModels={videoModels}
      selectedModel={selectedModel}
      selectedDuration={selectedDuration}
      selectedAspectRatio={selectedAspectRatio}
      durationOptions={durationOptions}
      aspectRatioOptions={aspectRatioOptions}
      onModelChange={onModelChange}
      onDurationChange={onDurationChange}
      onAspectRatioChange={onAspectRatioChange}
      extraParams={extraParams}
      onExtraParamChange={onExtraParamChange}
      incomingImages={incomingImages}
      enableAudio={enableAudio}
      onEnableAudioChange={onEnableAudioChange}
      seed={seed}
      onSeedChange={onSeedChange}
      klingElements={klingElements}
      onKlingElementsChange={onKlingElementsChange}
      triggerSize="sm"
      chipClassName={NODE_CONTROL_CHIP_CLASS}
      modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
      paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
    />
  );
}
