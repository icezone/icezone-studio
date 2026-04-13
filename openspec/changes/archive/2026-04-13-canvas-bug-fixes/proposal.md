## Why

Canvas 中存在若干影响用户体验的 bug：连线删除按钮失效导致用户无法断开节点连接；节点顶部显示的收费标注（如 ¥0.43/次）产生视觉噪音；分镜生成节点的 textbox 在初始状态留有空白且浅色模式下颜色过深；多个节点初始尺寸不一致影响整体视觉协调性。统一修复这批 bug 以改善 canvas 操作体验。

## What Changes

- **修复 link 删除按钮**：`DisconnectableEdge` 中选中连线时显示的删除按钮点击无响应，需排查 pointer-events / z-index 并修复
- **移除节点收费信息**：从所有节点顶部移除 `NodePriceBadge`（¥0.43/次 等），相关逻辑从 `ImageEditNode`、`StoryboardGenNode`、`VideoGenNode` 等节点中移除
- **分镜生成节点 textbox 动态填满**：当前 2 列初始状态 textbox 未填满 panel，改为根据行列数动态计算 textbox 高度，确保 grid 区域无空白
- **分镜生成节点浅色模式颜色**：textbox 背景在 light theme 下颜色过深，调整为使用 CSS 变量 `--canvas-node-section-bg` 或更浅的语义色
- **统一 AI 图片节点初始尺寸**：`ImageNode` 初始尺寸调整为与 `VideoGenNode`（560×560）一致
- **统一视频分析与小说剧本节点尺寸**：`VideoAnalysisNode`（当前 380×540）和 `NovelInputNode`（当前 380×520）的默认尺寸调整为与 `StoryboardGenNode`（最小 600×480）保持一致

## Capabilities

### New Capabilities

（无新能力引入，本次为纯 bug 修复）

### Modified Capabilities

（无规格级行为变更，均为实现层修复）

## Impact

- `src/features/canvas/edges/DisconnectableEdge.tsx` — link 删除按钮修复
- `src/features/canvas/nodes/ImageEditNode.tsx` — 移除 NodePriceBadge
- `src/features/canvas/nodes/StoryboardGenNode.tsx` — 移除 NodePriceBadge、textbox 动态高度、浅色模式颜色
- `src/features/canvas/nodes/VideoGenNode.tsx` — 移除 NodePriceBadge（如有）
- `src/features/canvas/nodes/ImageNode.tsx` — 调整初始尺寸
- `src/features/canvas/nodes/VideoAnalysisNode.tsx` — 调整默认尺寸
- `src/features/canvas/nodes/NovelInputNode.tsx` — 调整默认尺寸
- `src/features/canvas/ui/NodePriceBadge.tsx` — 可能保留组件但不再在节点顶部使用
