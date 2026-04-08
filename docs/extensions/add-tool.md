# 新增工具指南

本文档说明如何在 IceZone Studio 中新增工具（如裁剪、标注、分镜切割）。

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

## 步骤概览

1. 在 `tools/types.ts` 声明能力（如 editor kind）
2. 在 `tools/builtInTools.ts` 注册插件
3. 在 `ui/tool-editors/` 新增对应编辑器
4. 在 `application/toolProcessor.ts` 接入执行逻辑
5. 保证产物仍走"处理后生成新节点"链路，不覆盖原节点

## 步骤详解

### 1. 定义工具类型

**文件**: `src/features/canvas/tools/types.ts`

```typescript
// 添加新的 editor kind
export type ToolEditorKind = 
  | 'crop' 
  | 'annotate' 
  | 'splitStoryboard'
  | 'blur'  // 新增

// 定义工具标注数据结构
export interface BlurAnnotation extends ToolAnnotation {
  kind: 'blur'
  data: {
    regions: Array<{
      x: number
      y: number
      width: number
      height: number
    }>
    intensity: number  // 0-100
  }
}

// 更新联合类型
export type ToolAnnotation = 
  | CropAnnotation 
  | AnnotateAnnotation 
  | SplitStoryboardAnnotation
  | BlurAnnotation  // 新增
```

### 2. 注册工具插件

**文件**: `src/features/canvas/tools/builtInTools.ts`

```typescript
import type { ToolPlugin } from './types'

const blurToolPlugin: ToolPlugin<BlurAnnotation> = {
  id: 'blur',
  displayName: '模糊',
  editorKind: 'blur',
  
  createDefaultAnnotation: () => ({
    kind: 'blur',
    data: {
      regions: [],
      intensity: 50
    }
  }),
  
  // 可选：校验标注数据
  validate: (annotation) => {
    if (annotation.data.regions.length === 0) {
      return { valid: false, error: '至少选择一个区域' }
    }
    if (annotation.data.intensity < 0 || annotation.data.intensity > 100) {
      return { valid: false, error: '强度必须在 0-100 之间' }
    }
    return { valid: true }
  }
}

// 注册到工具列表
export const builtInTools: ToolPlugin[] = [
  cropToolPlugin,
  annotateToolPlugin,
  splitStoryboardToolPlugin,
  blurToolPlugin  // 新增
]
```

### 3. 创建编辑器 UI

**文件**: `src/features/canvas/ui/tool-editors/BlurEditor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from '@/i18n'
import type { BlurAnnotation } from '../../tools/types'
import { Button, Slider } from '@/components/ui/primitives'

interface BlurEditorProps {
  imageUrl: string
  annotation: BlurAnnotation
  onChange: (annotation: BlurAnnotation) => void
}

export function BlurEditor({ imageUrl, annotation, onChange }: BlurEditorProps) {
  const { t } = useTranslation()
  const [regions, setRegions] = useState(annotation.data.regions)
  const [intensity, setIntensity] = useState(annotation.data.intensity)
  
  const handleAddRegion = (x: number, y: number, width: number, height: number) => {
    const newRegions = [...regions, { x, y, width, height }]
    setRegions(newRegions)
    
    onChange({
      ...annotation,
      data: {
        regions: newRegions,
        intensity
      }
    })
  }
  
  const handleIntensityChange = (value: number) => {
    setIntensity(value)
    
    onChange({
      ...annotation,
      data: {
        regions,
        intensity: value
      }
    })
  }
  
  return (
    <div className="blur-editor">
      {/* 图片预览 + 选择区域 */}
      <div className="image-container">
        <img src={imageUrl} alt="preview" />
        <canvas 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
      
      {/* 强度滑块 */}
      <div className="controls">
        <label>{t('tool.blur.intensity')}</label>
        <Slider 
          min={0}
          max={100}
          value={intensity}
          onChange={handleIntensityChange}
        />
        <span>{intensity}</span>
      </div>
      
      {/* 区域列表 */}
      <div className="regions">
        <h4>{t('tool.blur.regions')}</h4>
        {regions.map((region, i) => (
          <div key={i} className="region-item">
            <span>区域 {i + 1}</span>
            <Button onClick={() => handleRemoveRegion(i)}>
              {t('common.delete')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4. 接入执行逻辑

**文件**: `src/features/canvas/application/toolProcessor.ts`

```typescript
export async function processTool(
  toolId: string,
  imageUrl: string,
  annotation: ToolAnnotation
): Promise<ProcessedResult> {
  switch (toolId) {
    case 'crop':
      return await processCrop(imageUrl, annotation as CropAnnotation)
    
    case 'annotate':
      return await processAnnotate(imageUrl, annotation as AnnotateAnnotation)
    
    case 'splitStoryboard':
      return await processSplitStoryboard(imageUrl, annotation as SplitStoryboardAnnotation)
    
    case 'blur':  // 新增
      return await processBlur(imageUrl, annotation as BlurAnnotation)
    
    default:
      throw new Error(`Unknown tool: ${toolId}`)
  }
}

async function processBlur(
  imageUrl: string,
  annotation: BlurAnnotation
): Promise<ProcessedResult> {
  const response = await fetch('/api/image/blur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl,
      regions: annotation.data.regions,
      intensity: annotation.data.intensity
    })
  })
  
  if (!response.ok) {
    throw new Error('Blur processing failed')
  }
  
  const { imageUrl: resultUrl } = await response.json()
  
  return {
    imageUrls: [resultUrl]  // 单个结果
  }
}
```

### 5. 创建 API 端点

**文件**: `app/api/image/blur/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'

const schema = z.object({
  imageUrl: z.string().url(),
  regions: z.array(z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  })),
  intensity: z.number().min(0).max(100)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = schema.parse(body)
    
    // 下载原图
    const imageResponse = await fetch(params.imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    
    // 使用 sharp 处理
    let image = sharp(Buffer.from(imageBuffer))
    
    // 对每个区域应用模糊
    for (const region of params.regions) {
      const regionBuffer = await image
        .extract({
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height
        })
        .blur(params.intensity / 10)  // sharp blur 参数范围 0-10
        .toBuffer()
      
      image = image.composite([{
        input: regionBuffer,
        left: region.x,
        top: region.y
      }])
    }
    
    // 输出结果
    const resultBuffer = await image.toBuffer()
    
    // 上传到存储
    const resultUrl = await uploadToStorage(resultBuffer, 'image/png')
    
    return NextResponse.json({ imageUrl: resultUrl })
    
  } catch (error) {
    console.error('Blur processing error:', error)
    return NextResponse.json(
      { error: 'Blur processing failed' },
      { status: 500 }
    )
  }
}
```

### 6. 添加 i18n

```json
// zh.json
{
  "tool": {
    "blur": {
      "name": "模糊",
      "intensity": "模糊强度",
      "regions": "模糊区域"
    }
  }
}

// en.json
{
  "tool": {
    "blur": {
      "name": "Blur",
      "intensity": "Blur Intensity",
      "regions": "Blur Regions"
    }
  }
}
```

### 7. 工具产物规则

**重要原则**：工具处理后生成新节点，不覆盖原节点。

```typescript
// NodeToolDialog.tsx
const handleApplyTool = async () => {
  // 执行工具处理
  const result = await processTool(selectedTool.id, node.data.imageUrl, annotation)
  
  // 为每个结果图片创建新节点
  result.imageUrls.forEach((imageUrl, index) => {
    const exportNode = {
      id: nanoid(),
      type: 'exportImageNode',
      position: {
        x: node.position.x + 300,
        y: node.position.y + index * 100
      },
      data: {
        imageUrl,
        toolId: selectedTool.id
      }
    }
    
    canvasStore.getState().addNode(exportNode)
  })
  
  // 关闭对话框
  onClose()
}
```

**原因**：
- 保留原始数据，支持撤销
- 符合画布"流式处理"理念
- 便于对比处理前后的效果

## 完整示例：旋转工具

### 1. 定义类型

```typescript
// tools/types.ts
export interface RotateAnnotation extends ToolAnnotation {
  kind: 'rotate'
  data: {
    angle: number  // 旋转角度（0-360）
  }
}
```

### 2. 注册插件

```typescript
// tools/builtInTools.ts
const rotateToolPlugin: ToolPlugin<RotateAnnotation> = {
  id: 'rotate',
  displayName: '旋转',
  editorKind: 'rotate',
  
  createDefaultAnnotation: () => ({
    kind: 'rotate',
    data: {
      angle: 0
    }
  }),
  
  validate: (annotation) => {
    if (annotation.data.angle < 0 || annotation.data.angle >= 360) {
      return { valid: false, error: '角度必须在 0-360 之间' }
    }
    return { valid: true }
  }
}

export const builtInTools = [
  // ...
  rotateToolPlugin
]
```

### 3. 创建编辑器

```typescript
// ui/tool-editors/RotateEditor.tsx
export function RotateEditor({ imageUrl, annotation, onChange }: RotateEditorProps) {
  const { t } = useTranslation()
  const [angle, setAngle] = useState(annotation.data.angle)
  
  const handleAngleChange = (value: number) => {
    setAngle(value)
    onChange({
      ...annotation,
      data: { angle: value }
    })
  }
  
  return (
    <div className="rotate-editor">
      <div className="preview">
        <img 
          src={imageUrl} 
          alt="preview"
          style={{ transform: `rotate(${angle}deg)` }}
        />
      </div>
      
      <div className="controls">
        <label>{t('tool.rotate.angle')}</label>
        <Slider 
          min={0}
          max={360}
          value={angle}
          onChange={handleAngleChange}
        />
        <span>{angle}°</span>
        
        <div className="presets">
          <Button onClick={() => handleAngleChange(90)}>90°</Button>
          <Button onClick={() => handleAngleChange(180)}>180°</Button>
          <Button onClick={() => handleAngleChange(270)}>270°</Button>
        </div>
      </div>
    </div>
  )
}
```

### 4. 接入执行器

```typescript
// application/toolProcessor.ts
case 'rotate':
  return await processRotate(imageUrl, annotation as RotateAnnotation)

async function processRotate(
  imageUrl: string,
  annotation: RotateAnnotation
): Promise<ProcessedResult> {
  const response = await fetch('/api/image/rotate', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl,
      angle: annotation.data.angle
    })
  })
  
  const { imageUrl: resultUrl } = await response.json()
  
  return { imageUrls: [resultUrl] }
}
```

### 5. API 端点

```typescript
// app/api/image/rotate/route.ts
export async function POST(request: NextRequest) {
  const { imageUrl, angle } = await request.json()
  
  const imageResponse = await fetch(imageUrl)
  const imageBuffer = await imageResponse.arrayBuffer()
  
  const resultBuffer = await sharp(Buffer.from(imageBuffer))
    .rotate(angle)
    .toBuffer()
  
  const resultUrl = await uploadToStorage(resultBuffer, 'image/png')
  
  return NextResponse.json({ imageUrl: resultUrl })
}
```

## 检查清单

- [ ] 在 `tools/types.ts` 定义工具类型和标注数据结构
- [ ] 在 `tools/builtInTools.ts` 注册工具插件
- [ ] 创建编辑器 UI 组件（`ui/tool-editors/*.tsx`）
- [ ] 在 `toolProcessor.ts` 接入执行逻辑
- [ ] 创建 API 端点（`app/api/image/<tool>/route.ts`）
- [ ] 添加 i18n 翻译
- [ ] 确保产物生成新节点，不覆盖原节点
- [ ] 编写单元测试
- [ ] 在 UI 中验证工具可用
- [ ] 测试工具处理功能

---

相关文档：
- `../product/tools.md` - 工具体系说明
- `../api/endpoints.md` - 图片处理 API
- `../architecture/codebase-guide.md` - 工具代码位置
- `../standards/ui-guidelines.md` - UI 规范
