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
- 视频场景检测
- 关键帧提取

**输入**：
- 必需：视频 URL

**输出**：
- 场景边界时间戳
- 关键帧图片 URL

**连线**：
- 输出端口：✅
- 输入端口：✅

**关联 API**: `/api/video/analyze`

---

相关文档：
- `../extensions/add-node.md` - 新增节点指南
- `models.md` - AI 模型清单
- `tools.md` - 工具体系
- `../architecture/codebase-guide.md` - 节点代码位置
