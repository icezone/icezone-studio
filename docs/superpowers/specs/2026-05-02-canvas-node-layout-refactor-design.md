# Canvas 节点布局重构设计

## Goal

将 canvas 节点的媒体预览区与输入/设置区拆分为两个视觉独立的卡片。默认只显示预览卡，点击后展开设置面板，使 canvas 整体更简洁直观。

## Architecture

**交互模型（方案 A）：** 点击预览卡任意位置切换展开/收起；点击节点外部（失焦）自动收起；设置面板内部点击不触发收起。

**节点架构（方案 A）：** 预览卡与设置面板同属一个 React Flow 节点，用 CSS 呈现为两个视觉卡片并留出间距。拖动、连线、选中行为不变。

**状态管理（方案 3）：** 提取共享 `useNodeExpanded` hook 统一管理展开状态，各节点保留自己的 JSX 结构，不强行套模板。

**Tech Stack:** Next.js 15 · React 18 · TypeScript · @xyflow/react · CSS 变量主题系统

---

## 重构范围

| 节点 | 行数 | 预览类型 | 优先级 |
|------|------|---------|--------|
| ImageEditNode | ~863 | 图片预览 | P0 |
| VideoGenNode | ~1180 | 视频预览 | P0 |
| StoryboardGenNode | ~1870 | 分镜预览 | P0 |
| StoryboardNode | ~1354 | 分镜展示 | P0 |
| VideoAnalysisNode | ~542 | 视频预览 | P0 |

以下节点**不纳入本次重构**：ImageNode、VideoResultNode、UploadNode、NovelInputNode、TextAnnotationNode。

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/features/canvas/nodes/shared/useNodeExpanded.ts` | 新建 | 管理展开/收起状态，返回 `{ expanded, toggle, collapse }` |
| `src/features/canvas/nodes/ImageEditNode.tsx` | 修改 | 引入 hook，拆分为预览卡 + 设置面板 |
| `src/features/canvas/nodes/VideoGenNode.tsx` | 修改 | 同上 |
| `src/features/canvas/nodes/StoryboardGenNode.tsx` | 修改 | 同上 |
| `src/features/canvas/nodes/StoryboardNode.tsx` | 修改 | 同上 |
| `src/features/canvas/nodes/VideoAnalysisNode.tsx` | 修改 | 同上 |

---

## 组件设计

### useNodeExpanded hook

```ts
// src/features/canvas/nodes/shared/useNodeExpanded.ts
import { useState, useCallback } from 'react'

export function useNodeExpanded() {
  const [expanded, setExpanded] = useState(false)
  const toggle   = useCallback(() => setExpanded(v => !v), [])
  const collapse = useCallback(() => setExpanded(false), [])
  return { expanded, toggle, collapse }
}
```

**状态规则：**
- 纯 React 本地 state，不持久化，刷新后默认收起
- 每个节点实例独立维护自己的展开状态

### 各节点使用模式

```tsx
const { expanded, toggle, collapse } = useNodeExpanded()

// 外层：preview-wrap 作为 handle 按钮的定位锚点
<div className="node-preview-wrap">
  {/* Handle 按钮 — 默认隐藏，hover preview-wrap 时弹出 */}
  <Handle type="target" position={Position.Left} className="node-handle-left" />
  <Handle type="source" position={Position.Right} className="node-handle-right" />

  {/* 预览卡 — 点击触发 toggle */}
  <div onClick={toggle} className="node-preview-card">
    {/* 标题栏 + 媒体预览内容 */}
    <div className="node-edit-hint">点击编辑</div>
  </div>
</div>

{/* 间距层 */}
{expanded && (
  <div className="node-gap-dots">
    <span /><span /><span />
  </div>
)}

{/* 设置面板 — expanded 时渲染，内部点击不冒泡 */}
{expanded && (
  <div
    onClick={e => e.stopPropagation()}
    className="node-settings-panel"
  >
    {/* prompt 输入框（width: 100%） */}
    {/* 控件行：pills + 生成按钮（white-space: nowrap） */}
  </div>
)}
```

### 失焦收起

监听 React Flow `selected` prop：当节点从 `selected=true` 变为 `selected=false` 时调用 `collapse()`：

```tsx
const prevSelected = useRef(selected)
useEffect(() => {
  if (prevSelected.current && !selected) collapse()
  prevSelected.current = selected
}, [selected, collapse])
```

---

## 视觉规格

> 风格基准：DESIGN.md（Miro 风格）暗色适配 — Blue 450、ring shadow、12px 圆角、极简层次。

### 色彩

| Token | 值 | 用途 |
|-------|----|------|
| canvas 背景 | `#08080f` | React Flow 画布底色 |
| 卡片背景 | `#13131e` | 预览卡 / 设置面板 |
| 卡片内区域 | `#0d0d16` | 图片/视频占位、prompt 输入框 |
| 默认边框 | `0 0 0 1px rgba(255,255,255,0.07)` | ring shadow |
| 选中边框 | `0 0 0 1.5px #5b76fe` | Blue 450 |
| 选中光晕 | `0 4px 24px rgba(91,118,254,0.18)` | 蓝色外发光 |
| 主交互色 | `#5b76fe` | Blue 450，按钮 / 选中 / handle hover |
| 副文字 | `#8a8fa8` | 控件标签 |
| 占位文字 | `#444458` | 输入框 placeholder、尺寸信息 |

### 预览卡（`.node-preview-wrap` + `.node-preview-card`）

```
外层 wrap:   position: relative; width: <节点宽度>
卡片背景:    #13131e
圆角:        12px
边框(默认):  box-shadow: 0 0 0 1px rgba(255,255,255,0.07)
边框(hover): box-shadow: 0 0 0 1.5px rgba(91,118,254,0.5), 0 4px 20px rgba(91,118,254,0.1)
边框(选中):  box-shadow: 0 0 0 1.5px #5b76fe, 0 4px 24px rgba(91,118,254,0.18)
溢出:        hidden
光标:        pointer
transition:  box-shadow 0.2s ease
```

**标题栏**：padding 8px 14px，`border-bottom: 1px solid rgba(255,255,255,0.05)`，标题 12px `#e8e8f0` font-weight 600，副信息 10px `#444458`。

**「点击编辑」提示**：absolute 定位右下角，默认 `opacity: 0`，`.node-preview-wrap:hover` 时 `opacity: 1`，`transition: opacity 0.2s ease`。

### 连接 Handle（+ 按钮）

置于 `.node-preview-wrap` 内，以预览卡高度垂直居中（`top: 50%`），展开设置面板后位置**不变**。

```
定位:       position: absolute; top: 50%; translateY(-50%)
左侧距卡片: right: calc(100% + 10px)
右侧距卡片: left:  calc(100% + 10px)
尺寸:       28px × 28px, border-radius: 50%
背景:       #1a1a2c, border: 1px solid rgba(255,255,255,0.1)
颜色:       #5b6080
默认:       opacity: 0; translateX(±8px)  // 隐藏，轻微内移
Hover触发:  .node-preview-wrap:hover → opacity: 1; translateX(0)
动画曲线:   cubic-bezier(0.34, 1.56, 0.64, 1)  // 弹簧弹出
时长:       0.25s
Handle hover: background #5b76fe, box-shadow: 0 0 0 4px rgba(91,118,254,0.2), scale(1.15)
```

### 间距层（预览卡与设置面板之间）

```
高度:   16px
内容:   三个 2×2px 圆点，居中，color: #2a2a3a
```

### 设置面板（`.node-settings-panel`）

```
display:     inline-flex; flex-direction: column; gap: 10px
宽度:        动态（不设固定宽度），由控件行自然撑开
最小宽度:    220px
背景:        #13131e
圆角:        12px
边框:        box-shadow: 0 0 0 1px rgba(255,255,255,0.07)
内边距:      14px
```

**Prompt 输入框**：
```
背景: #0d0d16, border: 1px solid rgba(255,255,255,0.06)
圆角: 8px, padding: 10px 12px, min-height: 72px
width: 100%（填满面板宽度）
```

**控件行**：单行 `display: flex; white-space: nowrap; gap: 6px; align-items: center`

**控制 pill**：
```
background: rgba(255,255,255,0.04)
border:     1px solid rgba(255,255,255,0.08)
border-radius: 6px
padding:    5px 10px
font-size:  11px, color: #8a8fa8
hover:      background rgba(255,255,255,0.08), color #c8c8e0
```

**生成按钮**（文字按钮，与 pill 同高同圆角）：
```
background:    #5b76fe
border-radius: 6px
padding:       5px 14px
font-size:     11px, font-weight: 600, color: #fff
margin-left:   auto
box-shadow:    0 2px 8px rgba(91,118,254,0.35)
hover:         background #4a65ed, translateY(-1px)
```

---

## 交互规范

| 操作 | 结果 |
|------|------|
| 点击预览卡 | toggle（展开 ↔ 收起） |
| 点击设置面板内部 | 无响应（stopPropagation） |
| 点击 canvas 空白处 / 其他节点 | 当前节点收起（selected→false） |
| 拖动节点 | 预览卡和设置面板一起移动 |
| 节点连线 | 仅通过预览卡两侧 handle 操作 |

---

## 不在范围内

- 节点内部的功能逻辑、API 调用、状态管理逻辑**不变**
- 不提取 `NodeShell` wrapper 组件（各节点保留自己的 JSX 灵活性）
- 不做持久化（刷新后恢复默认收起）
- 不涉及移动端适配
- 不修改 React Flow 的 edge / connection 逻辑
