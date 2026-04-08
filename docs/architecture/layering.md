# 分层架构

本文档说明 IceZone Studio 的分层架构和 Ports & Adapters 模式。

## 架构概览

IceZone Studio 采用分层架构（Layered Architecture）+ Ports & Adapters 模式，确保领域逻辑与基础设施解耦。

```
┌─────────────────────────────────────┐
│      Presentation Layer (UI)       │  展示层
│     React Components + Zustand     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Application Layer              │  应用层
│   Services + Use Cases + Ports      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Domain Layer                  │  领域层
│   Business Logic + Entities         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Infrastructure Layer (Adapters)   │  基础设施层
│  API Clients + Persistence + ...    │
└─────────────────────────────────────┘
```

## 分层职责

### 展示层（Presentation Layer）

**位置**: `src/features/*/nodes/*.tsx`, `app/(app)/*/page.tsx`

**职责**:
- 渲染 UI 组件
- 处理用户交互（点击、输入、拖拽）
- 调用应用层服务
- 展示应用状态

**禁止**:
- 直接调用基础设施层（API、数据库）
- 包含业务逻辑
- 直接操作 DOM（使用 React）

**示例**:
```typescript
function ImageEditNode({ data }: NodeProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState(data.prompt)
  
  const handleGenerate = async () => {
    // 调用应用层服务
    await imageGenerationService.generate({
      model: data.model,
      prompt
    })
  }
  
  return (
    <div>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <Button onClick={handleGenerate}>{t('common.generate')}</Button>
    </div>
  )
}
```

---

### 应用层（Application Layer）

**位置**: `src/features/canvas/application/`

**职责**:
- 协调业务流程
- 调用领域层逻辑
- 通过 Ports 调用基础设施层
- 数据转换（DTO ↔ Entity）

**禁止**:
- 包含领域业务规则（应放在 Domain Layer）
- 直接实现基础设施逻辑（应通过 Ports）

**示例**:
```typescript
// imageGenerationService.ts
export async function generate(params: GenerateParams) {
  // 1. 解析模型
  const model = modelRegistry.get(params.model)
  
  // 2. 构建请求
  const request = model.resolveRequest(params)
  
  // 3. 通过 Port 调用 AI Gateway
  const result = await aiGateway.generate(request)
  
  // 4. 创建结果节点
  const exportNode = createExportNode(result)
  
  // 5. 更新画布状态
  canvasStore.getState().addNode(exportNode)
  
  return result
}
```

---

### 领域层（Domain Layer）

**位置**: `src/features/canvas/domain/`

**职责**:
- 定义核心业务概念（节点类型、模型、工具）
- 实现业务规则
- 定义 Ports（接口）
- 保持纯粹（无外部依赖）

**禁止**:
- 依赖基础设施层
- 依赖展示层
- 包含 UI 逻辑

**示例**:
```typescript
// canvasNodes.ts
export interface ImageNode {
  id: string
  type: 'imageNode'
  position: { x: number; y: number }
  data: {
    prompt: string
    model: string
    imageUrl?: string
  }
}

// nodeRegistry.ts
export const NODE_REGISTRY: NodeRegistry = {
  imageNode: {
    createDefaultData: () => ({
      prompt: '',
      model: 'kie/nano-banana-2'
    }),
    capabilities: {
      hasPrompt: true,
      hasImage: true
    },
    connectivity: {
      sourceHandle: true,
      targetHandle: true,
      connectMenu: {
        fromSource: true,
        fromTarget: true
      }
    }
  }
}
```

---

### 基础设施层（Infrastructure Layer）

**位置**: `src/features/canvas/infrastructure/`, `src/server/`

**职责**:
- 实现 Ports 定义的接口
- 与外部系统交互（API、数据库、文件系统）
- 数据持久化
- 第三方服务集成

**禁止**:
- 包含业务逻辑（应放在 Domain Layer）
- 直接被展示层调用（应通过应用层）

**示例**:
```typescript
// webAiGateway.ts
export class WebAiGateway implements AiGateway {
  async generate(request: AiRequest): Promise<AiResponse> {
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      throw new Error('AI generation failed')
    }
    
    return await response.json()
  }
}
```

## Ports & Adapters 模式

### Ports（端口）

**定义**: 接口，定义领域层需要的外部能力

**位置**: `src/features/canvas/application/ports.ts`

**示例**:
```typescript
// ports.ts
export interface AiGateway {
  generate(request: AiRequest): Promise<AiResponse>
  cancel(jobId: string): Promise<void>
  getStatus(jobId: string): Promise<JobStatus>
}

export interface VideoAiGateway {
  generate(request: VideoRequest): Promise<VideoResponse>
  poll(jobId: string): Promise<JobStatus>
}

export interface ImageSplitGateway {
  split(imageUrl: string, rows: number, columns: number): Promise<SplitResult>
}

export interface LlmAnalysisGateway {
  reversePrompt(imageUrl: string): Promise<string>
  shotAnalysis(imageUrl: string): Promise<ShotAnalysis>
  novelAnalyze(text: string): Promise<NovelAnalysis>
}
```

### Adapters（适配器）

**定义**: 实现 Ports 接口，连接外部系统

**位置**: `src/features/canvas/infrastructure/`

**示例**:
```typescript
// webAiGateway.ts
export class WebAiGateway implements AiGateway {
  async generate(request: AiRequest): Promise<AiResponse> {
    return await fetch('/api/ai/image/generate', {
      method: 'POST',
      body: JSON.stringify(request)
    }).then(r => r.json())
  }
  
  async cancel(jobId: string): Promise<void> {
    await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
  }
  
  async getStatus(jobId: string): Promise<JobStatus> {
    return await fetch(`/api/jobs/${jobId}`).then(r => r.json())
  }
}
```

### 依赖注入（接线）

**位置**: `src/features/canvas/application/canvasServices.ts`

**示例**:
```typescript
// canvasServices.ts
import { WebAiGateway } from '../infrastructure/webAiGateway'
import { WebVideoGateway } from '../infrastructure/webVideoGateway'
import { WebImageSplitGateway } from '../infrastructure/webImageSplitGateway'
import { WebLlmAnalysisGateway } from '../infrastructure/webLlmAnalysisGateway'

// 创建适配器实例
export const aiGateway = new WebAiGateway()
export const videoGateway = new WebVideoGateway()
export const imageSplitGateway = new WebImageSplitGateway()
export const llmAnalysisGateway = new WebLlmAnalysisGateway()
```

## 依赖方向

### 单向依赖原则

```
Presentation → Application → Domain ← Infrastructure
```

**说明**:
- 展示层依赖应用层
- 应用层依赖领域层
- 基础设施层实现领域层定义的接口
- 领域层不依赖任何层

### 依赖倒置

```
❌ 错误示例（应用层依赖具体实现）：
import { WebAiGateway } from './infrastructure/webAiGateway'

function generateImage() {
  const gateway = new WebAiGateway()
  return gateway.generate()
}

✅ 正确示例（应用层依赖接口）：
import type { AiGateway } from './ports'

function generateImage(gateway: AiGateway) {
  return gateway.generate()
}
```

## 边界管理

### 模块间通信

**优先使用**:
- 接口/类型
- 事件总线
- 明确的 service/port

**禁止**:
- 直接依赖具体实现
- 双向引用
- 跨层调用

### 数据传输对象（DTO）

使用 DTO/纯数据对象跨层传递数据：

```typescript
// DTO
interface ProjectDTO {
  id: string
  name: string
  data: CanvasData
}

// 不要传递 Entity
class Project {
  constructor(public id: string, public name: string) {}
  
  // 业务方法
  validate() { ... }
  serialize() { ... }
}

❌ 错误：跨层传递 Entity
function saveProject(project: Project) { ... }

✅ 正确：跨层传递 DTO
function saveProject(project: ProjectDTO) { ... }
```

## 迁移接缝

IceZone Studio 从桌面版迁移到 Web 版，通过 Ports & Adapters 模式解耦：

### 桌面版（旧）

```typescript
// 直接使用 Electron 模块
import { ipcRenderer } from 'electron'

function generateImage() {
  return ipcRenderer.invoke('ai:generate', params)
}
```

### Web 版（新）

```typescript
// 1. 定义 Port（接口不变）
interface AiGateway {
  generate(params): Promise<Result>
}

// 2. Web 实现
class WebAiGateway implements AiGateway {
  async generate(params) {
    return await fetch('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    }).then(r => r.json())
  }
}

// 3. 应用层使用 Port（代码无需修改）
function generateImage(gateway: AiGateway) {
  return gateway.generate(params)
}
```

## 测试策略

### 单元测试（领域层）

纯业务逻辑，无需 mock：

```typescript
describe('NodeRegistry', () => {
  it('should create default image node data', () => {
    const data = NODE_REGISTRY.imageNode.createDefaultData()
    
    expect(data.prompt).toBe('')
    expect(data.model).toBe('kie/nano-banana-2')
  })
})
```

### 集成测试（应用层）

Mock Ports：

```typescript
describe('ImageGenerationService', () => {
  it('should generate image and create export node', async () => {
    // Mock AiGateway
    const mockGateway: AiGateway = {
      generate: vi.fn().mockResolvedValue({ imageUrl: 'https://...' })
    }
    
    await generateImage(params, mockGateway)
    
    expect(mockGateway.generate).toHaveBeenCalledWith(...)
  })
})
```

### E2E 测试（整体）

测试真实流程，不 mock：

```typescript
test('should generate image from UI', async ({ page }) => {
  await page.click('[data-testid="add-image-node"]')
  await page.fill('[data-testid="prompt"]', 'a sunset')
  await page.click('[data-testid="generate"]')
  
  await page.waitForSelector('[data-testid="export-node"]')
})
```

---

相关文档：
- `codebase-guide.md` - 代码库导航
- `data-flow.md` - 数据流模式
- `../standards/code-quality.md` - 代码质量标准
