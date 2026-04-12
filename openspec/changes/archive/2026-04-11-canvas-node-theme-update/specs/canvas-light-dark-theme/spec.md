## ADDED Requirements

### Requirement: Canvas nodes respond to global theme setting
Canvas 中所有节点和 UI 组件 SHALL 通过 CSS token 响应全局主题切换（`data-theme="light"` / `data-theme="dark"`），无需硬编码颜色值。

#### Scenario: Node appearance in light theme
- **WHEN** `data-theme` 属性值为 `light`（或未设置，使用默认亮色）
- **THEN** 所有 canvas 节点背景为白色（`--canvas-node-bg: #ffffff`），边框为浅灰色，文字为近黑色（`#1c1c1e`），符合 DESIGN.md Miro 风格

#### Scenario: Node appearance in dark theme
- **WHEN** `data-theme` 属性值为 `dark`
- **THEN** 所有 canvas 节点背景为深蓝灰色（`#111827`），边框为半透明白色（rgba 0.1），文字为浅灰色（`#e2e8f0`）

#### Scenario: Theme switch updates canvas immediately
- **WHEN** 用户在设置中切换主题（亮 ↔ 暗）
- **THEN** canvas 中所有可见节点的背景色、边框色、文字色立即更新，无需刷新页面

### Requirement: Canvas nodes use semantic CSS tokens only
所有 canvas 节点和 UI 组件的颜色 SHALL 仅引用 `--canvas-*` 或现有 `--ui-*` / `--color-*` CSS token，不得使用硬编码的 rgba 颜色字符串。

#### Scenario: No hardcoded canvas colors remain
- **WHEN** 检查 `src/features/canvas/` 目录下所有 `.tsx` 文件
- **THEN** 不存在 `rgba(15,23,42` 或 `rgba(255,255,255,0.1)` 等作为节点主题色使用的硬编码字符串（功能性颜色如黑色遮罩除外）

### Requirement: Canvas drop zones show correct theme-aware dashed border
节点内的图片/视频上传虚线区域 SHALL 使用 `--canvas-drop-zone-border` token 显示边框颜色，并在悬停时使用 `--canvas-drop-zone-hover-bg` 显示背景。

#### Scenario: Drop zone in light theme
- **WHEN** 主题为亮色，用户查看空的上传区域
- **THEN** 虚线边框为深色低透明度（rgba 0.2），悬停时背景为极浅深色（rgba 0.04）

#### Scenario: Drop zone in dark theme
- **WHEN** 主题为暗色，用户查看空的上传区域
- **THEN** 虚线边框为白色中等透明度（rgba 0.25），悬停时背景为极浅白色（rgba 0.04）

### Requirement: Canvas menus and overlays follow theme tokens
NodeToolDialog、NodeActionToolbar、MultiSelectToolbar 等浮动菜单和覆盖层 SHALL 使用 `--canvas-menu-bg` 和 `--canvas-menu-item-hover` token。

#### Scenario: Floating menu background in light theme
- **WHEN** 主题为亮色，用户打开节点的工具菜单
- **THEN** 菜单背景为纯白色，悬停项背景为极浅深色

#### Scenario: Floating menu background in dark theme
- **WHEN** 主题为暗色，用户打开节点的工具菜单
- **THEN** 菜单背景为深色（`#1c1c21`），悬停项背景为极浅白色

### Requirement: canvas-specific tokens defined in globals.css
`src/app/globals.css` SHALL 在 `:root` 和 `[data-theme="dark"]` 块中分别定义所有 `--canvas-*` token。

#### Scenario: Token availability at runtime
- **WHEN** 页面加载，任意主题下
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--canvas-node-bg')` 返回非空字符串
