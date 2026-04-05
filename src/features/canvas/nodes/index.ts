import type { NodeTypes } from '@xyflow/react';

import { GroupNode } from './GroupNode';
import { ImageEditNode } from './ImageEditNode';
import { ImageNode } from './ImageNode';
import { NovelInputNode } from './NovelInputNode';
import { StoryboardGenNode } from './StoryboardGenNode';
import { StoryboardNode } from './StoryboardNode';
import { TextAnnotationNode } from './TextAnnotationNode';
import { UploadNode } from './UploadNode';
import { VideoGenNode } from './VideoGenNode';
import { VideoAnalysisNode } from './VideoAnalysisNode';
import { VideoResultNode } from './VideoResultNode';

export const nodeTypes: NodeTypes = {
  exportImageNode: ImageNode,
  groupNode: GroupNode,
  imageNode: ImageEditNode,
  novelInputNode: NovelInputNode,
  storyboardGenNode: StoryboardGenNode,
  storyboardNode: StoryboardNode,
  textAnnotationNode: TextAnnotationNode,
  uploadNode: UploadNode,
  videoAnalysisNode: VideoAnalysisNode,
  videoGenNode: VideoGenNode,
  videoResultNode: VideoResultNode,
};

export { GroupNode, ImageEditNode, ImageNode, NovelInputNode, StoryboardGenNode, StoryboardNode, TextAnnotationNode, UploadNode, VideoAnalysisNode, VideoGenNode, VideoResultNode };
