# 已知陷阱

本文档记录 IceZone Studio 开发中的已知陷阱和反复失败模式。

> 格式：症状、根因、修复、预防

## API 路由输入校验不完整

### 症状

非图片文件/越界参数/超量文件返回 500 而非 4xx

### 根因

Zod 只校验参数类型，未校验：
- 文件 MIME type
- 坐标边界
- 数组上限

### 修复

在 validation.ts 中增加：

```typescript
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function validateImageFile(file: File) {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    throw new ValidationError('Invalid file type. Supported types: PNG, JPEG, WebP, GIF')
  }
}

export function validateCropBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
) {
  if (x < 0 || y < 0) {
    throw new ValidationError('Crop coordinates must be non-negative')
  }
  
  if (x + width > imageWidth || y + height > imageHeight) {
    throw new ValidationError('Crop bounds out of image range')
  }
}

export function validateMergeCount(images: any[]) {
  if (images.length === 0) {
    throw new ValidationError('At least one image is required')
  }
  
  if (images.length > 20) {
    throw new ValidationError('Too many images to merge (max 20)')
  }
}
```

### 预防

新增 API 路由时，除参数类型外还需校验：
- **文件类型**：MIME type 白名单
- **数值范围**：最小/最大值、正负
- **数组长度**：最小/最大元素数量
- **字符串长度**：避免过长输入
- **URL 格式**：确保有效的 URL

## E2E 测试需要真实 Supabase 认证

### 症状

E2E 测试在 CI 中认证超时

### 根因

测试需要真实 Supabase 账号登录，但 CI 环境缺少凭据

### 修复

1. 通过 GitHub Secrets 配置环境变量：
   - `E2E_TEST_EMAIL`
   - `E2E_TEST_PASSWORD`

2. 在测试中添加门控：

```typescript
const hasAuth = process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD

test.skip(!hasAuth, 'requires authentication', async ({ page }) => {
  // 测试需要认证的功能...
})
```

### 预防

新增需认证的 E2E 测试必须：
1. 使用 `test.skip(!hasAuth, ...)` 门控
2. 在测试文档中注明需要配置环境变量
3. 本地开发时提供 `.env.test.local` 示例

## 图片字段编码遗漏

### 症状

新增 `previewImageUrl` 字段后，持久化时图片丢失

### 根因

`imagePool + __img_ref__` 编码机制未覆盖新字段

### 修复

```typescript
const IMAGE_FIELDS = ['imageUrl', 'previewImageUrl', 'thumbnailUrl']

function encodeNodes(nodes: CanvasNode[], imagePool: Map<string, string>) {
  return nodes.map(node => {
    IMAGE_FIELDS.forEach(field => {
      const url = node.data[field]
      if (url && typeof url === 'string' && url.startsWith('http')) {
        if (!imagePool.has(url)) {
          imagePool.set(url, `__img_ref__${imagePool.size}`)
        }
        node.data[field] = imagePool.get(url)
      }
    })
    return node
  })
}

function decodeNodes(nodes: CanvasNode[], imagePool: Map<string, string>) {
  return nodes.map(node => {
    IMAGE_FIELDS.forEach(field => {
      const ref = node.data[field]
      if (ref && typeof ref === 'string' && ref.startsWith('__img_ref__')) {
        node.data[field] = imagePool.get(ref)
      }
    })
    return node
  })
}
```

### 预防

新增图片字段时：
1. 在 `IMAGE_FIELDS` 数组中添加字段名
2. 运行编码/解码测试验证
3. 检查旧项目数据是否能正确加载

## 视口抖动持久化

### 症状

拖拽画布时频繁触发保存，影响性能

### 根因

每次 viewport 变化都立即持久化，未做阈值过滤

### 修复

1. 添加阈值比较：

```typescript
const EPSILON = 0.01

function hasSignificantChange(oldViewport: Viewport, newViewport: Viewport) {
  return (
    Math.abs(oldViewport.x - newViewport.x) > EPSILON ||
    Math.abs(oldViewport.y - newViewport.y) > EPSILON ||
    Math.abs(oldViewport.zoom - newViewport.zoom) > EPSILON
  )
}
```

2. 使用独立防抖队列：

```typescript
const debouncedSaveViewport = debounce((viewport) => {
  if (hasSignificantChange(lastViewport, viewport)) {
    saveViewport(projectId, viewport)
    lastViewport = viewport
  }
}, 500)
```

3. 使用轻量级 PATCH API：

```typescript
// 不回退到整项目 PUT
PATCH /api/projects/[id]/draft/viewport
```

### 预防

所有高频更新操作都应：
1. 做归一化与阈值比较
2. 使用防抖或节流
3. 考虑独立 API 端点

## 节点类型硬编码

### 症状

新增节点后，连线菜单不显示

### 根因

在 UI 层手写了节点类型白名单

### 修复

```typescript
❌ 错误示例：
const menuNodeTypes = ['uploadNode', 'imageNode', 'videoGenNode']

✅ 正确示例：
function getConnectMenuNodeTypes(direction: 'source' | 'target') {
  return Object.entries(NODE_REGISTRY)
    .filter(([_, def]) => 
      direction === 'source' 
        ? def.connectivity.connectMenu.fromSource
        : def.connectivity.connectMenu.fromTarget
    )
    .map(([type, _]) => type)
}
```

### 预防

节点相关配置必须统一在 `domain/nodeRegistry.ts` 声明：
- 节点类型
- 默认数据
- 菜单展示
- 连线能力

禁止在其他地方硬编码节点类型列表。

## Store 承载重业务逻辑

### 症状

Store 文件越来越大，测试困难

### 根因

将业务流程编排、数据转换、外部调用都放在 Store 中

### 修复

将业务逻辑移到应用服务层：

```typescript
❌ 错误示例（Store 包含业务逻辑）：
const canvasStore = create((set) => ({
  generateImage: async (params) => {
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
  
  canvasStore.getState().addNode(createExportNode(result))
  
  return result
}
```

### 预防

Store 职责限定为：
- 状态存储
- 状态更新
- 状态查询

业务流程编排、数据转换、外部调用应放在应用服务层。

## 拖拽中写盘

### 症状

拖拽节点时卡顿

### 根因

节点位置变化立即触发持久化

### 修复

```typescript
const [isDragging, setIsDragging] = useState(false)

useEffect(() => {
  if (isDragging) return  // 拖拽中不保存
  
  debouncedSave(draft)
}, [draft, isDragging])
```

### 预防

禁止在拖拽每一帧执行重持久化或重计算：
- 拖拽中不写盘
- 拖拽结束再保存
- 使用防抖合并保存

## 跨层直接调用

### 症状

UI 组件直接调用 Infrastructure 层

### 根因

为了快速实现功能，跳过了应用层

### 修复

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

### 预防

遵循数据流方向：
```
UI → Application → Domain → Infrastructure
```

禁止跨层调用。

## 文件规模失控

### 症状

单个文件超过 1000 行，难以维护

### 根因

功能不断累加，未及时拆分

### 修复

按职责或特性拆分：

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

### 预防

- 舒适区：类 ≤ 400 行，脚本 ≤ 300 行
- 警戒线：800 行，必须评估拆分
- 强制拆分：1000 行（纯数据定义除外）

---

相关文档：
- `code-quality.md` - 代码质量标准
- `../architecture/layering.md` - 分层架构
- `../api/error-handling.md` - API 错误处理
- `development-workflow.md` - 开发工作流
