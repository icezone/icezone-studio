-- Seed official workflow templates
-- These are preset templates with user_id = NULL (official)

INSERT INTO public.workflow_templates (user_id, name, description, category, tags, template_data, node_count, is_public)
VALUES
  (
    NULL,
    'Novel to Storyboard',
    'Convert novel/script text into storyboard frames',
    'official',
    ARRAY['storyboard', 'novel', 'script'],
    '{"version":1,"nodes":[{"id":"text-input","type":"textAnnotationNode","position":{"x":0,"y":0},"data":{"displayName":"Novel/Script Input","content":""}},{"id":"storyboard-gen","type":"storyboardGenNode","position":{"x":400,"y":0},"data":{"displayName":"Storyboard Gen","gridRows":2,"gridCols":3,"frames":[{"id":"f1","description":"","referenceIndex":null},{"id":"f2","description":"","referenceIndex":null},{"id":"f3","description":"","referenceIndex":null},{"id":"f4","description":"","referenceIndex":null},{"id":"f5","description":"","referenceIndex":null},{"id":"f6","description":"","referenceIndex":null}],"model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"16:9","aspectRatio":"16:9","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}}],"edges":[{"id":"e1","source":"text-input","target":"storyboard-gen"}],"metadata":{"name":"Novel to Storyboard","description":"Convert novel/script text into storyboard frames","requiredNodeTypes":["textAnnotationNode","storyboardGenNode"]}}'::jsonb,
    2,
    true
  ),
  (
    NULL,
    'Video Rebuild',
    'Analyze video keyframes and regenerate storyboard',
    'official',
    ARRAY['video', 'rebuild', 'storyboard'],
    '{"version":1,"nodes":[{"id":"upload-video-ref","type":"uploadNode","position":{"x":0,"y":0},"data":{"displayName":"Reference Image","imageUrl":null,"previewImageUrl":null,"aspectRatio":"16:9"}},{"id":"ai-image","type":"imageNode","position":{"x":400,"y":0},"data":{"displayName":"AI Rebuild","prompt":"","model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"16:9","aspectRatio":"16:9","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}},{"id":"video-gen","type":"videoGenNode","position":{"x":800,"y":0},"data":{"displayName":"Video Generation","prompt":"","model":"kling/kling-3.0","duration":5,"aspectRatio":"16:9","enableAudio":true,"videoUrl":null,"thumbnailUrl":null,"isGenerating":false,"jobId":null,"errorMessage":null}}],"edges":[{"id":"e1","source":"upload-video-ref","target":"ai-image"},{"id":"e2","source":"ai-image","target":"video-gen"}],"metadata":{"name":"Video Rebuild","description":"Analyze video keyframes and regenerate storyboard","requiredNodeTypes":["uploadNode","imageNode","videoGenNode"]}}'::jsonb,
    3,
    true
  ),
  (
    NULL,
    'Batch Image Generation',
    'Generate multiple AI images in batch',
    'official',
    ARRAY['batch', 'image', 'generation'],
    '{"version":1,"nodes":[{"id":"img-1","type":"imageNode","position":{"x":0,"y":0},"data":{"displayName":"Image 1","prompt":"","model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"1:1","aspectRatio":"1:1","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}},{"id":"img-2","type":"imageNode","position":{"x":400,"y":0},"data":{"displayName":"Image 2","prompt":"","model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"1:1","aspectRatio":"1:1","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}},{"id":"img-3","type":"imageNode","position":{"x":0,"y":400},"data":{"displayName":"Image 3","prompt":"","model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"1:1","aspectRatio":"1:1","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}},{"id":"img-4","type":"imageNode","position":{"x":400,"y":400},"data":{"displayName":"Image 4","prompt":"","model":"grs-ai/flux-1","size":"1K","requestAspectRatio":"1:1","aspectRatio":"1:1","imageUrl":null,"previewImageUrl":null,"isGenerating":false,"generationStartedAt":null}}],"edges":[],"metadata":{"name":"Batch Image Generation","description":"Generate multiple AI images in batch","requiredNodeTypes":["imageNode"]}}'::jsonb,
    4,
    true
  );
