# 节点类型清单

本文档详细列出 IceZone Studio 支持的所有节点类型（共 11 种）。

## 节点类型表

| 节点 | 类型 ID | 菜单可见 | 说明 |
|------|---------|---------|------|
| 上传图片 | `uploadNode` | ✅ | 图片上传/导入，支持宽高比管理 |
| 图片编辑 | `imageNode` | ✅ | AI 图片生成与编辑 |
| 导出结果 | `exportImageNode` | 流程创建 | 生成/处理结果展示 |
| 文字标注 | `textAnnotationNode` | ✅ | 画布文字注释 |
| 编组 | `groupNode` | 流程创建 | 节点分组/组织 |
| 分镜拆分 | `storyboardNode` | ✅ | 网格切割与导出 |
| 分镜生成 | `storyboardGenNode` | ✅ | AI 分镜描述 + 参考图 + 批量生成 |
| 视频生成 | `videoGenNode` | ✅ | 视频生成（文字/图片驱动） |
| 视频结果 | `videoResultNode` | 流程创建 | 视频生成结果播放 |
| 小说输入 | `novelInputNode` | ✅ | 小说/剧本文本分析与拆分 (N4) |
| 视频分析 | `videoAnalysisNode` | ✅ | 视频场景检测与关键帧提取 (N1) |

## 节点分类

### 用户可手动创建

这些节点在节点选择菜单中可见：
- `uploadNode` - 上传图片
- `imageNode` - 图片编辑
- `textAnnotationNode` - 文字标注
- `storyboardNode` - 分镜拆分
- `storyboardGenNode` - 分镜生成
- `videoGenNode` - 视频生成
- `novelInputNode` - 小说输入
- `videoAnalysisNode` - 视频分析

### 仅流程创建

这些节点由应用流程自动创建，不出现在菜单中：
- `exportImageNode` - AI 生成或工具处理后自动创建
- `groupNode` - 多选节点后手动编组创建
- `videoResultNode` - 视频生成完成后自动创建

## 节点注册规则

### 单一真相源

节点类型、默认数据、菜单展示、连线能力统一在 `domain/nodeRegistry.ts` 声明，禁止在其他地方重复硬编码。

### 连线能力配置（connectivity）

每个节点在注册表中定义 `connectivity` 配置：

```typescript
connectivity: {
  sourceHandle: boolean,    // 是否具备输出端口
  targetHandle: boolean,    // 是否具备输入端口
  connectMenu: {
    fromSource: boolean,    // 从输出端拉线时，是否出现在创建菜单
    fromTarget: boolean     // 从输入端拉线时，是否出现在创建菜单
  }
}
```

### 菜单候选节点

菜单候选节点必须由注册表函数统一推导（如 `getConnectMenuNodeTypes`），禁止在 UI 层手写类型白名单。

### 内部衍生节点

内部衍生节点（如 `exportImageNode`、`groupNode`）默认 `connectMenu` 关闭，只能由应用流程自动创建。

## 节点详细说明

### uploadNode（上传图片）

**功能**：
- 本地图片上传
- URL 导入
- 宽高比约束管理

**输出**：
- 图片 URL（用于后续节点）
- 图片元数据（宽度、高度、格式）

**连线**：
- 输出端口：✅
- 输入端口：❌

---

### imageNode（图片编辑）

**功能**：
- AI 图片生成（文字驱动）
- AI 图片编辑（图片 + 文字驱动）
- 支持 7 个模型（KIE、FAL、GRSAI、PPIO）

**输入**：
- 可选：参考图片（从上游节点）
- 必需：提示词

**输出**：
- 生成的图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### exportImageNode（导出结果）

**功能**：
- 展示生成/处理后的图片
- 提供下载按钮

**输入**：
- 必需：图片 URL（从上游节点）

**连线**：
- 输出端口：❌
- 输入端口：✅

**创建方式**：
- 自动创建（AI 生成完成后）
- 自动创建（工具处理完成后）

---

### textAnnotationNode（文字标注）

**功能**：
- 画布上添加文字注释
- 支持 Markdown 格式

**连线**：
- 输出端口：❌
- 输入端口：❌

---

### groupNode（编组）

**功能**：
- 将多个节点组织为一个逻辑分组
- 支持折叠/展开
- 支持嵌套分组

**创建方式**：
- 多选节点后，点击"编组"按钮

**连线**：
- 输出端口：❌
- 输入端口：❌

---

### storyboardNode（分镜拆分）

**功能**：
- 将图片按网格切割为多个分镜
- 配置行数、列数、线宽

**输入**：
- 必需：图片 URL

**输出**：
- 多个分镜图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### storyboardGenNode（分镜生成）

**功能**：
- 输入分镜描述，AI 生成参考图
- 支持批量生成（一次生成多个分镜）

**输入**：
- 必需：分镜描述列表

**输出**：
- 多个生成的图片 URL

**连线**：
- 输出端口：✅
- 输入端口：❌

---

### videoGenNode（视频生成）

**功能**：
- 文字驱动视频生成
- 图片驱动视频生成（Image-to-Video）
- 支持 5 个模型（Kling、Sora2、VEO）

**输入**：
- 可选：参考图片
- 必需：提示词

**输出**：
- 视频 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

---

### videoResultNode（视频结果）

**功能**：
- 播放生成的视频
- 提供下载按钮

**输入**：
- 必需：视频 URL

**连线**：
- 输出端口：❌
- 输入端口：✅

**创建方式**：
- 自动创建（视频生成完成后）

---

### novelInputNode（小说输入）

**功能**：
- 输入小说/剧本文本
- AI 自动拆分场景
- 提取角色列表

**输出**：
- 场景描述列表
- 角色信息

**连线**：
- 输出端口：✅
- 输入端口：❌

**关联 API**: `/api/ai/novel-analyze`

---

### videoAnalysisNode（视频分析）

**功能**：
- 拖拽或点击上传视频，自动通过 `/api/assets/video-upload` 走签名上传
- 基于像素差值的场景检测 + 关键帧抽取（ffmpeg scene filter）
- 首批前 10 帧自动调用 Gemini 做整段镜头语言分析（运镜 / 主体 / 光影）
- 每个关键帧自动反推 prompt（默认并发 3），支持 EN / 中文 切换
- 选中场景后一键展开为多个 `uploadNode`，或打包为一个 `storyboardSplitNode`

**输入**：
- 必需：本地视频文件（拖拽或文件选择）
- 可选：调整灵敏度（0.1-1.0）、最短场景时长（200ms-2s）、最大关键帧数（1-200）

**输出**：
- `analysisId` + 场景数组（`startTimeMs` / `endTimeMs` / `keyframeUrl` / `confidence`）
- 每个场景附带 `reversePrompt`（成功）或 `reversePromptError`（失败）
- 节点级 `shotAnalysis`（`shotType` / `cameraMovement` / `mood` / `composition` 等）

**连线**：
- 输入端口：✅
- 输出端口：✅（选中场景一键 fan-out 到 upload 或 storyboard 节点）

**关联 API**：
- `/api/assets/video-upload`（签名上传 URL）
- `/api/video/analyze`（场景检测 + 关键帧上传）
- `/api/ai/shot-analysis`（整段镜头语言分析）
- `/api/ai/reverse-prompt`（逐帧提示词反推）

**已知限制**（MVP）：
- 同步模式硬超时 280s，长视频请拆分后再传
- Gemini 未配置 key 时 shot-analysis / reverse-prompt 返回 503，但场景检测仍可用

---

相关文档：
- `../extensions/add-node.md` - 新增节点指南
- `models.md` - AI 模型清单
- `tools.md` - 工具体系
- `../architecture/codebase-guide.md` - 节点代码位置
