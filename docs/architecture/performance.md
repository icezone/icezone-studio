# 性能优化模式

本文档说明 IceZone Studio 的性能优化实践。

## 核心原则

- **禁止在拖拽每一帧执行重持久化或重计算**
- **节点拖拽中不要写盘，拖拽结束再保存**
- **大图片场景避免重复 dataURL 转换**
- **项目整量持久化使用防抖 + idle 调度**
- **视口持久化走独立轻量队列与独立 API**
- **画布交互优先"流畅"而非"实时全量持久化"**

## 拖拽性能优化

### 拖拽中不持久化

```typescript
const [isDragging, setIsDragging] = useState(false)

// 监听拖拽状态
useEffect(() => {
  const handleNodeDragStart = () => setIsDragging(true)
  const handleNodeDragStop = () => setIsDragging(false)
  
  canvas.on('nodeDragStart', handleNodeDragStart)
  canvas.on('nodeDragStop', handleNodeDragStop)
  
  return () => {
    canvas.off('nodeDragStart', handleNodeDragStart)
    canvas.off('nodeDragStop', handleNodeDragStop)
  }
}, [])

// 拖拽中不保存
useEffect(() => {
  if (isDragging) return  // 跳过保存
  
  debouncedSave(draft)
}, [draft, isDragging])
```

### 拖拽结束再保存

```typescript
const onNodeDragStop = useCallback(() => {
  setIsDragging(false)
  
  // 立即保存一次（不等待防抖）
  saveDraft(projectId, getCurrentDraft())
}, [projectId])
```

## 图片处理优化

### 避免重复 dataURL 转换

**问题**：节点渲染时多次将 URL 转换为 dataURL，消耗 CPU。

**解决**：
- 节点渲染优先使用 `previewImageUrl`（小图）
- 模型/工具处理使用原图 `imageUrl`（大图）

```typescript
// 节点渲染
function ImageEditNode({ data }: NodeProps) {
  return (
    <img 
      src={data.previewImageUrl || data.imageUrl} 
      alt="preview"
      style={{ maxWidth: 200, maxHeight: 200 }}
    />
  )
}

// 工具处理
async function cropImage(nodeId: string) {
  const node = canvasStore.getState().getNode(nodeId)
  
  // 使用原图进行处理
  await fetch('/api/image/crop', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: node.data.imageUrl,  // 不是 previewImageUrl
      ...cropParams
    })
  })
}
```

### 图片懒加载

```typescript
<img 
  src={imageUrl} 
  loading="lazy"  // 浏览器原生懒加载
  alt="node image"
/>
```

### 图片预加载

对于即将展示的图片，提前加载：

```typescript
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

// 生成完成后预加载结果图片
await preloadImage(result.imageUrl)
```

## 持久化性能优化

### 项目整量持久化

使用防抖 + `requestIdleCallback` 队列，避免与交互争用主线程：

```typescript
const debouncedSave = debounce((data) => {
  requestIdleCallback(() => {
    saveDraft(projectId, data)
  }, { timeout: 2000 })
}, 1000)

useEffect(() => {
  if (isDragging) return
  
  debouncedSave(draft)
}, [draft, isDragging])
```

### viewport 持久化

走独立轻量队列与独立 API：

```typescript
// 独立防抖（更短延迟）
const debouncedSaveViewport = debounce((viewport) => {
  fetch(`/api/projects/${projectId}/draft/viewport`, {
    method: 'PATCH',
    body: JSON.stringify({ viewport })
  })
}, 500)

// 不回退到整项目 PUT
onViewportChange((viewport) => {
  debouncedSaveViewport(viewport)
})
```

### 归一化与阈值比较

过滤微小抖动写入：

```typescript
const EPSILON = 0.01

function hasSignificantChange(oldViewport: Viewport, newViewport: Viewport) {
  return (
    Math.abs(oldViewport.x - newViewport.x) > EPSILON ||
    Math.abs(oldViewport.y - newViewport.y) > EPSILON ||
    Math.abs(oldViewport.zoom - newViewport.zoom) > EPSILON
  )
}

onViewportChange((newViewport) => {
  if (!hasSignificantChange(lastViewport, newViewport)) {
    return  // 跳过微小变化
  }
  
  debouncedSaveViewport(newViewport)
  lastViewport = newViewport
})
```

## React 渲染优化

### useMemo / useCallback

控制重渲染，避免把大对象直接塞进依赖：

```typescript
❌ 错误示例：
useEffect(() => {
  // draft 对象变化频繁，导致频繁重新执行
  console.log('Draft changed')
}, [draft])

✅ 正确示例：
const draftHash = useMemo(() => {
  // 计算 hash，只有实质变化才触发
  return JSON.stringify({ 
    nodeCount: draft.nodes.length,
    edgeCount: draft.edges.length
  })
}, [draft.nodes.length, draft.edges.length])

useEffect(() => {
  console.log('Draft structurally changed')
}, [draftHash])
```

### React.memo

避免不必要的组件重渲染：

```typescript
const Node = React.memo(({ data }: NodeProps) => {
  return <div>{data.title}</div>
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.data.title === nextProps.data.title
})
```

### 虚拟列表

长列表使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{items[index]}</div>
  )}
</FixedSizeList>
```

## Canvas 组件优化

### 必须标记 'use client'

保持 @xyflow/react 纯客户端渲染：

```typescript
'use client'  // 必须在文件顶部

import { ReactFlow } from '@xyflow/react'

export default function Canvas() {
  return <ReactFlow nodes={nodes} edges={edges} />
}
```

### 节点数量控制

大画布时隐藏视口外节点：

```typescript
const visibleNodes = useMemo(() => {
  return nodes.filter(node => 
    isNodeInViewport(node, viewport)
  )
}, [nodes, viewport])

<ReactFlow nodes={visibleNodes} edges={edges} />
```

### 连线简化

连线数量过多时使用简化算法：

```typescript
const simplifiedEdges = useMemo(() => {
  if (edges.length < 100) return edges
  
  // 只显示关键连线
  return edges.filter(edge => edge.selected || edge.highlighted)
}, [edges])
```

## 网络请求优化

### 请求合并

```typescript
// 批量上传图片
async function uploadImages(files: File[]) {
  const formData = new FormData()
  files.forEach((file, i) => formData.append(`file${i}`, file))
  
  return await fetch('/api/assets/upload-batch', {
    method: 'POST',
    body: formData
  })
}
```

### 请求取消

```typescript
const abortController = new AbortController()

const response = await fetch('/api/ai/image/generate', {
  method: 'POST',
  body: JSON.stringify(params),
  signal: abortController.signal
})

// 用户取消时
onCancel(() => {
  abortController.abort()
})
```

### 请求缓存

```typescript
const cache = new Map<string, Promise<any>>()

async function fetchWithCache(url: string) {
  if (cache.has(url)) {
    return await cache.get(url)
  }
  
  const promise = fetch(url).then(r => r.json())
  cache.set(url, promise)
  
  return await promise
}
```

## 状态更新优化

### 批量更新

```typescript
❌ 错误示例（多次更新）：
setNode1(newNode1)
setNode2(newNode2)
setNode3(newNode3)

✅ 正确示例（批量更新）：
setNodes(oldNodes => {
  const newNodes = [...oldNodes]
  newNodes[0] = newNode1
  newNodes[1] = newNode2
  newNodes[2] = newNode3
  return newNodes
})
```

### 不可变更新

使用不可变更新模式，避免深拷贝：

```typescript
❌ 错误示例（深拷贝）：
setNodes(JSON.parse(JSON.stringify(nodes)))

✅ 正确示例（浅拷贝 + 结构共享）：
setNodes(oldNodes => 
  oldNodes.map(node => 
    node.id === targetId 
      ? { ...node, data: { ...node.data, title: newTitle } }
      : node
  )
)
```

## IndexedDB 优化

### 批量写入

```typescript
async function saveDraftToIndexedDB(projectId: string, draft: Draft) {
  const tx = db.transaction('drafts', 'readwrite')
  const store = tx.objectStore('drafts')
  
  // 批量操作
  await Promise.all([
    store.put({ id: projectId, nodes: draft.nodes }),
    store.put({ id: projectId + ':edges', edges: draft.edges }),
    store.put({ id: projectId + ':viewport', viewport: draft.viewport })
  ])
  
  await tx.done
}
```

### 索引优化

```typescript
// 创建索引加速查询
const objectStore = db.createObjectStore('drafts', { keyPath: 'id' })
objectStore.createIndex('projectId', 'projectId', { unique: false })
objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })

// 使用索引查询
const index = objectStore.index('projectId')
const drafts = await index.getAll(projectId)
```

## 性能监控

### Performance API

```typescript
// 标记性能点
performance.mark('save-start')

await saveDraft(projectId, draft)

performance.mark('save-end')
performance.measure('save-duration', 'save-start', 'save-end')

const measure = performance.getEntriesByName('save-duration')[0]
console.log('Save took', measure.duration, 'ms')
```

### React DevTools Profiler

```tsx
<Profiler id="Canvas" onRender={onRenderCallback}>
  <Canvas />
</Profiler>

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  console.log({
    id,
    phase,
    actualDuration,  // 本次渲染耗时
    baseDuration     // 理论最快渲染耗时
  })
}
```

## 性能检查清单

- [ ] 拖拽中不持久化
- [ ] 节点渲染使用 previewImageUrl
- [ ] 持久化使用防抖 + idle 调度
- [ ] viewport 使用独立 API + 阈值过滤
- [ ] 大对象使用 useMemo 避免重复计算
- [ ] 长列表使用虚拟滚动
- [ ] Canvas 组件标记 'use client'
- [ ] 网络请求支持取消
- [ ] IndexedDB 使用批量写入

---

相关文档：
- `../standards/persistence.md` - 持久化规范
- `data-flow.md` - 数据流模式
- `../standards/ui-guidelines.md` - UI 规范
