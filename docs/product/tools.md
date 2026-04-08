# 工具体系

本文档说明 IceZone Studio 的工具处理能力。

## 工具概览

当前支持 3 种内置工具：

| 工具 | 插件 ID | 功能 | 编辑器 |
|------|---------|------|--------|
| 裁剪 | `cropToolPlugin` | 图片裁剪 | `CropEditor` |
| 标注 | `annotateToolPlugin` | 画笔标注 | `AnnotateEditor` |
| 分镜切割 | `splitStoryboardToolPlugin` | 网格切割 | `SplitStoryboardEditor` |

## 工具架构

工具体系采用插件化架构，分为 4 层：

```
1. 类型定义 (tools/types.ts)
     ↓
2. 工具注册 (tools/builtInTools.ts)
     ↓
3. 编辑器 UI (ui/tool-editors/*)
     ↓
4. 执行器 (application/toolProcessor.ts)
```

### 类型定义

定义工具能力接口：

```typescript
export interface ToolPlugin {
  id: string;
  displayName: string;
  editorKind: 'crop' | 'annotate' | 'splitStoryboard';
  createDefaultAnnotation(): ToolAnnotation;
}
```

### 工具注册

在 `builtInTools.ts` 注册所有内置工具：

```typescript
export const builtInTools: ToolPlugin[] = [
  cropToolPlugin,
  annotateToolPlugin,
  splitStoryboardToolPlugin,
];
```

### 编辑器 UI

每个工具对应一个独立的编辑器组件：

- `CropEditor.tsx` - 裁剪框选择器
- `AnnotateEditor.tsx` - 画笔工具条
- `SplitStoryboardEditor.tsx` - 网格配置器

### 执行器

`toolProcessor.ts` 根据工具类型调用对应的 API 端点：

```typescript
export async function processTool(
  toolId: string,
  imageUrl: string,
  annotation: ToolAnnotation
): Promise<ProcessedResult>
```

## 工具详细说明

### 裁剪工具

**功能**：
- 选择图片的局部区域
- 支持预设比例（1:1、4:3、16:9 等）
- 支持自定义比例

**编辑器参数**：
```typescript
interface CropAnnotation {
  x: number;      // 左上角 X 坐标（像素）
  y: number;      // 左上角 Y 坐标（像素）
  width: number;  // 裁剪宽度（像素）
  height: number; // 裁剪高度（像素）
}
```

**API 端点**: `/api/image/crop`

**输出**：
- 裁剪后的图片 URL
- 自动创建 `exportImageNode` 展示结果

---

### 标注工具

**功能**：
- 在图片上绘制标注
- 可调颜色、线宽、字号

**编辑器参数**：
```typescript
interface AnnotateAnnotation {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  texts: Array<{
    content: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  }>;
}
```

**API 端点**: `/api/image/annotate`（内部通过 sharp 渲染）

**输出**：
- 标注后的图片 URL
- 自动创建 `exportImageNode` 展示结果

---

### 分镜切割工具

**功能**：
- 将图片按网格切割为多个分镜
- 配置行数、列数、线宽

**编辑器参数**：
```typescript
interface SplitStoryboardAnnotation {
  rows: number;       // 行数（1-10）
  columns: number;    // 列数（1-10）
  lineWidth: number;  // 网格线宽度（像素）
}
```

**API 端点**: `/api/image/split`

**输出**：
- 多个分镜图片 URL
- 自动创建多个 `exportImageNode` 展示结果

## 工具使用流程

1. **选择节点**：点击画布上的图片节点
2. **打开工具对话框**：点击节点工具条上的"工具"按钮
3. **选择工具**：在对话框中选择一个工具
4. **配置参数**：通过编辑器 UI 调整参数
5. **预览效果**：实时预览（如果支持）
6. **执行处理**：点击"应用"按钮
7. **查看结果**：自动创建结果节点，显示处理后的图片

## 工具产物规则

**重要原则**：工具处理后生成新节点，不覆盖原节点。

**原因**：
- 保留原始数据，支持撤销
- 符合画布"流式处理"理念
- 便于对比处理前后的效果

**实现**：
- `toolProcessor.ts` 处理完成后返回新图片 URL
- 调用方（如 `NodeToolDialog`）负责创建新节点
- 新节点自动连线到原节点的下游

---

相关文档：
- `../extensions/add-tool.md` - 新增工具指南
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - 图片处理 API
- `../architecture/codebase-guide.md` - 工具代码位置
