import type { ImageModelDefinition } from '@/features/canvas/models/types';
import { ModelParamsControls } from '@/features/canvas/ui/ModelParamsControls';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_MODEL_CHIP_CLASS,
  NODE_CONTROL_PARAMS_CHIP_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';
import type { AspectRatioChoice } from './useStoryboardGenForm';

export interface StoryboardGenSettingsProps {
  imageModels: ImageModelDefinition[];
  selectedModel: ImageModelDefinition;
  onModelChange: (modelId: string) => void;
  resolutionOptions: AspectRatioChoice[];
  selectedResolution: AspectRatioChoice;
  onResolutionChange: (resolution: string) => void;
  aspectRatioOptions: AspectRatioChoice[];
  selectedAspectRatio: AspectRatioChoice;
  onAspectRatioChange: (aspectRatio: string) => void;
  extraParams: Record<string, unknown> | undefined;
  onExtraParamChange: (key: string, value: boolean | number | string) => void;
  showWebSearchToggle: boolean;
  webSearchEnabled: boolean;
  onWebSearchToggle: (enabled: boolean) => void;
}

export function StoryboardGenSettings(props: StoryboardGenSettingsProps) {
  const {
    imageModels,
    selectedModel,
    onModelChange,
    resolutionOptions,
    selectedResolution,
    onResolutionChange,
    aspectRatioOptions,
    selectedAspectRatio,
    onAspectRatioChange,
    extraParams,
    onExtraParamChange,
    showWebSearchToggle,
    webSearchEnabled,
    onWebSearchToggle,
  } = props;

  return (
    <ModelParamsControls
      imageModels={imageModels}
      selectedModel={selectedModel}
      resolutionOptions={resolutionOptions}
      selectedResolution={selectedResolution}
      selectedAspectRatio={selectedAspectRatio}
      aspectRatioOptions={aspectRatioOptions}
      onModelChange={onModelChange}
      onResolutionChange={onResolutionChange}
      onAspectRatioChange={onAspectRatioChange}
      extraParams={extraParams}
      onExtraParamChange={onExtraParamChange}
      showWebSearchToggle={showWebSearchToggle}
      webSearchEnabled={webSearchEnabled}
      onWebSearchToggle={onWebSearchToggle}
      triggerSize="sm"
      chipClassName={NODE_CONTROL_CHIP_CLASS}
      modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
      paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
      modelPanelAlign="center"
      paramsPanelAlign="center"
      modelPanelClassName="inline-block min-w-[300px] max-w-[calc(100vw-32px)] p-2"
      paramsPanelClassName="w-[420px] p-3"
    />
  );
}
