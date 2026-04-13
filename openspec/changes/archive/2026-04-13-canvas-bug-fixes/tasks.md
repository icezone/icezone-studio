## 1. 修复 Link 删除按钮

- [x] 1.1 定位 `DisconnectableEdge.tsx` 中删除按钮无法点击的根本原因（z-index / pointer-events）
- [x] 1.2 在 `EdgeLabelRenderer` 内的删除按钮上添加适当的 `z-index`（如 `z-50`），确保按钮在所有节点层之上
- [x] 1.3 手动测试：添加节点并连线，选中连线，点击删除按钮，确认连线被删除

## 2. 移除节点收费信息 (NodePriceBadge)

- [x] 2.1 从 `ImageEditNode.tsx` 中移除 `<NodePriceBadge>` 渲染及相关的 `showNodePrice`、`resolvedPriceDisplay`、`resolvedPriceTooltip` 逻辑
- [x] 2.2 从 `StoryboardGenNode.tsx` 中移除 `<NodePriceBadge>` 渲染及相关 price 相关 useMemo/useSettingsStore 订阅
- [x] 2.3 检查其他节点（`VideoGenNode.tsx` 等）是否也有 NodePriceBadge，如有一并移除
- [x] 2.4 确认 `NodePriceBadge.tsx` 组件文件和 `pricing.ts` 工具函数保留（不删除）
- [x] 2.5 运行 `npx tsc --noEmit` 确认无 TypeScript 编译错误（预存 fluent-ffmpeg 错误与本次无关）

## 3. 分镜生成节点 Textbox 动态填满

- [x] 3.1 在 `StoryboardGenNode.tsx` 中分析 frame cell 内描述 textarea 的当前高度计算逻辑
- [x] 3.2 使用已有的 `computedLayout.cellHeight` 计算每个 textarea 的可用高度（cellHeight - header/padding）
- [x] 3.3 将计算出的高度通过 `style={{ height: ... }}` 应用到 frame 描述 textarea
- [x] 3.4 测试：初始 2 列 1 行时 textarea 填满 cell，调整为 3 列 2 行时 textarea 仍填满

## 4. 分镜节点 Textbox 浅色模式颜色

- [x] 4.1 在 `StoryboardGenNode.tsx` 中定位 frame 描述 textarea 的背景色 CSS（硬编码 rgba 或 class）
- [x] 4.2 将背景色替换为 `var(--canvas-node-section-bg)`（light: rgba(245,247,250,0.7), dark: rgba(13,21,37,0.45)）
- [x] 4.3 border 同步改为 `var(--canvas-node-border)` 以适配 light theme
- [x] 4.4 测试：切换到浅色主题，确认 textarea 背景色不过深

## 5. 统一 AI 图片节点初始尺寸

- [x] 5.1 在 `ImageNode.tsx` 中查看 `compactSize` 的使用方式
- [x] 5.2 添加 `IMAGE_NODE_DEFAULT_SIZE = 560`，为非 exportImage 节点使用更大默认尺寸
- [x] 5.3 测试：将 AI 图片节点拖入画布，初始宽度为 560px

## 6. 统一视频分析和小说剧本节点初始宽度

- [x] 6.1 在 `VideoAnalysisNode.tsx` 中将 `DEFAULT_WIDTH` 从 `380` 改为 `560`
- [x] 6.2 在 `NovelInputNode.tsx` 中将 `DEFAULT_WIDTH` 从 `380` 改为 `560`
- [x] 6.3 测试：将视频分析节点和小说剧本节点分别拖入画布，初始宽度均为 560px

## 7. 验证与收尾

- [x] 7.1 运行 `npx tsc --noEmit` 确认无 TypeScript 错误（预存 fluent-ffmpeg 2 errors）
- [x] 7.2 运行 `npm run lint` 确认无 lint 错误（0 errors，71 预存 warnings）
- [x] 7.3 在浏览器中整体测试：link 删除、节点无价格标注、分镜 textbox 填满、节点尺寸一致
