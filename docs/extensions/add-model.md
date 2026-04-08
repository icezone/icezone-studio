# 新增模型指南

本文档说明如何在 IceZone Studio 中新增 AI 模型（图片/视频）。

## 图片模型接入

### 步骤概览

1. 创建模型文件（一模型一文件）
2. 定义模型配置
3. 注册到模型注册表（自动发现）
4. 测试模型

### 1. 创建模型文件

**位置**: `src/features/canvas/models/image/<provider>/`

**文件名**: `<model-name>.ts`

```typescript
// src/features/canvas/models/image/kie/nano-banana-3.ts
import type { ImageModelDefinition } from '../../types'

export const imageModel: ImageModelDefinition = {
  id: 'kie/nano-banana-3',
  mediaType: 'image',
  displayName: 'Nano Banana 3',
  providerId: 'kie',
  description: '第三代 Nano Banana 模型，速度更快',
  
  // 支持的分辨率
  resolutions: [
    '512x512',
    '768x768',
    '1024x1024',
    '1024x768',
    '768x1024'
  ],
  
  // 支持的宽高比
  aspectRatios: [
    '1:1',
    '4:3',
    '3:4',
    '16:9',
    '9:16'
  ],
  
  // 默认参数
  defaultParams: {
    resolution: '1024x1024',
    aspectRatio: '1:1',
    steps: 20,
    seed: -1
  },
  
  // 请求映射函数
  resolveRequest: (params) => ({
    model: 'nano-banana-3',
    prompt: params.prompt,
    negative_prompt: params.negativePrompt || '',
    width: parseInt(params.resolution.split('x')[0]),
    height: parseInt(params.resolution.split('x')[1]),
    num_inference_steps: params.steps || 20,
    seed: params.seed === -1 ? undefined : params.seed,
    image: params.imageUrl  // 用于 image-to-image
  })
}
```

### 2. 模型定义说明

#### 必需字段

- **id**: 格式为 `{provider}/{model}`（如 `kie/nano-banana-3`）
- **mediaType**: `'image'`
- **displayName**: 在 UI 中显示的名称
- **providerId**: Provider ID（如 `kie`、`fal`、`grsai`）
- **resolutions**: 支持的分辨率列表
- **aspectRatios**: 支持的宽高比列表
- **defaultParams**: 默认参数
- **resolveRequest**: 将前端参数映射为 Provider API 请求

#### 可选字段

- **description**: 模型描述
- **supportsSeed**: 是否支持种子控制（默认 true）
- **supportsNegativePrompt**: 是否支持反向提示词（默认 true）
- **supportsImageToImage**: 是否支持图片编辑（默认 true）

### 3. 自动发现机制

注册表会自动扫描 `models/image/<provider>/` 下所有导出 `imageModel` 的文件：

```typescript
// registry.ts
const imageModelFiles = import.meta.glob('./image/*/*.ts', { eager: true })

for (const path in imageModelFiles) {
  const module = imageModelFiles[path] as any
  if (module.imageModel) {
    imageModels.push(module.imageModel)
  }
}
```

**无需手动注册**，只要文件存在且导出 `imageModel`，就会自动加载。

### 4. 测试模型

```typescript
// nano-banana-3.test.ts
import { imageModel } from './nano-banana-3'

describe('nano-banana-3 model', () => {
  it('should have correct id', () => {
    expect(imageModel.id).toBe('kie/nano-banana-3')
  })
  
  it('should resolve request correctly', () => {
    const request = imageModel.resolveRequest({
      prompt: 'a beautiful sunset',
      resolution: '1024x1024',
      steps: 30,
      seed: 42
    })
    
    expect(request.model).toBe('nano-banana-3')
    expect(request.prompt).toBe('a beautiful sunset')
    expect(request.width).toBe(1024)
    expect(request.height).toBe(1024)
    expect(request.num_inference_steps).toBe(30)
    expect(request.seed).toBe(42)
  })
})
```

## 视频模型接入

### 步骤概览

1. 创建模型文件（一模型一文件）
2. 定义模型配置
3. 注册到视频模型注册表（自动发现）
4. 测试模型

### 1. 创建模型文件

**位置**: `src/features/canvas/models/video/<provider>/`

**文件名**: `<model-name>.ts`

```typescript
// src/features/canvas/models/video/kling/kling-4.0.ts
import type { VideoModelDefinition } from '../../types'

export const videoModel: VideoModelDefinition = {
  id: 'kling/kling-4.0',
  mediaType: 'video',
  displayName: 'Kling 4.0',
  providerId: 'kling',
  description: 'Kling 第四代视频生成模型',
  
  // 预计完成时间（用于前端进度条）
  eta: 120,  // 秒
  expectedDurationMs: 120000,
  
  // 支持的时长选项
  durations: [
    { value: '3s', label: '3 秒' },
    { value: '5s', label: '5 秒' },
    { value: '10s', label: '10 秒' },
    { value: '15s', label: '15 秒' },
    { value: '30s', label: '30 秒' }  // 新增
  ],
  
  // 支持的宽高比
  aspectRatios: [
    { value: '16:9', label: '横屏 (16:9)' },
    { value: '9:16', label: '竖屏 (9:16)' },
    { value: '1:1', label: '方形 (1:1)' },
    { value: '21:9', label: '超宽 (21:9)' }  // 新增
  ],
  
  // 功能开关
  supportsAudio: true,
  supportsSeed: true,
  supportsImageToVideo: true,
  supportsNegativePrompt: true,  // 新增
  
  // 额外参数定义
  extraParamsSchema: {
    multi_shots: {
      type: 'boolean',
      label: '多镜头',
      default: false
    },
    camera_movement: {
      type: 'select',
      label: '镜头运动',
      options: ['static', 'pan', 'zoom', 'dolly'],
      default: 'static'
    }
  },
  
  // 默认额外参数
  defaultExtraParams: {
    multi_shots: false,
    camera_movement: 'static'
  },
  
  // 请求映射函数
  resolveRequest: (params) => ({
    model: 'kling-4.0',
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    duration: parseInt(params.duration.replace('s', '')),
    aspect_ratio: params.aspectRatio,
    seed: params.seed === -1 ? undefined : params.seed,
    image_url: params.imageUrl,
    with_audio: params.withAudio ?? true,
    extra: {
      multi_shots: params.extra?.multi_shots,
      camera_movement: params.extra?.camera_movement
    }
  })
}
```

### 2. 视频模型定义说明

#### 必需字段

- **id**: 格式为 `{provider}/{model}`
- **mediaType**: `'video'`
- **displayName**: 在 UI 中显示的名称
- **providerId**: Provider ID
- **eta**: 预计完成时间（秒）
- **expectedDurationMs**: 预计完成时间（毫秒，用于进度条）
- **durations**: 支持的时长选项
- **aspectRatios**: 支持的宽高比选项
- **resolveRequest**: 请求映射函数

#### 可选字段

- **description**: 模型描述
- **supportsAudio**: 是否支持音频生成（默认 false）
- **supportsSeed**: 是否支持种子控制（默认 false）
- **supportsImageToVideo**: 是否支持图片驱动视频（默认 false）
- **supportsNegativePrompt**: 是否支持反向提示词（默认 false）
- **extraParamsSchema**: 额外参数定义（如 multi_shots、kling_elements）
- **defaultExtraParams**: 默认值

### 3. 额外参数定义

```typescript
extraParamsSchema: {
  // 布尔参数
  multi_shots: {
    type: 'boolean',
    label: '多镜头',
    default: false
  },
  
  // 选择参数
  camera_movement: {
    type: 'select',
    label: '镜头运动',
    options: ['static', 'pan', 'zoom', 'dolly'],
    default: 'static'
  },
  
  // 数字参数
  fps: {
    type: 'number',
    label: '帧率',
    min: 24,
    max: 60,
    default: 30
  },
  
  // 文本参数
  style: {
    type: 'text',
    label: '风格',
    placeholder: '例如：电影感',
    default: ''
  }
}
```

### 4. 自动发现机制

```typescript
// videoRegistry.ts
const videoModelFiles = import.meta.glob('./video/*/*.ts', { eager: true })

for (const path in videoModelFiles) {
  const module = videoModelFiles[path] as any
  if (module.videoModel) {
    videoModels.push(module.videoModel)
  }
}
```

### 5. 测试模型

```typescript
// kling-4.0.test.ts
import { videoModel } from './kling-4.0'

describe('kling-4.0 model', () => {
  it('should have correct id', () => {
    expect(videoModel.id).toBe('kling/kling-4.0')
  })
  
  it('should support 30s duration', () => {
    const durations = videoModel.durations.map(d => d.value)
    expect(durations).toContain('30s')
  })
  
  it('should resolve request with extra params', () => {
    const request = videoModel.resolveRequest({
      prompt: 'a cat walking',
      duration: '10s',
      aspectRatio: '16:9',
      seed: 42,
      extra: {
        multi_shots: true,
        camera_movement: 'pan'
      }
    })
    
    expect(request.model).toBe('kling-4.0')
    expect(request.duration).toBe(10)
    expect(request.extra.multi_shots).toBe(true)
    expect(request.extra.camera_movement).toBe('pan')
  })
})
```

## Provider 共享基础设施

所有基于 KIE API 的 Provider（Kling、Sora2、VEO）共享基础设施：

**位置**: `src/server/video/providers/kie-common.ts`

**功能**:
- 统一 API Key 管理
- 共享图片上传逻辑（支持 http://、data:、base64）
- 共享状态轮询逻辑

**使用**:
```typescript
import { kieVideoProvider } from './kie-common'

export const klingProvider = kieVideoProvider('kling')
export const sora2Provider = kieVideoProvider('sora2')
export const veoProvider = kieVideoProvider('veo')
```

## 检查清单

### 图片模型

- [ ] 创建模型文件（`models/image/<provider>/<model-name>.ts`）
- [ ] 导出 `imageModel: ImageModelDefinition`
- [ ] 定义 `id`、`displayName`、`providerId`
- [ ] 定义 `resolutions` 和 `aspectRatios`
- [ ] 定义 `defaultParams`
- [ ] 实现 `resolveRequest` 函数
- [ ] 编写单元测试
- [ ] 在 UI 中验证模型可选择
- [ ] 测试生成功能

### 视频模型

- [ ] 创建模型文件（`models/video/<provider>/<model-name>.ts`）
- [ ] 导出 `videoModel: VideoModelDefinition`
- [ ] 定义 `id`、`displayName`、`providerId`
- [ ] 定义 `eta` 和 `expectedDurationMs`
- [ ] 定义 `durations` 和 `aspectRatios`
- [ ] 配置功能开关（`supportsAudio` 等）
- [ ] 定义 `extraParamsSchema`（如有）
- [ ] 实现 `resolveRequest` 函数
- [ ] 编写单元测试
- [ ] 在 UI 中验证模型可选择
- [ ] 测试生成功能

---

相关文档：
- `add-provider.md` - 新增 Provider 指南
- `../product/models.md` - AI 模型清单
- `../api/endpoints.md` - AI API 端点
