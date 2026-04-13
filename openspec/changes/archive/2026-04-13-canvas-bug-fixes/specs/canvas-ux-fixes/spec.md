## ADDED Requirements

### Requirement: Canvas link deletion button is clickable
选中连线时显示的删除按钮 SHALL 响应点击事件并删除该连线。

#### Scenario: User clicks delete button on selected edge
- **WHEN** 用户选中一条连线，点击中间出现的删除按钮
- **THEN** 该连线被删除，画布中对应的 edge 移除

### Requirement: Node header does not display price badge
节点顶部 header 区域 SHALL NOT 显示任何收费信息（如 ¥0.43/次）。

#### Scenario: ImageEditNode header is rendered
- **WHEN** 用户将 ImageEditNode 添加到画布
- **THEN** 节点 header 不显示 NodePriceBadge

#### Scenario: StoryboardGenNode header is rendered
- **WHEN** 用户将 StoryboardGenNode 添加到画布
- **THEN** 节点 header 不显示 NodePriceBadge

### Requirement: StoryboardGenNode textbox fills panel without blank space
分镜生成节点中各 frame 的描述 textarea SHALL 动态调整高度，填满 grid cell 的可用区域，不留空白。

#### Scenario: Node initialized with 2 columns
- **WHEN** 用户创建分镜节点（默认 2 列 1 行）
- **THEN** 每个 frame cell 的 textarea 高度填满 cell 内容区，底部无明显空白

#### Scenario: User changes row/column count
- **WHEN** 用户调整行数或列数
- **THEN** 每个 frame cell 的 textarea 高度重新计算并填满

### Requirement: StoryboardGenNode textbox uses theme-aware background color
分镜节点 textarea 背景色 SHALL 在浅色和深色主题下均显示为适当的颜色。

#### Scenario: Light theme is active
- **WHEN** 用户切换到浅色主题
- **THEN** 分镜节点 textarea 背景为浅色（不过深），与 panel 背景协调

#### Scenario: Dark theme is active
- **WHEN** 用户切换到深色主题
- **THEN** 分镜节点 textarea 背景为深色，与 panel 背景协调

### Requirement: ImageNode default size is consistent with VideoGenNode
AI 图片节点的初始尺寸 SHALL 与 AI 视频节点初始尺寸（560×560）保持一致。

#### Scenario: User adds ImageNode to canvas
- **WHEN** 用户将 AI 图片节点拖入画布
- **THEN** 节点初始宽度为 560px

### Requirement: VideoAnalysisNode and NovelInputNode default width is consistent with StoryboardGenNode
视频分析节点和小说剧本节点的初始宽度 SHALL 不小于 560px，与分镜生成节点宽度保持一致。

#### Scenario: User adds VideoAnalysisNode to canvas
- **WHEN** 用户将视频分析节点拖入画布
- **THEN** 节点初始宽度为 560px

#### Scenario: User adds NovelInputNode to canvas
- **WHEN** 用户将小说剧本输入节点拖入画布
- **THEN** 节点初始宽度为 560px
