## Why

Canvas 中所有节点和组件目前混合使用硬编码的 rgba 颜色值、Tailwind `dark:` 修饰类和部分 CSS 变量，导致视觉风格不统一，且暗色/亮色主题切换时大量节点样式无法正确响应。上一轮 UI 改造（ui-miro-theme-redesign）已建立了完整的 CSS 设计 token 体系，但 canvas 区域未被覆盖。

## What Changes

- 将 canvas 中所有 node 组件（VideoGenNode、ImageNode、VideoResultNode、UploadNode、StoryboardNode、StoryboardGenNode、GroupNode、TextAnnotationNode、ImageEditNode、NovelInputNode、VideoAnalysisNode）的颜色全部迁移至 DESIGN.md 规定的 CSS token
- 将 canvas UI 组件（CanvasToolbar、NodeHeader、NodeActionToolbar、MultiSelectToolbar、NodeSelectionMenu、CanvasSidebar、SelectedNodeOverlay、NodePriceBadge、NodeResizeHandle、NodeToolDialog、CanvasNodeImage、KlingElementsEditor、tool-editors 等）迁移至 CSS token
- 为 canvas 专用元素在 globals.css 补充缺失的 canvas 语义 token（节点背景、节点边框、节点悬停态、节点选中态、虚线上传区、badge 背景等）
- 确保所有节点在亮色主题（:root）与暗色主题（[data-theme="dark"]）下都有正确的外观表现
- 移除所有硬编码的 `rgba(15,23,42,...)` / `rgba(255,255,255,...)` 颜色值

## Capabilities

### New Capabilities

- `canvas-light-dark-theme`: Canvas 节点和 UI 组件支持亮色/暗色双主题，通过 CSS token 驱动，响应全局主题切换

### Modified Capabilities

（无需求级别变更，仅为实现层迁移）

## Impact

- 受影响文件：`src/features/canvas/` 下全部 `.tsx` 文件（约 35 个）
- 受影响样式：`src/app/globals.css`（新增 canvas token）
- 依赖：现有主题系统（`ThemeProvider`、`data-theme` 属性）
- 无 API 变更，无破坏性变更
- 视觉效果变化：canvas 节点在亮色主题下将呈现白色/浅灰背景 + 深色文字，符合 DESIGN.md 的 Miro 风格
