# 代码质量标准

本文档说明 IceZone Studio 的代码质量标准和架构约束。

## 单一职责原则

### 文件职责

- **一个文件只做一个业务概念**
- 无法用三句话说清职责就应拆分
- 工具 UI、工具数据结构、工具执行逻辑应分离

**示例**（工具体系）：
- `tools/types.ts` - 类型定义
- `tools/builtInTools.ts` - 工具注册
- `ui/tool-editors/CropEditor.tsx` - 裁剪工具编辑器
- `application/toolProcessor.ts` - 工具执行逻辑

### 模块职责

每个模块应有清晰的边界：
- **展示层（UI）**：只负责渲染和用户交互
- **应用层（Application）**：协调业务逻辑
- **领域层（Domain）**：核心业务规则
- **基础设施层（Infrastructure）**：外部依赖适配

## 文件规模控制

### 舒适区

- **类文件**：≤ 400 行
- **脚本文件**：≤ 300 行

### 警戒线

- **800 行**：必须评估拆分

### 强制拆分

- **1000 行**：必须拆分（纯数据定义除外）

### 拆分策略

**按职责拆分**：
```
❌ ImageEditNode.tsx (1200 行)
   - UI 渲染
   - 表单处理
   - API 调用
   - 状态管理

✅ 拆分为：
   - ImageEditNode.tsx (300 行) - UI 渲染
   - useImageEditForm.ts (200 行) - 表单逻辑
   - imageEditApi.ts (150 行) - API 调用
   - imageEditState.ts (200 行) - 状态管理
```

**按特性拆分**：
```
❌ canvasStore.ts (1500 行)
   - 节点管理
   - 边管理
   - 历史记录
   - 持久化

✅ 拆分为：
   - canvasStore.ts (200 行) - 主 store
   - canvasNodesSlice.ts (300 行) - 节点管理
   - canvasEdgesSlice.ts (200 行) - 边管理
   - canvasHistorySlice.ts (400 行) - 历史记录
   - canvasPersistenceSlice.ts (300 行) - 持久化
```

## 层间通信

### 使用 DTO/纯数据对象

**禁止直接传递实体**：
```typescript
❌ 错误示例：
function saveProject(project: ProjectEntity) {
  // ProjectEntity 包含业务方法，跨层传递会导致耦合
}

✅ 正确示例：
interface ProjectDTO {
  id: string
  name: string
  data: CanvasData
}

function saveProject(project: ProjectDTO) {
  // DTO 是纯数据对象，无业务逻辑
}
```

### 避免双向引用

**单向依赖原则**：
```
UI → Application → Domain → Infrastructure

✅ UI 可以调用 Application
❌ Application 不应依赖 UI

✅ Application 可以调用 Domain
❌ Domain 不应依赖 Application

✅ Infrastructure 实现 Domain 定义的接口
❌ Domain 不应依赖 Infrastructure 的具体实现
```

### Store 不承担重业务逻辑

**Store 职责**：
- 状态存储
- 状态更新
- 状态查询

**应用服务职责**：
- 业务流程编排
- 数据转换
- 外部调用

**示例**：
```typescript
❌ 错误示例（Store 包含业务逻辑）：
const canvasStore = create((set) => ({
  generateImage: async (params) => {
    // ❌ 复杂的业务逻辑不应在 Store 中
    const model = resolveModel(params.modelId)
    const request = model.resolveRequest(params)
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    const result = await response.json()
    set((state) => ({
      nodes: [...state.nodes, createExportNode(result)]
    }))
  }
}))

✅ 正确示例（Store 只管理状态）：
// canvasStore.ts
const canvasStore = create((set) => ({
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  }))
}))

// imageGenerationService.ts
export async function generateImage(params) {
  const model = resolveModel(params.modelId)
  const request = model.resolveRequest(params)
  const response = await fetch('/api/ai/image/generate', {
    method: 'POST',
    body: JSON.stringify(request)
  })
  const result = await response.json()
  
  // 调用 Store 更新状态
  canvasStore.getState().addNode(createExportNode(result))
  
  return result
}
```

## 依赖与边界

### 模块间优先依赖接口

```typescript
❌ 错误示例（依赖具体实现）：
import { WebAiGateway } from './infrastructure/webAiGateway'

function generateImage() {
  const gateway = new WebAiGateway()
  return gateway.generate()
}

✅ 正确示例（依赖接口）：
import type { AiGateway } from './application/ports'

function generateImage(gateway: AiGateway) {
  return gateway.generate()
}
```

### 跨模块通信使用事件总线

```typescript
// 发布事件
eventBus.emit('image:generated', { nodeId, imageUrl })

// 订阅事件
eventBus.on('image:generated', ({ nodeId, imageUrl }) => {
  // 更新 UI
})
```

### 展示层不直接调用基础设施层

```typescript
❌ 错误示例（UI 直接调用 API）：
function ImageEditNode() {
  const handleGenerate = async () => {
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    })
    // ...
  }
}

✅ 正确示例（通过应用服务中转）：
function ImageEditNode() {
  const handleGenerate = async () => {
    await imageGenerationService.generate(params)
  }
}
```

## 节点注册单一真相源

### 统一在 nodeRegistry.ts 声明

- 节点类型
- 默认数据
- 菜单展示
- 连线能力

**禁止**：在 `Canvas.tsx` / `canvasStore.ts` 重复硬编码

### connectivity 配置源

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

### 菜单候选节点推导

```typescript
✅ 正确示例（从注册表推导）：
function getConnectMenuNodeTypes(direction: 'source' | 'target') {
  return Object.entries(NODE_REGISTRY)
    .filter(([_, def]) => 
      direction === 'source' 
        ? def.connectivity.connectMenu.fromSource
        : def.connectivity.connectMenu.fromTarget
    )
    .map(([type, _]) => type)
}

❌ 错误示例（UI 层硬编码）：
const menuNodeTypes = ['uploadNode', 'imageNode', 'videoGenNode']
```

### 内部衍生节点

内部衍生节点（如 `exportImageNode`、`groupNode`）默认 `connectMenu` 关闭，只能由应用流程自动创建。

## 文档边界

### 技术开发规范文档

**应记录**：
- 稳定的架构约束
- 分层规则
- 扩展流程
- 验证标准

**不应记录**：
- 易变的 UI 操作步骤
- 临时交互文案
- 产品走查细节

这些应放在需求文档/设计稿/任务说明中。

### 文档更新时机

- **架构/规范变化**：必须更新文档
- **实现细节变化**：如不影响技术约束，可不更新文档

## 代码审查清单

- [ ] 文件职责单一，可用三句话说清
- [ ] 文件长度在舒适区（< 400/300 行）
- [ ] 无跨层直接调用
- [ ] 无双向依赖
- [ ] 使用接口而非具体实现
- [ ] Store 不包含重业务逻辑
- [ ] 节点配置统一在 nodeRegistry.ts
- [ ] 无硬编码的节点类型白名单

---

相关文档：
- `../architecture/layering.md` - 分层架构详解
- `../architecture/data-flow.md` - 数据流模式
- `ui-guidelines.md` - UI 组件规范
- `development-workflow.md` - 开发工作流
