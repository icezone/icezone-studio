## Context

Canvas 画布由 ReactFlow 驱动，节点通过 `DisconnectableEdge` 组件连接。当前存在六个影响使用体验的问题：

1. **Link 删除按钮失效**：`DisconnectableEdge` 在选中状态下渲染删除按钮，但按钮所在的 `EdgeLabelRenderer` 容器可能因 z-index 或 pointer-events 层级被遮盖，导致点击无效。
2. **节点收费标注**：`ImageEditNode`、`StoryboardGenNode`（及可能的其他节点）在 header 区域渲染 `NodePriceBadge`，显示 ¥0.43/次 等信息，产生视觉噪音。
3. **分镜 textbox 空白**：`StoryboardGenNode` 描述文本区域高度固定，不随行列数调整，初始 2 列时底部留有空白。
4. **分镜 textbox 浅色模式颜色**：textbox 背景使用了暗色 CSS 变量（如 `rgba(0,0,0,0.x)`），在 light theme 下显示过深。
5. **AI 图片节点尺寸**：`ImageNode` 使用基于 aspect ratio 的动态最小尺寸，初始尺寸偏小，与 `VideoGenNode`（560×560）不一致。
6. **视频分析/小说剧本节点尺寸**：`VideoAnalysisNode`（380×540）和 `NovelInputNode`（380×520）宽度明显小于 `StoryboardGenNode`（最小 600×480），视觉不协调。

## Goals / Non-Goals

**Goals:**
- 修复 link 删除按钮的点击响应
- 从所有节点 header 移除 NodePriceBadge 组件及相关逻辑
- 使分镜节点描述 textbox 高度动态填满 panel
- 修复分镜节点 textbox 在浅色模式下的背景颜色
- 统一 ImageNode 初始尺寸为 560×560
- 统一 VideoAnalysisNode 和 NovelInputNode 初始宽度为 ≥560，高度对齐 StoryboardGenNode

**Non-Goals:**
- 不重构价格计算系统（`resolveModelPriceDisplay`、`pricing.ts` 等保留）
- 不修改节点 resize 行为或最小尺寸约束
- 不改动 Canvas 布局或 ReactFlow 配置

## Decisions

### 1. Link 删除按钮修复

**问题定位**：`EdgeLabelRenderer` 渲染到 ReactFlow 的 portal，按钮本身有 `pointerEvents: 'all'`，但父容器的 `z-index` 可能不够高，被节点或其他元素遮盖。

**决策**：在 `EdgeLabelRenderer` 内的 `button` 元素上增加显式 `z-index`（如 `z-50`），确保在所有节点层之上可点击。同时确认 `deleteEdge` store action 正确绑定。

**备选**：使用 ReactFlow 的 `useReactFlow().deleteElements()` 替换自定义 `deleteEdge`，但自定义实现更可控，保持现有方式。

### 2. 移除 NodePriceBadge

**决策**：直接从各节点组件中移除 `<NodePriceBadge>` 渲染及其依赖的 `showNodePrice`、`resolvedPriceDisplay` 相关 `useMemo` 和 `useSettingsStore` 订阅。保留 `NodePriceBadge.tsx` 组件文件和 `pricing.ts` 工具函数（可能有其他用途），仅移除节点 header 中的渲染。

**备选**：通过 settings 开关控制显示，但用户明确要求移除，保持简洁。

### 3. 分镜 textbox 动态高度

**分析**：`StoryboardGenNode` 中描述 textarea 的高度当前为固定值或基于内容 auto 撑开，未考虑 panel 剩余空间。每个 frame cell 内的 textarea 高度应为 `(panelHeight - headerHeight - padding) / rows`。

**决策**：通过已有的 `computedLayout`（包含 `cellHeight`）计算 textarea 在 panel 中的可用高度，将其分配给描述 textarea，使其填满 cell 的文字区域，消除空白。

### 4. 分镜 textbox 浅色模式颜色

**决策**：将 textbox 背景从硬编码的 `rgba(0,0,0,0.x)` 或暗色 class 改为 `var(--canvas-node-input-bg)` 或 `var(--canvas-node-section-bg)`，这些 CSS 变量在 light/dark theme 下已正确定义。

### 5. ImageNode 初始尺寸

**决策**：在 `ImageNode` 中引入固定默认尺寸 `DEFAULT_WIDTH = 560`，当 `width` prop 未传入时使用此值，而非依赖 `resolveMinEdgeFittedSize` 的动态计算结果（该函数计算出的初始尺寸偏小）。

### 6. VideoAnalysisNode / NovelInputNode 尺寸

**决策**：
- `VideoAnalysisNode`: `DEFAULT_WIDTH = 560`（与 VideoGenNode/ImageNode 一致）
- `NovelInputNode`: `DEFAULT_WIDTH = 560`
- 高度保持现有值（540/520），不做调整，因为内容高度与 StoryboardGenNode 结构不同

## Risks / Trade-offs

- **Link 删除 z-index** → 影响范围小，仅改动边的 label 层级，不影响节点交互
- **移除 NodePriceBadge** → 如果未来需要重新显示价格，需要重新添加；当前需求明确移除
- **ImageNode 宽度固定** → 某些极端宽高比图片初始显示比例可能不理想，但用户可手动 resize
- **textbox 填满** → 若节点高度非常小，textarea 可能压缩，需保证最小高度约束
