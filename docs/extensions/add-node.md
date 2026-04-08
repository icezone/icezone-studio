# 新增节点指南

本文档说明如何在 IceZone Studio 中新增节点类型。

## 步骤概览

1. 在 `domain/canvasNodes.ts` 增加类型与数据结构
2. 在 `domain/nodeRegistry.ts` 注册定义
3. 在 `nodes/index.ts` 注册渲染组件
4. 明确手动创建策略
5. 验证删除、解组、连线清理与历史快照
6. 节点内控制条复用统一尺寸 token
7. 节点工具条复用配置

## 步骤详解

### 1. 定义节点类型与数据结构

**文件**: `src/features/canvas/domain/canvasNodes.ts`

```typescript
// 定义节点数据类型
export interface CustomNode {
  id: string
  type: 'customNode'
  position: { x: number; y: number }
  data: {
    title: string
    description: string
    // ...其他字段
  }
}

// 添加类型守卫（可选，但推荐）
export function isCustomNode(node: CanvasNode): node is CustomNode {
  return node.type === 'customNode'
}

// 更新联合类型
export type CanvasNode = 
  | UploadNode
  | ImageNode
  | CustomNode  // 新增
  // ...其他节点类型
```

### 2. 注册节点定义

**文件**: `src/features/canvas/domain/nodeRegistry.ts`

```typescript
export const NODE_REGISTRY: NodeRegistry = {
  // ...现有节点
  
  customNode: {
    // 创建默认数据
    createDefaultData: () => ({
      title: '',
      description: ''
    }),
    
    // 节点能力
    capabilities: {
      hasPrompt: false,
      hasImage: false,
      hasVideo: false,
      canGroup: true,
      canDelete: true
    },
    
    // 连线能力
    connectivity: {
      sourceHandle: true,    // 是否有输出端口
      targetHandle: true,    // 是否有输入端口
      connectMenu: {
        fromSource: true,    // 从输出端拉线时是否出现在菜单
        fromTarget: true     // 从输入端拉线时是否出现在菜单
      }
    }
  }
}
```

### 3. 注册渲染组件

**文件**: `src/features/canvas/nodes/index.ts`

```typescript
import { CustomNode } from './CustomNode'

export const nodeTypes = {
  // ...现有节点
  customNode: CustomNode
}
```

**创建组件文件**: `src/features/canvas/nodes/CustomNode.tsx`

```typescript
'use client'

import { memo } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { useTranslation } from '@/i18n'
import type { CustomNode as CustomNodeType } from '../domain/canvasNodes'

export const CustomNode = memo(({ id, data, selected }: NodeProps<CustomNodeType['data']>) => {
  const { t } = useTranslation()
  
  return (
    <div className="custom-node">
      {/* 输入端口 */}
      <Handle type="target" position={Position.Left} />
      
      {/* 节点内容 */}
      <div className="node-content">
        <h3>{t('nodeDisplayName.customNode')}</h3>
        <input 
          value={data.title} 
          onChange={(e) => handleUpdateData({ title: e.target.value })}
        />
      </div>
      
      {/* 输出端口 */}
      <Handle type="source" position={Position.Right} />
    </div>
  )
})
```

### 4. 明确手动创建策略

**可手动创建**（配置 `connectMenu`）:

```typescript
connectivity: {
  connectMenu: {
    fromSource: true,
    fromTarget: true
  }
}
```

这样节点会出现在：
- 画布空白处的"添加节点"菜单
- 从节点输出端拉线时的"创建节点"菜单

**仅流程创建**（关闭 `connectMenu`）:

```typescript
connectivity: {
  connectMenu: {
    fromSource: false,
    fromTarget: false
  }
}
```

这样节点只能由应用流程自动创建（如 `exportImageNode`、`groupNode`）。

### 5. 验证删除、解组、连线清理与历史快照

如新增分组/父子节点行为，必须同步验证：

#### 删除节点

```typescript
test('should delete custom node and its connections', () => {
  const node = createCustomNode()
  const edge = createEdge(node.id, otherNode.id)
  
  canvasStore.getState().addNode(node)
  canvasStore.getState().addEdge(edge)
  
  canvasStore.getState().deleteNode(node.id)
  
  expect(canvasStore.getState().nodes).not.toContain(node)
  expect(canvasStore.getState().edges).not.toContain(edge)
})
```

#### 解组节点

```typescript
test('should ungroup custom node', () => {
  const group = createGroupNode()
  const customNode = createCustomNode({ parentId: group.id })
  
  canvasStore.getState().ungroupNodes([group.id])
  
  const node = canvasStore.getState().getNode(customNode.id)
  expect(node.parentId).toBeUndefined()
})
```

#### 连线清理

```typescript
test('should cleanup connections when node is deleted', () => {
  const node1 = createCustomNode()
  const node2 = createCustomNode()
  const edge = createEdge(node1.id, node2.id)
  
  canvasStore.getState().addNodes([node1, node2])
  canvasStore.getState().addEdge(edge)
  
  canvasStore.getState().deleteNode(node1.id)
  
  expect(canvasStore.getState().edges).toHaveLength(0)
})
```

#### 历史快照

```typescript
test('should record custom node in history', () => {
  const node = createCustomNode()
  
  canvasStore.getState().addNode(node)
  
  canvasStore.getState().undo()
  expect(canvasStore.getState().nodes).not.toContain(node)
  
  canvasStore.getState().redo()
  expect(canvasStore.getState().nodes).toContain(node)
})
```

### 6. 节点控制条复用统一尺寸 token

**文件**: `src/features/canvas/ui/nodeControlStyles.ts`

```typescript
export const controlBarHeight = 48
export const buttonSize = 32
export const iconSize = 16
export const spacing = 8
```

**在节点中使用**:

```typescript
import {
  controlBarHeight,
  buttonSize,
  iconSize,
  spacing
} from '../ui/nodeControlStyles'

<div className="control-bar" style={{ height: controlBarHeight }}>
  <Button size={buttonSize}>
    <Icon size={iconSize} />
  </Button>
</div>
```

**禁止**：在各节点散落硬编码一套新尺寸。

### 7. 节点工具条复用配置

**文件**: `src/features/canvas/ui/nodeToolbarConfig.ts`

```typescript
import { getToolbarPosition } from './nodeToolbarConfig'

<NodeToolbar position={getToolbarPosition('top')} />
```

**禁止**：通过 `left/translate` 等绝对定位覆盖跟随逻辑。

## 完整示例

### 新增 "Text to Speech" 节点

#### 1. 定义类型

```typescript
// canvasNodes.ts
export interface TextToSpeechNode {
  id: string
  type: 'textToSpeechNode'
  position: { x: number; y: number }
  data: {
    text: string
    voice: string
    audioUrl?: string
  }
}

export function isTextToSpeechNode(node: CanvasNode): node is TextToSpeechNode {
  return node.type === 'textToSpeechNode'
}

export type CanvasNode = 
  | UploadNode
  | ImageNode
  | TextToSpeechNode
  // ...
```

#### 2. 注册定义

```typescript
// nodeRegistry.ts
export const NODE_REGISTRY: NodeRegistry = {
  textToSpeechNode: {
    createDefaultData: () => ({
      text: '',
      voice: 'default'
    }),
    
    capabilities: {
      hasPrompt: true,
      hasAudio: true
    },
    
    connectivity: {
      sourceHandle: true,
      targetHandle: false,
      connectMenu: {
        fromSource: true,
        fromTarget: false
      }
    }
  }
}
```

#### 3. 创建组件

```typescript
// TextToSpeechNode.tsx
'use client'

import { memo, useState } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { useTranslation } from '@/i18n'
import { Button, Textarea, Select } from '@/components/ui/primitives'
import { controlBarHeight, buttonSize } from '../ui/nodeControlStyles'

export const TextToSpeechNode = memo(({ id, data }: NodeProps) => {
  const { t } = useTranslation()
  const [text, setText] = useState(data.text)
  const [voice, setVoice] = useState(data.voice)
  
  const handleGenerate = async () => {
    const result = await textToSpeechService.generate({
      text,
      voice
    })
    
    updateNodeData(id, { audioUrl: result.audioUrl })
  }
  
  return (
    <div className="text-to-speech-node">
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header">
        <h3>{t('nodeDisplayName.textToSpeech')}</h3>
      </div>
      
      <div className="node-body">
        <Textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          placeholder={t('node.textToSpeech.textPlaceholder')}
        />
        
        <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
          <option value="default">{t('voice.default')}</option>
          <option value="female">{t('voice.female')}</option>
          <option value="male">{t('voice.male')}</option>
        </Select>
      </div>
      
      <div className="control-bar" style={{ height: controlBarHeight }}>
        <Button 
          size={buttonSize}
          onClick={handleGenerate}
          disabled={!text}
        >
          {t('common.generate')}
        </Button>
      </div>
      
      {data.audioUrl && (
        <audio src={data.audioUrl} controls />
      )}
    </div>
  )
})
```

#### 4. 注册组件

```typescript
// nodes/index.ts
import { TextToSpeechNode } from './TextToSpeechNode'

export const nodeTypes = {
  // ...
  textToSpeechNode: TextToSpeechNode
}
```

#### 5. 添加 i18n

```json
// zh.json
{
  "nodeDisplayName": {
    "textToSpeech": "文字转语音"
  },
  "node": {
    "textToSpeech": {
      "textPlaceholder": "输入要转换的文字"
    }
  },
  "voice": {
    "default": "默认",
    "female": "女声",
    "male": "男声"
  }
}

// en.json
{
  "nodeDisplayName": {
    "textToSpeech": "Text to Speech"
  },
  "node": {
    "textToSpeech": {
      "textPlaceholder": "Enter text to convert"
    }
  },
  "voice": {
    "default": "Default",
    "female": "Female",
    "male": "Male"
  }
}
```

#### 6. 编写测试

```typescript
// TextToSpeechNode.test.ts
describe('TextToSpeechNode', () => {
  it('should create node with default data', () => {
    const node = NODE_REGISTRY.textToSpeechNode.createDefaultData()
    
    expect(node.text).toBe('')
    expect(node.voice).toBe('default')
  })
  
  it('should have source handle but no target handle', () => {
    const config = NODE_REGISTRY.textToSpeechNode.connectivity
    
    expect(config.sourceHandle).toBe(true)
    expect(config.targetHandle).toBe(false)
  })
})
```

## 检查清单

- [ ] 在 `canvasNodes.ts` 定义类型
- [ ] 在 `nodeRegistry.ts` 注册定义
- [ ] 在 `nodes/index.ts` 注册组件
- [ ] 创建节点组件文件
- [ ] 配置 `connectivity` 和 `connectMenu`
- [ ] 添加 i18n 翻译
- [ ] 编写单元测试
- [ ] 验证删除、解组、连线清理
- [ ] 节点控制条使用 `nodeControlStyles.ts`
- [ ] 节点工具条使用 `nodeToolbarConfig.ts`

---

相关文档：
- `../product/nodes.md` - 节点类型清单
- `../architecture/codebase-guide.md` - 节点代码位置
- `../standards/code-quality.md` - 代码质量标准
- `../standards/ui-guidelines.md` - UI 规范
