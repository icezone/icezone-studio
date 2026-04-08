# 新增 Provider 指南

本文档说明如何在 IceZone Studio 中新增 AI Provider（图片/视频）。

## Provider 概览

Provider 是 AI 服务的提供商，负责：
- 接收前端请求
- 调用第三方 AI API
- 处理异步任务（如果需要）
- 返回生成结果

## 服务端接入（TypeScript）

### 图片 Provider

#### 1. 创建 Provider 文件

**位置**: `src/server/ai/providers/<provider>.ts`

```typescript
// src/server/ai/providers/example.ts
import type { AIProvider, GenerateRequest, GenerateResponse } from '../types'

export class ExampleProvider implements AIProvider {
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch('https://api.example.com/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        width: request.width,
        height: request.height,
        seed: request.seed
      })
    })
    
    if (!response.ok) {
      throw new Error(`Example API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      imageUrl: data.output_url,
      seed: data.seed
    }
  }
}
```

#### 2. 在注册表中注册

**位置**: `src/server/ai/providers/registry.ts`

```typescript
import { ExampleProvider } from './example'

export function getAIProvider(providerId: string, apiKey: string): AIProvider {
  switch (providerId) {
    case 'kie':
      return new KieProvider(apiKey)
    case 'fal':
      return new FalProvider(apiKey)
    case 'example':  // 新增
      return new ExampleProvider(apiKey)
    default:
      throw new Error(`Unknown provider: ${providerId}`)
  }
}
```

#### 3. API Route 调用

**位置**: `app/api/ai/image/generate/route.ts`

```typescript
export async function POST(request: Request) {
  const body = await request.json()
  
  // 解析 Provider ID
  const [providerId, modelName] = body.model.split('/')
  
  // 获取 API Key（用户自带 or 平台默认）
  const apiKey = await getApiKey(userId, providerId)
  
  // 获取 Provider
  const provider = getAIProvider(providerId, apiKey)
  
  // 调用生成
  const result = await provider.generate(body)
  
  return Response.json(result)
}
```

### 视频 Provider

#### 1. 创建 Provider 文件

**位置**: `src/server/video/providers/<provider>.ts`

```typescript
// src/server/video/providers/example.ts
import type { VideoProvider, VideoGenerateRequest, VideoGenerateResponse } from '../types'

export class ExampleVideoProvider implements VideoProvider {
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async submitJob(request: VideoGenerateRequest): Promise<string> {
    const response = await fetch('https://api.example.com/video/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.duration,
        aspect_ratio: request.aspectRatio
      })
    })
    
    const data = await response.json()
    return data.job_id
  }
  
  async pollJob(jobId: string): Promise<JobStatus> {
    const response = await fetch(`https://api.example.com/video/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    
    const data = await response.json()
    
    return {
      status: data.status,  // 'pending' | 'processing' | 'completed' | 'failed'
      progress: data.progress,
      videoUrl: data.output_url,
      error: data.error
    }
  }
}
```

#### 2. 异步任务模式

视频生成通常是异步的，需要实现任务模式：

**submitJob()**: 提交任务，返回 `jobId`

```typescript
async submitJob(request: VideoGenerateRequest): Promise<string> {
  // 调用 Provider API 提交任务
  const response = await fetch('https://api.example.com/video/generate', {
    method: 'POST',
    body: JSON.stringify(request)
  })
  
  const { job_id } = await response.json()
  return job_id
}
```

**pollJob()**: 轮询状态

```typescript
async pollJob(jobId: string): Promise<JobStatus> {
  const response = await fetch(`https://api.example.com/video/status/${jobId}`)
  const data = await response.json()
  
  return {
    status: mapStatus(data.status),
    progress: data.progress || 0,
    videoUrl: data.output_url,
    error: data.error
  }
}
```

#### 3. 资产注册

完成时注册输出资产：

```typescript
async function onVideoCompleted(projectId: string, jobId: string, videoUrl: string) {
  // 注册资产到 project_assets 表
  await supabase
    .from('project_assets')
    .insert({
      project_id: projectId,
      url: videoUrl,
      type: 'video'
    })
  
  // 更新任务状态
  await supabase
    .from('jobs')
    .update({
      status: 'completed',
      result: { videoUrl }
    })
    .eq('id', jobId)
}
```

## 前端模型定义

### 1. 创建 Provider 定义

**位置**: `src/features/canvas/models/providers/<provider>.ts`

```typescript
// src/features/canvas/models/providers/example.ts
import type { ModelProviderDefinition } from '../types'

export const exampleProvider: ModelProviderDefinition = {
  id: 'example',
  displayName: 'Example AI',
  description: 'Example AI 服务提供商',
  website: 'https://example.com',
  requiresApiKey: true,
  apiKeyLabel: 'Example API Key',
  apiKeyPlaceholder: '请输入 Example API Key',
  getApiKeyUrl: 'https://example.com/api-keys'
}
```

### 2. 创建对应模型文件

**位置**: `src/features/canvas/models/image/example/`

```typescript
// example-model-1.ts
import type { ImageModelDefinition } from '../../types'

export const imageModel: ImageModelDefinition = {
  id: 'example/model-1',
  mediaType: 'image',
  displayName: 'Example Model 1',
  providerId: 'example',
  
  resolutions: ['512x512', '1024x1024'],
  aspectRatios: ['1:1', '16:9', '9:16'],
  
  defaultParams: {
    resolution: '1024x1024',
    aspectRatio: '1:1'
  },
  
  resolveRequest: (params) => ({
    model: 'model-1',
    prompt: params.prompt,
    width: parseInt(params.resolution.split('x')[0]),
    height: parseInt(params.resolution.split('x')[1])
  })
}
```

## 已接入 Provider 示例

### 基于 KIE API 的 Provider

所有三个 Provider 共享 KIE API 基础设施：

**位置**: `src/server/video/providers/kie-common.ts`

**功能**:
- 统一 API Key 管理
- 共享图片上传逻辑（支持 http://、data:、base64）
- 共享状态轮询逻辑

#### Kling 3.0

**模型**: `kling/kling-3.0`

**特性**:
- 时长：3s/5s/10s/15s
- 宽高比：16:9/9:16/1:1
- 支持 Image-to-Video
- 支持音频生成

**实现**:
```typescript
// src/server/video/providers/kling.ts
import { kieVideoProvider } from './kie-common'

export const klingProvider = kieVideoProvider('kling')
```

#### Sora2

**模型**: `sora2/sora-2-image-to-video`

**特性**:
- 时长：10s/15s
- duration → n_frames 映射（10s=300 frames, 15s=450 frames）

**实现**:
```typescript
export const sora2Provider = kieVideoProvider('sora2', {
  mapDuration: (duration: string) => {
    const seconds = parseInt(duration.replace('s', ''))
    return { n_frames: seconds * 30 }
  }
})
```

#### Veo 3.1

**模型**: `veo/veo3`, `veo/veo3_fast`

**特性**:
- seed 10000-99999 自动 clamp

**实现**:
```typescript
export const veoProvider = kieVideoProvider('veo', {
  mapSeed: (seed?: number) => {
    if (!seed) return undefined
    return Math.max(10000, Math.min(99999, seed))
  }
})
```

## 检查清单

### 服务端

- [ ] 创建 Provider 类（实现 `AIProvider` 或 `VideoProvider` 接口）
- [ ] 在 `registry.ts` 中注册
- [ ] 实现 `generate()` 或 `submitJob()` / `pollJob()`
- [ ] 处理 API 错误和超时
- [ ] 支持用户自带 API Key
- [ ] 编写单元测试

### 前端

- [ ] 创建 Provider 定义（`ModelProviderDefinition`）
- [ ] 创建对应模型文件
- [ ] 在设置页面支持配置 API Key
- [ ] 在模型选择器中显示
- [ ] 测试模型可用性

### 异步 Provider

- [ ] 实现任务提交 `submitJob()`
- [ ] 实现状态轮询 `pollJob()`
- [ ] 前端进度条显示
- [ ] 完成时注册资产
- [ ] 处理超时和失败

## 测试

### 单元测试

```typescript
describe('ExampleProvider', () => {
  it('should generate image', async () => {
    const provider = new ExampleProvider(TEST_API_KEY)
    
    const result = await provider.generate({
      model: 'model-1',
      prompt: 'a beautiful sunset',
      width: 1024,
      height: 1024
    })
    
    expect(result.imageUrl).toMatch(/^https?:\/\//)
  })
  
  it('should throw error on invalid API key', async () => {
    const provider = new ExampleProvider('invalid-key')
    
    await expect(provider.generate({
      model: 'model-1',
      prompt: 'test'
    })).rejects.toThrow('Example API error')
  })
})
```

### E2E 测试

```typescript
test('should generate image with Example provider', async ({ page }) => {
  // 配置 API Key
  await page.goto('/settings')
  await page.fill('[data-testid="example-api-key"]', TEST_API_KEY)
  await page.click('[data-testid="save"]')
  
  // 创建节点
  await page.goto('/canvas/new')
  await page.click('[data-testid="add-image-node"]')
  
  // 选择模型
  await page.selectOption('[data-testid="model-select"]', 'example/model-1')
  
  // 输入提示词
  await page.fill('[data-testid="prompt"]', 'a beautiful sunset')
  
  // 生成
  await page.click('[data-testid="generate"]')
  
  // 等待结果
  await page.waitForSelector('[data-testid="export-node"]', { timeout: 30000 })
  
  // 验证图片
  const image = await page.locator('[data-testid="export-image"] img')
  expect(await image.getAttribute('src')).toMatch(/^https?:\/\//)
})
```

---

相关文档：
- `add-model.md` - 新增模型指南
- `../product/models.md` - AI 模型清单
- `../api/endpoints.md` - AI API 端点
- `../api/authentication.md` - BYOK 机制
