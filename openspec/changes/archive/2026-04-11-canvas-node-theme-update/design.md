## Context

上一轮 UI 改造（ui-miro-theme-redesign）已在 `globals.css` 建立了完整的 UI 语义 token 体系（`--ui-bg`、`--ui-fg`、`--ui-line` 等），并通过 `[data-theme="dark"]` 选择器实现了亮/暗切换。然而 canvas 区域的节点和组件大量使用了硬编码的 `rgba(15,23,42,...)` / `rgba(255,255,255,...)` 颜色以及 Tailwind `dark:` 修饰类，导致：
- 亮色主题下节点呈现深色（暗色主题专用）外观
- 无法响应主题切换
- 样式维护成本高，无法统一迭代

Canvas 节点总计约 11 种节点类型 + 约 24 个 UI 子组件，分布在 `src/features/canvas/` 下。

## Goals / Non-Goals

**Goals:**
- 在 `globals.css` 新增 canvas 专用语义 token（`--canvas-node-bg`、`--canvas-node-border` 等），覆盖亮/暗两个主题
- 将所有 canvas node 和 UI 组件的颜色引用迁移至 CSS token
- 保持视觉效果与 DESIGN.md 一致：亮色主题呈现白色/浅灰节点，暗色主题呈现深蓝灰节点
- 保持原有节点功能、布局、交互逻辑不变

**Non-Goals:**
- 不调整节点布局、尺寸或交互逻辑
- 不引入新字体或新图标
- 不修改 ReactFlow 配置或边/连接点样式（除颜色外）
- 不新增节点类型

## Decisions

### D1: 新增 canvas 语义 token 层，而非复用 ui token

**选择**：在 globals.css 中新增 `--canvas-*` token，而非直接复用 `--ui-bg` 等 token。

**原因**：Canvas 节点有其特殊性（半透明背景、浮动卡片感、节点内部区域分层），直接复用 UI token 会导致节点与普通面板外观难以区分。独立的 canvas token 层允许在不影响其他 UI 的情况下调整节点美学。

**Token 命名规范**：
```css
/* 节点容器 */
--canvas-node-bg          /* 节点主背景 */
--canvas-node-border      /* 节点边框颜色 */
--canvas-node-shadow      /* 节点阴影 */
--canvas-node-header-bg   /* 节点 header 背景 */
--canvas-node-section-bg  /* 节点内部分区背景 */

/* 交互状态 */
--canvas-node-hover-border   /* 悬停边框 */
--canvas-node-selected-border /* 选中边框 */
--canvas-drop-zone-border    /* 虚线上传区边框 */
--canvas-drop-zone-hover-bg  /* 上传区悬停背景 */

/* 文字 */
--canvas-node-fg         /* 节点主文字 */
--canvas-node-fg-muted   /* 节点次级文字 */

/* 徽章与覆盖层 */
--canvas-badge-bg        /* NodePriceBadge 背景 */
--canvas-overlay-bg      /* 半透明覆盖层背景 */
--canvas-menu-bg         /* 节点菜单/弹出层背景 */
--canvas-menu-item-hover /* 菜单项悬停背景 */
```

### D2: 亮色主题 canvas token 值（基于 DESIGN.md）

```css
:root {
  --canvas-node-bg:           #ffffff;
  --canvas-node-border:       rgba(199,202,213,0.6);  /* #c7cad5 @ 60% */
  --canvas-node-shadow:       rgb(224,226,232) 0px 0px 0px 1px;
  --canvas-node-header-bg:    rgba(245,247,250,0.95);
  --canvas-node-section-bg:   rgba(245,247,250,0.7);
  --canvas-node-hover-border: rgba(91,118,254,0.4);   /* blue-450 @ 40% */
  --canvas-node-selected-border: #5b76fe;
  --canvas-drop-zone-border:  rgba(15,23,42,0.2);
  --canvas-drop-zone-hover-bg: rgba(15,23,42,0.04);
  --canvas-node-fg:           #1c1c1e;
  --canvas-node-fg-muted:     #555a6a;
  --canvas-badge-bg:          rgba(245,247,250,0.9);
  --canvas-overlay-bg:        rgba(255,255,255,0.85);
  --canvas-menu-bg:           #ffffff;
  --canvas-menu-item-hover:   rgba(15,23,42,0.06);
}
```

### D3: 暗色主题 canvas token 值

```css
[data-theme="dark"] {
  --canvas-node-bg:           #111827;   /* color-frame */
  --canvas-node-border:       rgba(255,255,255,0.1);
  --canvas-node-shadow:       rgba(0,0,0,0.4) 0px 2px 8px;
  --canvas-node-header-bg:    rgba(26,38,64,0.95);   /* color-frame-2 */
  --canvas-node-section-bg:   rgba(13,21,37,0.45);   /* color-surface @ 45% */
  --canvas-node-hover-border: rgba(91,118,254,0.5);
  --canvas-node-selected-border: #5b76fe;
  --canvas-drop-zone-border:  rgba(255,255,255,0.25);
  --canvas-drop-zone-hover-bg: rgba(255,255,255,0.04);
  --canvas-node-fg:           #e2e8f0;
  --canvas-node-fg-muted:     #6b7fa0;
  --canvas-badge-bg:          rgba(26,38,64,0.9);
  --canvas-overlay-bg:        rgba(17,24,39,0.85);
  --canvas-menu-bg:           #1c1c21;
  --canvas-menu-item-hover:   rgba(255,255,255,0.08);
}
```

### D4: 迁移策略 - 文件级别批量替换

对每个 canvas 文件，统一替换模式：
- `rgba(15,23,42,0.15)` → `var(--canvas-node-border)`
- `rgba(255,255,255,0.1)` → `var(--canvas-node-border)`
- `bg-surface-dark/45` → 使用内联 `style` 或自定义 Tailwind class
- `text-text-dark` → `text-[var(--canvas-node-fg)]`
- `text-text-muted` → `text-[var(--canvas-node-fg-muted)]`
- 悬停/选中的蓝色保持 `#5b76fe` 或 `var(--color-blue-450)`

## Risks / Trade-offs

- **[风险] Tailwind JIT 与任意值 CSS 变量**：使用 `text-[var(--canvas-node-fg)]` 等 arbitrary value 类，部分旧版 Tailwind 不支持。→ **缓解**：项目已使用 Tailwind v3，支持 arbitrary value；若有问题改为 `style` prop。
- **[风险] 视觉回归**：批量替换颜色可能导致某些特殊节点状态（错误态、加载态）样式丢失。→ **缓解**：每个节点文件修改后进行视觉验证，保留错误/加载态的独立颜色变量。
- **[Trade-off] 新增 token 数量**：新增约 15 个 canvas token 增加了 CSS 维护成本，但换来的是主题一致性和可维护性，长期收益明显。

## Migration Plan

1. 在 `globals.css` 新增 canvas token（亮色 + 暗色）
2. 按文件逐个迁移：先 nodes/，再 ui/，最后 CanvasToolbar/Canvas
3. 每完成一批（nodes 或 ui）后运行 `npx tsc --noEmit` 确认无类型错误
4. Lint 验证：`npm run lint`
5. 视觉验证：截图对比亮/暗主题下各节点外观

**回滚**：所有改动仅限颜色 class 替换，回滚只需 git revert，无数据或 API 风险。

## Open Questions

- 无
