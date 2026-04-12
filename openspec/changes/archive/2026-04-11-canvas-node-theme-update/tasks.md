## 1. CSS Token 基础建设

- [x] 1.1 在 `globals.css` 的 `:root` 块中新增 15 个 `--canvas-*` 亮色 token（node-bg、node-border、node-shadow、node-header-bg、node-section-bg、node-hover-border、node-selected-border、drop-zone-border、drop-zone-hover-bg、node-fg、node-fg-muted、badge-bg、overlay-bg、menu-bg、menu-item-hover）
- [x] 1.2 在 `globals.css` 的 `[data-theme="dark"]` 块中新增对应 15 个暗色 token 值

## 2. Canvas Node 组件迁移（nodes/）

- [x] 2.1 迁移 `VideoGenNode.tsx`：将所有 `rgba(15,23,42,...)` / `rgba(255,255,255,...)` 颜色替换为对应 canvas token，`text-text-dark` → `text-[var(--canvas-node-fg)]`，`text-text-muted` → `text-[var(--canvas-node-fg-muted)]`
- [x] 2.2 迁移 `VideoResultNode.tsx`：同上替换颜色引用
- [x] 2.3 迁移 `ImageNode.tsx`：迁移节点背景、边框、文字颜色至 canvas token
- [x] 2.4 迁移 `ImageEditNode.tsx`：迁移颜色至 canvas token
- [x] 2.5 迁移 `UploadNode.tsx`：特别处理虚线上传区，使用 `--canvas-drop-zone-border` 和 `--canvas-drop-zone-hover-bg`
- [x] 2.6 迁移 `StoryboardNode.tsx`：迁移颜色至 canvas token
- [x] 2.7 迁移 `StoryboardGenNode.tsx`：迁移颜色至 canvas token
- [x] 2.8 迁移 `GroupNode.tsx`：迁移颜色至 canvas token
- [x] 2.9 迁移 `TextAnnotationNode.tsx`：迁移颜色至 canvas token
- [x] 2.10 迁移 `NovelInputNode.tsx`：迁移颜色至 canvas token
- [x] 2.11 迁移 `VideoAnalysisNode.tsx`：迁移颜色至 canvas token

## 3. Canvas UI 子组件迁移（ui/）

- [x] 3.1 迁移 `NodeHeader.tsx`：header 背景使用 `--canvas-node-header-bg`，文字使用 canvas fg token
- [x] 3.2 迁移 `NodeActionToolbar.tsx`：工具栏背景使用 `--canvas-menu-bg`，按钮悬停使用 `--canvas-menu-item-hover`
- [x] 3.3 迁移 `MultiSelectToolbar.tsx`：迁移浮动工具栏颜色至 canvas token
- [x] 3.4 迁移 `NodeSelectionMenu.tsx`（`NodeSelectionMenu.tsx` 在根目录）：迁移菜单背景和悬停色
- [x] 3.5 迁移 `SelectedNodeOverlay.tsx`：使用 `--canvas-node-selected-border` 和 `--canvas-overlay-bg`
- [x] 3.6 迁移 `NodePriceBadge.tsx`：使用 `--canvas-badge-bg` 替代硬编码背景色
- [x] 3.7 迁移 `NodeToolDialog.tsx`：弹窗背景使用 `--canvas-menu-bg`
- [x] 3.8 迁移 `CanvasNodeImage.tsx`：迁移图片容器背景颜色
- [x] 3.9 迁移 `KlingElementsEditor.tsx`：迁移编辑器背景和边框颜色
- [x] 3.10 迁移 `ModelParamsControls.tsx`：迁移参数面板颜色至 canvas token
- [x] 3.11 迁移 `VideoParamsControls.tsx`：迁移参数面板颜色至 canvas token
- [x] 3.12 迁移 `FrameControlEditor.tsx`：迁移颜色至 canvas token
- [x] 3.13 迁移 `FrameReferenceEditor.tsx`：迁移颜色至 canvas token
- [x] 3.14 迁移 `NodeResizeHandle.tsx`：使用 `--canvas-node-selected-border` 或 `--color-blue-450`
- [x] 3.15 迁移 `ImageViewerModal.tsx`：使用 `--canvas-overlay-bg` 和 `--canvas-menu-bg`
- [x] 3.16 迁移 `ReversePromptDialog.tsx`：迁移弹窗颜色至 canvas token
- [x] 3.17 迁移 `ShotAnalysisDialog.tsx`：迁移弹窗颜色至 canvas token
- [x] 3.18 迁移 `CanvasSidebar.tsx`：侧边栏背景和边框使用 canvas token

## 4. Tool Editor 组件迁移（ui/tool-editors/）

- [x] 4.1 迁移 `AnnotateToolEditor.tsx`：迁移颜色至 canvas token
- [x] 4.2 迁移 `CropToolEditor.tsx`：迁移颜色至 canvas token
- [x] 4.3 迁移 `FormToolEditor.tsx`：迁移颜色至 canvas token
- [x] 4.4 迁移 `SplitStoryboardToolEditor.tsx`：迁移颜色至 canvas token

## 5. Canvas 根组件迁移

- [x] 5.1 迁移 `CanvasToolbar.tsx`：工具栏背景、图标色、分隔线使用 canvas token
- [x] 5.2 迁移 `Canvas.tsx`：canvas 背景色和整体容器颜色使用 CSS token
- [x] 5.3 迁移 `edges/DisconnectableEdge.tsx`：边颜色使用 `--canvas-node-border` 或 `--color-blue-450`

## 6. 最终验证

- [x] 6.1 运行 `npx tsc --noEmit` 确认无 TypeScript 类型错误
- [x] 6.2 运行 `npm run lint` 确认 ESLint 无报错
- [ ] 6.3 视觉验证：在亮色主题下检查所有节点外观符合 DESIGN.md（白色背景、浅灰边框）
- [ ] 6.4 视觉验证：切换至暗色主题，确认所有节点正确显示深色外观
- [ ] 6.5 验证主题切换时节点外观即时响应，无需刷新
