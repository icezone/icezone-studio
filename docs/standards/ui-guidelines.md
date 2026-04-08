# UI/交互规范

本文档说明 IceZone Studio 的 UI 和交互规范。

## 组件复用

### 统一 UI 组件库

所有 UI 组件从 `src/components/ui/primitives.tsx` 引用：

```typescript
import { Button, Input, Select, Dialog } from '@/components/ui/primitives'
```

**禁止**：在各处散落创建类似组件

### 设计变量和 Token

使用 `index.css` 中定义的 CSS 变量：

```css
/* 颜色 */
--color-primary: ...;
--color-background: ...;
--color-text: ...;

/* 间距 */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;

/* 圆角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

**禁止**：硬编码样式值

## 节点样式规范

### 节点外边框颜色

必须同时适配明暗主题：

```css
/* 明亮模式 */
border: 1px solid rgba(15, 23, 42, 0.45);

/* 暗黑模式 */
dark:border-[rgba(255,255,255,0.22)]
```

### 节点内部边框

```css
/* 明亮模式 */
border: 1px solid rgba(15, 23, 42, 0.15);

/* 暗黑模式 */
dark:border-[rgba(255,255,255,0.1)]
```

**禁止**：仅写 `rgba(255,255,255,...)` 不带 `dark:` 前缀

### 节点控制条样式

统一从 `src/features/canvas/ui/nodeControlStyles.ts` 引用：

```typescript
import {
  controlBarHeight,
  buttonSize,
  iconSize,
  spacing
} from './nodeControlStyles'

<div style={{ height: controlBarHeight }}>
  <Button size={buttonSize}>
    <Icon size={iconSize} />
  </Button>
</div>
```

**禁止**：在各节点散落硬编码尺寸

### 节点工具条配置

统一从 `src/features/canvas/ui/nodeToolbarConfig.ts` 引用：

```typescript
import { getToolbarPosition } from './nodeToolbarConfig'

<NodeToolbar position={getToolbarPosition('top')} />
```

**禁止**：通过 `left/translate` 等绝对定位覆盖跟随逻辑

## 明暗主题

### 颜色适配

所有颜色必须同时定义明暗模式：

```css
/* 明亮模式 */
.element {
  background: white;
  color: black;
}

/* 暗黑模式 */
.dark .element {
  background: #1a1a1a;
  color: white;
}
```

或使用 Tailwind：

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  ...
</div>
```

### 避免高饱和蓝色

导航图等非主要元素使用灰黑系，避免高饱和蓝色抢占焦点。

## 交互规范

### 输入框与工具条

- 保持与节点对齐
- 交互动画保持一致
- 使用统一的过渡时间（200-300ms）

### 对话框

- 支持"打开/关闭"过渡，避免突兀闪烁
- 使用统一的 Dialog 组件
- 背景遮罩使用半透明黑色

```tsx
<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
  <Dialog.Panel>
    {/* 内容 */}
  </Dialog.Panel>
</Dialog>
```

### 节点覆盖层

`SelectedNodeOverlay` 只承载轻量通用覆盖能力（如工具条）。

**节点核心业务输入区应内聚到节点组件本体**（例如 `ImageEditNode`）。

## 画布交互

### 多选操作

多选节点时画布上方显示 `MultiSelectToolbar`：

```tsx
<MultiSelectToolbar selectedNodes={selectedNodes}>
  <Button onClick={handleGroup}>编组</Button>
  <Button onClick={handleDelete}>删除</Button>
</MultiSelectToolbar>
```

位置：`src/features/canvas/ui/MultiSelectToolbar.tsx`

### 右键框选

Canvas.tsx 中的 `handleRightMouseDown/Move/Up` 实现右键拖拽框选节点。

浏览器默认右键菜单已禁用：

```typescript
onContextMenu={(e) => e.preventDefault()}
```

### 快捷键

快捷键应避开输入态（`input/textarea/contentEditable`）避免误触：

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // 在输入元素中不响应快捷键
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }
    
    // 处理快捷键...
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

## 响应式设计

### 断点

使用 Tailwind 断点：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 小屏 1 列，中屏 2 列，大屏 3 列 */}
</div>
```

### 移动端适配

- 触摸事件支持
- 最小点击区域 44x44px
- 避免 hover-only 交互

## 动画规范

### 过渡时间

- **快速**（hover/focus）: 150ms
- **标准**（弹窗/抽屉）: 200-300ms
- **慢速**（页面切换）: 400-500ms

### 缓动函数

优先使用：
- `ease-out`: 元素进入
- `ease-in`: 元素退出
- `ease-in-out`: 状态切换

### 示例

```css
.fade-enter {
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.fade-enter-active {
  opacity: 1;
}
```

## 加载状态

### Skeleton

长列表使用 Skeleton 占位：

```tsx
{isLoading ? (
  <Skeleton count={5} />
) : (
  <List items={items} />
)}
```

### Spinner

异步操作使用 Spinner：

```tsx
<Button disabled={isLoading}>
  {isLoading && <Spinner />}
  生成图片
</Button>
```

## 错误与空状态

### 错误提示

使用 Toast 或 Alert：

```tsx
toast.error('生成失败，请重试')
```

### 空状态

提供明确的操作引导：

```tsx
<EmptyState
  icon={<ImageIcon />}
  title="还没有图片"
  description="点击按钮开始创建"
  action={<Button onClick={handleCreate}>创建图片</Button>}
/>
```

## 可访问性

### 语义化 HTML

```tsx
✅ <button onClick={...}>删除</button>
❌ <div onClick={...}>删除</div>
```

### ARIA 标签

```tsx
<button aria-label="关闭对话框" onClick={handleClose}>
  <XIcon />
</button>
```

### 键盘导航

确保所有交互元素可通过键盘访问：
- Tab: 聚焦下一个元素
- Shift+Tab: 聚焦上一个元素
- Enter/Space: 触发按钮
- Esc: 关闭对话框

---

相关文档：
- `code-quality.md` - 代码质量标准
- `../architecture/codebase-guide.md` - UI 组件代码位置
- `i18n.md` - 文案国际化
