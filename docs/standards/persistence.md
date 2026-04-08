# 持久化规范

本文档说明 IceZone Studio 的持久化机制和数据同步策略。

## 持久化架构

### 双写策略

项目数据通过 `projectStore` 自动持久化，采用双写架构：

```
用户操作
   ↓
projectStore 更新
   ↓
   ├─→ IndexedDB（即时写入）
   └─→ Supabase（防抖 1s 后写入）
```

### 持久化后端

1. **Supabase Postgres**（`project_drafts` 表）
   - 云端存储
   - 多设备同步
   - 版本控制

2. **IndexedDB**（`idb-keyval`）
   - 本地缓存
   - 快速读写
   - 离线支持

## 加载策略

### 启动时加载

```typescript
async function loadProject(projectId: string) {
  // 1. 并行加载本地和云端数据
  const [localDraft, remoteDraft] = await Promise.all([
    getLocalDraft(projectId),
    getRemoteDraft(projectId)
  ])
  
  // 2. 比较时间戳
  if (!remoteDraft) {
    return localDraft
  }
  
  if (!localDraft) {
    return remoteDraft
  }
  
  // 3. 本地更新 → 提示恢复
  if (localDraft.updatedAt > remoteDraft.updatedAt) {
    return {
      data: localDraft.data,
      hasLocalChanges: true
    }
  }
  
  // 4. 云端更新 → 直接使用
  return remoteDraft
}
```

### 恢复提示

```typescript
if (hasLocalChanges) {
  const confirmed = await confirm(
    '检测到本地有未同步的更改，是否恢复？'
  )
  
  if (confirmed) {
    // 使用本地数据并立即同步到云端
    await syncToRemote(localDraft)
  } else {
    // 放弃本地更改，使用云端数据
    await clearLocalDraft(projectId)
  }
}
```

## 保存状态

### 状态枚举

```typescript
type SaveStatus = 
  | 'saving'      // 正在保存
  | 'saved'       // 已保存
  | 'unsynced'    // 本地已保存，云端未同步
  | 'offline'     // 离线状态
  | 'conflict'    // 版本冲突
```

### UI 展示

```tsx
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return <Spinner />
    case 'saved':
      return <CheckIcon />
    case 'unsynced':
      return <CloudOffIcon />
    case 'offline':
      return <WifiOffIcon />
    case 'conflict':
      return <AlertIcon />
  }
}
```

## 冲突检测

### 基于 revision 的乐观锁

```sql
CREATE TABLE project_drafts (
  project_id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 保存时携带 expectedRevision

```typescript
async function saveDraft(projectId: string, data: any, expectedRevision: number) {
  const response = await fetch(`/api/projects/${projectId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({
      data,
      expectedRevision
    })
  })
  
  if (response.status === 409) {
    // 版本冲突
    throw new ConflictError('Draft has been modified by another client')
  }
  
  return await response.json()
}
```

### 服务端检查

```typescript
// API Route
export async function PUT(request: Request) {
  const { data, expectedRevision } = await request.json()
  
  // 获取当前 revision
  const current = await supabase
    .from('project_drafts')
    .select('revision')
    .eq('project_id', projectId)
    .single()
  
  // 检查版本冲突
  if (expectedRevision && current.revision !== expectedRevision) {
    return Response.json({
      error: { code: 'DRAFT_CONFLICT', message: 'Version conflict' }
    }, { status: 409 })
  }
  
  // 更新并递增 revision
  await supabase
    .from('project_drafts')
    .update({
      data,
      revision: current.revision + 1,
      updated_at: new Date()
    })
    .eq('project_id', projectId)
}
```

## 双通道持久化

### 整项目快照

**API**: `PUT /api/projects/[id]/draft`

**触发时机**: 节点/边/历史记录变化

**策略**:
- 防抖 1000ms
- `requestIdleCallback` 调度
- 避免与交互争用主线程

**实现**:
```typescript
const debouncedSave = debounce((data) => {
  requestIdleCallback(() => {
    saveDraft(projectId, data)
  })
}, 1000)
```

### 视口快照

**API**: `PATCH /api/projects/[id]/draft/viewport`

**触发时机**: 视口缩放/平移

**策略**:
- 独立防抖 500ms
- 归一化与阈值比较
- 过滤微小抖动

**实现**:
```typescript
const EPSILON = 0.01

function hasSignificantChange(oldViewport: Viewport, newViewport: Viewport) {
  return (
    Math.abs(oldViewport.x - newViewport.x) > EPSILON ||
    Math.abs(oldViewport.y - newViewport.y) > EPSILON ||
    Math.abs(oldViewport.zoom - newViewport.zoom) > EPSILON
  )
}

const debouncedSaveViewport = debounce((viewport) => {
  if (hasSignificantChange(lastViewport, viewport)) {
    saveViewport(projectId, viewport)
    lastViewport = viewport
  }
}, 500)
```

## 图片去重编码

### imagePool + __img_ref__

```typescript
// 编码
function encodeDraft(draft: CanvasDraft) {
  const imagePool = new Map<string, string>()
  let refId = 0
  
  draft.nodes.forEach(node => {
    ['imageUrl', 'previewImageUrl'].forEach(field => {
      const url = node.data[field]
      if (url && typeof url === 'string') {
        if (!imagePool.has(url)) {
          imagePool.set(url, `__img_ref__${refId++}`)
        }
        node.data[field] = imagePool.get(url)
      }
    })
  })
  
  return {
    nodes: draft.nodes,
    edges: draft.edges,
    imagePool: Object.fromEntries(imagePool)
  }
}

// 解码
function decodeDraft(encoded: EncodedDraft) {
  const imagePool = new Map(Object.entries(encoded.imagePool))
  
  encoded.nodes.forEach(node => {
    ['imageUrl', 'previewImageUrl'].forEach(field => {
      const ref = node.data[field]
      if (ref && typeof ref === 'string' && ref.startsWith('__img_ref__')) {
        node.data[field] = imagePool.get(ref)
      }
    })
  })
  
  return {
    nodes: encoded.nodes,
    edges: encoded.edges
  }
}
```

### 新增图片字段

新增图片字段（如 `previewImageUrl`）时，需同步编码/解码映射：

```typescript
const IMAGE_FIELDS = ['imageUrl', 'previewImageUrl', 'thumbnailUrl']

IMAGE_FIELDS.forEach(field => {
  // 编码...
  // 解码...
})
```

## 资产管理

### project_assets 表

```sql
CREATE TABLE project_assets (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'image' | 'video'
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 跟踪上传/生成的资产

```typescript
// 上传时
async function uploadAsset(projectId: string, file: File) {
  const { url } = await uploadToStorage(file)
  
  // 注册资产
  await supabase
    .from('project_assets')
    .insert({
      project_id: projectId,
      url,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      size: file.size
    })
  
  return url
}

// 生成时
async function onImageGenerated(projectId: string, imageUrl: string) {
  await supabase
    .from('project_assets')
    .insert({
      project_id: projectId,
      url: imageUrl,
      type: 'image'
    })
}
```

### 清理孤立资产

```typescript
// 定期清理未被项目引用的资产
async function cleanupOrphanedAssets(projectId: string) {
  const draft = await getDraft(projectId)
  const referencedUrls = extractImageUrls(draft)
  
  const assets = await supabase
    .from('project_assets')
    .select('id, url')
    .eq('project_id', projectId)
  
  const orphaned = assets.filter(asset => 
    !referencedUrls.includes(asset.url)
  )
  
  for (const asset of orphaned) {
    await deleteAsset(asset.id)
  }
}
```

## 重复标签检测

### BroadcastChannel API

防止同一项目在多个标签页同时编辑：

```typescript
const channel = new BroadcastChannel(`project-${projectId}`)

// 通知其他标签页
channel.postMessage({ type: 'project-opened', tabId })

// 监听其他标签页
channel.onmessage = (event) => {
  if (event.data.type === 'project-opened' && event.data.tabId !== tabId) {
    alert('该项目已在其他标签页打开')
    // 可选：只读模式或关闭当前标签页
  }
}

// 关闭时通知
window.addEventListener('beforeunload', () => {
  channel.postMessage({ type: 'project-closed', tabId })
})
```

## 离线支持

### 检测网络状态

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine)

useEffect(() => {
  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])
```

### 离线队列

```typescript
const offlineQueue: SaveOperation[] = []

async function saveDraft(data: any) {
  if (!navigator.onLine) {
    // 离线时加入队列
    offlineQueue.push({ type: 'save-draft', data })
    return
  }
  
  // 在线时直接保存
  await fetch('/api/projects/draft', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// 恢复在线后同步队列
window.addEventListener('online', async () => {
  while (offlineQueue.length > 0) {
    const operation = offlineQueue.shift()
    await processOperation(operation)
  }
})
```

## 性能优化

### 避免拖拽中持久化

```typescript
const [isDragging, setIsDragging] = useState(false)

// 拖拽中不保存
useEffect(() => {
  if (isDragging) return
  
  debouncedSave(draft)
}, [draft, isDragging])
```

### 大图片处理

节点渲染优先使用 `previewImageUrl`，模型/工具处理使用原图 `imageUrl`：

```typescript
// 渲染时
<img src={node.data.previewImageUrl || node.data.imageUrl} />

// 处理时
await processTool(node.data.imageUrl)
```

---

相关文档：
- `../architecture/performance.md` - 性能优化模式
- `../api/endpoints.md` - 持久化 API
- `code-quality.md` - 代码质量标准
