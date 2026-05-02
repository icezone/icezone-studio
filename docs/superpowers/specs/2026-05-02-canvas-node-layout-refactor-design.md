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
const { expanded, toggle } = useNodeExpanded()

// 1. 预览卡 — 点击触发 toggle
<div
  onClick={toggle}
  className="node-preview-card"   // 见下方 CSS 约定
>
  {/* 标题栏 + 媒体预览内容 */}
</div>

// 2. 设置面板 — expanded 时渲染，内部点击不冒泡
{expanded && (
  <div
    onClick={e => e.stopPropagation()}
    className="node-settings-panel"
  >
    {/* prompt 输入、模型选择、控制条等 */}
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

### 预览卡（`node-preview-card`）

```
背景:        var(--node-bg)           // #0d0d1a
边框:        1px solid var(--ui-line) // 默认状态
边框(展开):  1.5px solid rgba(74,158,255,0.4)
圆角:        10px
溢出:        hidden
光标:        pointer
```

**收起状态** — 右下角显示淡色「点击编辑」提示（absolute 定位，hover 时才可见）。

**展开状态** — 蓝色边框 + 浅蓝 box-shadow 高亮。

### 间距层（预览卡与设置面板之间）

```
高度:   14px
内容:   三个 2px 圆点（居中，color: var(--ui-line-muted)）
作用:   视觉连接两个卡片，暗示从属关系
```

### 设置面板（`node-settings-panel`）

```
背景:   略深于预览卡（#12121f）
边框:   1px solid var(--ui-line)
圆角:   10px
内边距: 12px
```

### 连接 Handle（+ 按钮）

固定在**预览卡**垂直中心两侧，展开状态下不随设置面板移动。设置面板无独立 handle，不参与连线。

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
