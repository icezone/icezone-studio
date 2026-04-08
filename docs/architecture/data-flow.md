# 数据流模式

本文档说明 IceZone Studio 的数据流向和层间通信模式。

## 数据流概览

```
用户交互 (UI)
    ↓
Store 更新
    ↓
应用服务
    ↓
API Routes
    ↓
Supabase / Provider
```

## 完整数据流

### 图片生成流程

```
1. 用户输入提示词 (ImageEditNode.tsx)
   ↓
2. 点击"生成"按钮
   ↓
3. 调用应用服务 (imageGenerationService.generate)
   ↓
4. 解析模型定义 (modelRegistry.get)
   ↓
5. 构建 AI 请求 (model.resolveRequest)
   ↓
6. 通过 Gateway 调用 API (aiGateway.generate)
   ↓
7. API Route 处理请求 (/api/ai/image/generate)
   ↓
8. 选择 Provider (getProvider)
   ↓
9. 调用 Provider API (provider.generate)
   ↓
10. 返回结果 URL
   ↓
11. 创建导出节点 (createExportNode)
   ↓
12. 更新画布状态 (canvasStore.addNode)
   ↓
13. 触发持久化 (projectStore.saveDraft)
   ↓
14. 双写持久化 (IndexedDB + Supabase)
   ↓
15. 更新 UI 显示结果节点
```

## 沿着数据流改动

### 原则

**按数据流方向修改**：
```
UI 输入 → Store → 应用服务 → API Routes → Supabase/Provider
```

**禁止跨层"偷改"状态**：尽量只在对应层处理对应职责。

### 示例：新增视频生成参数

#### ❌ 错误做法（跨层修改）

```typescript
// 直接在 UI 层构造请求
function VideoGenNode() {
  const handleGenerate = async () => {
    const response = await fetch('/api/ai/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling/kling-3.0',
        prompt,
        duration: '5s',
        // 新增参数直接硬编码
        aspectRatio: '16:9'
      })
    })
  }
}
```

#### ✅ 正确做法（沿着数据流）

1. **UI 层**（添加输入控件）:
```typescript
function VideoGenNode() {
  const [aspectRatio, setAspectRatio] = useState('16:9')
  
  const handleGenerate = async () => {
    await videoGenerationService.generate({
      model,
      prompt,
      duration,
      aspectRatio  // 传递给应用服务
    })
  }
}
```

2. **应用层**（扩展参数类型）:
```typescript
interface VideoGenerateParams {
  model: string
  prompt: string
  duration: string
  aspectRatio: string  // 新增
}

export async function generate(params: VideoGenerateParams) {
  const model = videoModelRegistry.get(params.model)
  const request = model.resolveRequest(params)  // 模型负责映射
  
  return await videoGateway.generate(request)
}
```

3. **领域层**（模型定义）:
```typescript
export const klingModel: VideoModelDefinition = {
  aspectRatios: ['16:9', '9:16', '1:1'],  // 声明支持的比例
  
  resolveRequest: (params) => ({
    ...params,
    aspectRatio: params.aspectRatio || '16:9'  // 默认值
  })
}
```

4. **API Routes**（请求处理）:
```typescript
export async function POST(request: Request) {
  const body = await request.json()
  
  // 校验参数
  const params = videoGenerateSchema.parse(body)
  
  // 调用 Provider
  const result = await providerRegistry.generate(params)
  
  return Response.json(result)
}
```

5. **基础设施层**（Provider 实现）:
```typescript
class KlingProvider implements VideoProvider {
  async generate(params: VideoGenerateParams) {
    return await fetch('https://kling-api.com/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        duration: params.duration,
        aspect_ratio: params.aspectRatio  // 映射到 Provider API
      })
    })
  }
}
```

## Store 不应直接承担重业务逻辑

### Store 职责

- 状态存储
- 状态更新
- 状态查询

### 应用服务职责

- 业务流程编排
- 数据转换
- 外部调用

### 示例

#### ❌ 错误（Store 包含业务逻辑）

```typescript
const canvasStore = create((set, get) => ({
  nodes: [],
  
  generateImage: async (params) => {
    // ❌ 复杂的业务逻辑不应在 Store 中
    const model = modelRegistry.get(params.model)
    if (!model) throw new Error('Model not found')
    
    const request = model.resolveRequest(params)
    
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    
    if (!response.ok) throw new Error('Generation failed')
    
    const result = await response.json()
    
    const exportNode = {
      id: nanoid(),
      type: 'exportImageNode',
      position: { x: params.x + 300, y: params.y },
      data: { imageUrl: result.imageUrl }
    }
    
    set((state) => ({
      nodes: [...state.nodes, exportNode]
    }))
  }
}))
```

#### ✅ 正确（Store 只管理状态，逻辑在服务层）

```typescript
// canvasStore.ts
const canvasStore = create((set) => ({
  nodes: [],
  
  addNode: (node: CanvasNode) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  
  updateNode: (id: string, updates: Partial<CanvasNode>) => set((state) => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, ...updates } : n
    )
  }))
}))

// imageGenerationService.ts
export async function generate(params: GenerateParams) {
  // 业务逻辑在服务层
  const model = modelRegistry.get(params.model)
  if (!model) throw new Error('Model not found')
  
  const request = model.resolveRequest(params)
  const result = await aiGateway.generate(request)
  
  const exportNode = createExportNode(result, params)
  
  // 调用 Store 更新状态
  canvasStore.getState().addNode(exportNode)
  
  return result
}
```

## 使用 DTO/纯数据对象

### 跨层传递数据

```typescript
// DTO 定义
interface ProjectDTO {
  id: string
  name: string
  data: {
    nodes: CanvasNode[]
    edges: CanvasEdge[]
  }
}

// 应用层
async function saveProject(project: ProjectDTO) {
  await projectPersistence.save(project)
}

// 基础设施层
async function save(project: ProjectDTO) {
  await supabase
    .from('projects')
    .update({
      name: project.name,
      data: project.data
    })
    .eq('id', project.id)
}
```

### 避免双向引用

```typescript
❌ 错误示例（双向引用）：
// canvasStore.ts
import { projectStore } from './projectStore'

export const canvasStore = create(() => ({
  save: () => projectStore.getState().save()
}))

// projectStore.ts
import { canvasStore } from './canvasStore'

export const projectStore = create(() => ({
  save: () => {
    const data = canvasStore.getState().getData()
    // ...
  }
}))

✅ 正确示例（单向依赖）：
// canvasStore.ts
export const canvasStore = create(() => ({
  getData: () => ({ nodes, edges })
}))

// projectStore.ts
import { canvasStore } from './canvasStore'

export const projectStore = create(() => ({
  save: () => {
    const data = canvasStore.getState().getData()
    // ...
  }
}))
```

## 事件总线模式

### 跨模块通信

对于松耦合的模块间通信，使用事件总线：

```typescript
// eventBus.ts
class EventBus {
  private listeners = new Map<string, Function[]>()
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }
  
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(cb => cb(data))
  }
}

export const eventBus = new EventBus()

// 发布方
eventBus.emit('image:generated', { nodeId, imageUrl })

// 订阅方
eventBus.on('image:generated', ({ nodeId, imageUrl }) => {
  console.log('Image generated:', imageUrl)
  updateThumbnail(nodeId, imageUrl)
})
```

## 数据流验证

### 检查跨层调用

```bash
# 搜索 UI 层直接调用 fetch（应通过服务层）
grep -r "await fetch" src/features/canvas/nodes/
```

### 检查 Store 业务逻辑

```bash
# 搜索 Store 中的 fetch/复杂逻辑（应移到服务层）
grep -r "fetch\|axios" src/stores/
```

### 检查双向依赖

```bash
# 搜索循环引用
npx madge --circular src/
```

---

相关文档：
- `layering.md` - 分层架构
- `../standards/code-quality.md` - 代码质量标准
- `performance.md` - 性能优化模式
