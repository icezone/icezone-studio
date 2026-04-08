# 错误处理

本文档说明 IceZone Studio 的错误处理机制和已知陷阱。

## 统一错误响应格式

所有 API 端点在错误时返回统一格式：

```typescript
{
  error: {
    code: string;          // 错误代码（如 "INVALID_INPUT"）
    message: string;       // 错误消息
    details?: any;         // 可选：详细信息
  }
}
```

## 标准 HTTP 状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| 400 | Bad Request | 请求参数无效 |
| 401 | Unauthorized | 未认证（缺少或无效 token）|
| 403 | Forbidden | 无权限访问资源 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 版本冲突（如草稿保存冲突）|
| 429 | Too Many Requests | 速率限制超出 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用（如 AI Provider 宕机）|

## 错误代码清单

### 通用错误

- `INVALID_INPUT`: 请求参数无效
- `UNAUTHORIZED`: 未认证
- `FORBIDDEN`: 无权限
- `NOT_FOUND`: 资源不存在
- `RATE_LIMIT_EXCEEDED`: 速率限制超出
- `INTERNAL_ERROR`: 服务器内部错误

### 项目管理错误

- `PROJECT_NOT_FOUND`: 项目不存在
- `PROJECT_ACCESS_DENIED`: 无权访问项目
- `DRAFT_CONFLICT`: 草稿版本冲突

### AI 生成错误

- `MODEL_NOT_AVAILABLE`: 模型不可用
- `PROVIDER_ERROR`: Provider 返回错误
- `QUOTA_EXCEEDED`: 额度用尽
- `INVALID_API_KEY`: API Key 无效

### 资产管理错误

- `ASSET_NOT_FOUND`: 资产不存在
- `UPLOAD_FAILED`: 上传失败
- `INVALID_FILE_TYPE`: 文件类型不支持

## 前端错误处理

### API 调用封装

```typescript
async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(error.error.code, error.error.message)
    }
    
    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('NETWORK_ERROR', 'Network request failed')
  }
}
```

### 错误提示

```typescript
try {
  await generateImage(params)
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        toast.error('额度用尽，请配置 API Key')
        break
      case 'INVALID_API_KEY':
        toast.error('API Key 无效，请重新配置')
        break
      default:
        toast.error(error.message)
    }
  } else {
    toast.error('未知错误')
  }
}
```

## 后端错误处理

### 输入校验

使用 Zod 进行参数校验：

```typescript
import { z } from 'zod'

const schema = z.object({
  imageUrl: z.string().url(),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = schema.parse(body)
    
    // 继续处理...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request parameters',
          details: error.errors,
        }
      }, { status: 400 })
    }
  }
}
```

### Provider 错误处理

```typescript
try {
  const result = await provider.generate(params)
  return result
} catch (error) {
  if (error instanceof ProviderError) {
    return Response.json({
      error: {
        code: 'PROVIDER_ERROR',
        message: error.message,
      }
    }, { status: 503 })
  }
  throw error
}
```

## 已知陷阱（Known Pitfalls）

### API 路由输入校验不完整

**症状**：非图片文件/越界参数/超量文件返回 500 而非 4xx

**根因**：Zod 只校验参数类型，未校验文件 MIME type、坐标边界、数组上限

**修复**：在 validation.ts 中增加：
- MIME type 白名单校验
- crop 坐标边界检查
- merge 文件数量上限（≤20）

**示例**：
```typescript
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function validateImageFile(file: File) {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type')
  }
}

function validateCropBounds(x: number, y: number, width: number, height: number, imageWidth: number, imageHeight: number) {
  if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight) {
    throw new Error('Crop bounds out of range')
  }
}

function validateMergeCount(images: any[]) {
  if (images.length > 20) {
    throw new Error('Too many images to merge (max 20)')
  }
}
```

**预防**：新增 API 路由时，除参数类型外还需校验：
- 文件类型
- 数值范围
- 数组长度

---

### E2E 测试需要真实 Supabase 认证

**症状**：E2E 测试在 CI 中认证超时

**根因**：测试需要真实 Supabase 账号登录

**修复**：通过 GitHub Secrets 配置 `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`

**测试代码**：
```typescript
const hasAuth = process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD

test.skip(!hasAuth, 'requires authentication', async ({ page }) => {
  // 测试需要认证的功能...
})
```

**预防**：新增需认证的 E2E 测试必须用 `test.skip(!hasAuth, ...)` 门控

---

### 图片字段编码遗漏

**症状**：新增 `previewImageUrl` 字段后，持久化时图片丢失

**根因**：`imagePool + __img_ref__` 编码机制未覆盖新字段

**修复**：在编码/解码映射中同步添加新字段

**示例**：
```typescript
// 编码
function encodeNodes(nodes: CanvasNode[], imagePool: Map<string, string>) {
  return nodes.map(node => {
    if (node.data.imageUrl) {
      node.data.imageUrl = encodeImage(node.data.imageUrl, imagePool)
    }
    if (node.data.previewImageUrl) {
      node.data.previewImageUrl = encodeImage(node.data.previewImageUrl, imagePool)
    }
    return node
  })
}

// 解码
function decodeNodes(nodes: CanvasNode[], imagePool: Map<string, string>) {
  return nodes.map(node => {
    if (node.data.imageUrl?.startsWith('__img_ref__')) {
      node.data.imageUrl = decodeImage(node.data.imageUrl, imagePool)
    }
    if (node.data.previewImageUrl?.startsWith('__img_ref__')) {
      node.data.previewImageUrl = decodeImage(node.data.previewImageUrl, imagePool)
    }
    return node
  })
}
```

**预防**：新增图片字段时，检查并更新编码/解码逻辑

---

### 视口抖动持久化

**症状**：拖拽画布时频繁触发保存，影响性能

**根因**：每次 viewport 变化都立即持久化

**修复**：
1. 添加阈值比较，过滤微小变化
2. 使用独立防抖队列
3. 使用轻量级 PATCH API

**示例**：
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
  fetch(`/api/projects/${id}/draft/viewport`, {
    method: 'PATCH',
    body: JSON.stringify({ viewport })
  })
}, 500)
```

**预防**：所有高频更新操作都应做归一化与阈值比较

## 错误日志

### 服务端日志

使用结构化日志：

```typescript
console.error({
  timestamp: new Date().toISOString(),
  level: 'error',
  code: 'PROVIDER_ERROR',
  message: error.message,
  userId: user.id,
  providerId: 'kie',
  stack: error.stack,
})
```

### 前端错误上报

集成 Sentry 或类似服务：

```typescript
try {
  // ...
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'ImageEditNode',
      action: 'generate',
    },
    user: {
      id: user.id,
      email: user.email,
    },
  })
  throw error
}
```

---

相关文档：
- `endpoints.md` - API 端点参考
- `authentication.md` - 认证错误处理
- `../standards/known-pitfalls.md` - 更多已知陷阱
- `../standards/testing.md` - 测试规范
