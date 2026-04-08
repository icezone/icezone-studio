# API 端点参考

本文档列出 IceZone Studio 的所有 API 端点（23+）。

## AI 生成

### POST /api/ai/image/generate

生成或编辑图片。

**请求参数**:
```typescript
{
  model: string;           // 模型 ID（如 "kie/nano-banana-2"）
  prompt: string;          // 提示词
  imageUrl?: string;       // 可选：参考图片（编辑模式）
  aspectRatio?: string;    // 宽高比（如 "16:9"）
  seed?: number;           // 可选：随机种子
}
```

**响应**:
```typescript
{
  imageUrl: string;        // 生成的图片 URL
  jobId?: string;          // 异步任务 ID（如果是异步模式）
}
```

---

### POST /api/ai/video/generate

生成视频。

**请求参数**:
```typescript
{
  model: string;           // 模型 ID（如 "kling/kling-3.0"）
  prompt: string;          // 提示词
  imageUrl?: string;       // 可选：参考图片（Image-to-Video）
  duration: string;        // 时长（如 "5s", "10s"）
  aspectRatio?: string;    // 宽高比
  seed?: number;           // 可选：随机种子
}
```

**响应**:
```typescript
{
  jobId: string;           // 任务 ID（异步）
  estimatedTime: number;   // 预计完成时间（毫秒）
}
```

---

### GET /api/ai/models

获取可用的 AI 模型列表。

**响应**:
```typescript
{
  image: ImageModelDefinition[];    // 图片模型列表
  video: VideoModelDefinition[];    // 视频模型列表
}
```

## AI 分析

### POST /api/ai/novel-analyze

分析小说/剧本文本，拆分场景并提取角色。

**请求参数**:
```typescript
{
  text: string;            // 小说/剧本文本
  language?: string;       // 语言（默认 "zh"）
}
```

**响应**:
```typescript
{
  scenes: Array<{
    index: number;
    description: string;
    characters: string[];
  }>;
  characters: Array<{
    name: string;
    description: string;
  }>;
}
```

---

### POST /api/ai/reverse-prompt

从图片生成描述性提示词。

**请求参数**:
```typescript
{
  imageUrl: string;        // 图片 URL
  language?: string;       // 输出语言（默认 "zh"）
}
```

**响应**:
```typescript
{
  prompt: string;          // 生成的提示词
}
```

---

### POST /api/ai/shot-analysis

专业影视镜头分析。

**请求参数**:
```typescript
{
  imageUrl: string;        // 图片 URL
}
```

**响应**:
```typescript
{
  shotType: string;        // 景别（如 "特写", "中景"）
  cameraMovement: string;  // 运镜（如 "推镜头", "摇镜头"）
  lighting: string;        // 灯光（如 "自然光", "顶光"）
  composition: string;     // 构图（如 "三分法", "中心构图"）
}
```

## 视频分析

### POST /api/video/analyze

视频场景检测与关键帧提取。

**请求参数**:
```typescript
{
  videoUrl: string;        // 视频 URL
  options?: {
    sceneThreshold?: number;  // 场景检测阈值（0-1）
    maxKeyframes?: number;    // 最大关键帧数量
  }
}
```

**响应**:
```typescript
{
  jobId: string;           // 任务 ID（异步）
}
```

**任务完成后**:
```typescript
{
  scenes: Array<{
    startTime: number;     // 场景开始时间（秒）
    endTime: number;       // 场景结束时间（秒）
    keyframe: string;      // 关键帧图片 URL
  }>;
}
```

## 图片处理

### POST /api/image/crop

裁剪图片。

**请求参数**:
```typescript
{
  imageUrl: string;        // 原图 URL
  x: number;               // 左上角 X 坐标（像素）
  y: number;               // 左上角 Y 坐标（像素）
  width: number;           // 裁剪宽度（像素）
  height: number;          // 裁剪高度（像素）
}
```

**响应**:
```typescript
{
  imageUrl: string;        // 裁剪后的图片 URL
}
```

---

### POST /api/image/split

网格切割图片为多个分镜。

**请求参数**:
```typescript
{
  imageUrl: string;        // 原图 URL
  rows: number;            // 行数（1-10）
  columns: number;         // 列数（1-10）
  lineWidth?: number;      // 网格线宽度（像素，默认 0）
}
```

**响应**:
```typescript
{
  images: Array<{
    url: string;           // 分镜图片 URL
    row: number;           // 行索引
    column: number;        // 列索引
  }>;
}
```

---

### POST /api/image/merge

合并多个图片为一张。

**请求参数**:
```typescript
{
  images: Array<{
    url: string;           // 图片 URL
    x: number;             // X 坐标
    y: number;             // Y 坐标
  }>;
  width: number;           // 画布宽度
  height: number;          // 画布高度
}
```

**响应**:
```typescript
{
  imageUrl: string;        // 合并后的图片 URL
}
```

---

### GET /api/image/metadata

获取图片元数据。

**查询参数**:
- `url`: 图片 URL

**响应**:
```typescript
{
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  format: string;          // 格式（如 "png", "jpeg"）
  size: number;            // 文件大小（字节）
}
```

## 资产管理

### POST /api/assets/upload

直接上传资产文件。

**请求**: `multipart/form-data`
- `file`: 文件数据

**响应**:
```typescript
{
  url: string;             // 资产 URL
  id: string;              // 资产 ID
}
```

---

### POST /api/assets/upload-url

获取预签名上传 URL（用于大文件）。

**请求参数**:
```typescript
{
  filename: string;        // 文件名
  contentType: string;     // MIME 类型
}
```

**响应**:
```typescript
{
  uploadUrl: string;       // 预签名上传 URL
  assetId: string;         // 资产 ID
}
```

---

### POST /api/assets/complete

标记资产上传完成。

**请求参数**:
```typescript
{
  assetId: string;         // 资产 ID
}
```

**响应**:
```typescript
{
  url: string;             // 资产 URL
}
```

## 项目管理

### GET /api/projects

列出用户的所有项目。

**响应**:
```typescript
{
  projects: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

---

### POST /api/projects

创建新项目。

**请求参数**:
```typescript
{
  name: string;            // 项目名称
  initialData?: object;    // 可选：初始画布数据
}
```

**响应**:
```typescript
{
  id: string;              // 项目 ID
  name: string;
  createdAt: string;
}
```

---

### GET /api/projects/[id]

获取项目详情。

**响应**:
```typescript
{
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### PUT /api/projects/[id]

更新项目信息。

**请求参数**:
```typescript
{
  name?: string;           // 项目名称
  thumbnail?: string;      // 缩略图 URL
}
```

---

### DELETE /api/projects/[id]

删除项目。

---

### GET /api/projects/[id]/draft

获取项目草稿（画布状态）。

**响应**:
```typescript
{
  data: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
  };
  revision: number;        // 版本号（用于冲突检测）
}
```

---

### PUT /api/projects/[id]/draft

保存项目草稿（完整更新）。

**请求参数**:
```typescript
{
  data: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
  };
  expectedRevision?: number;  // 可选：用于冲突检测
}
```

**响应**:
```typescript
{
  revision: number;        // 新版本号
}
```

**错误**:
- `409 Conflict`: 版本冲突，需要重新加载

---

### PATCH /api/projects/[id]/draft/viewport

更新视口状态（轻量更新）。

**请求参数**:
```typescript
{
  viewport: {
    x: number;
    y: number;
    zoom: number;
  }
}
```

## 模板

### GET /api/templates

列出模板。

**查询参数**:
- `scope`: "public" | "private" | "all"

**响应**:
```typescript
{
  templates: Array<{
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    isPublic: boolean;
    createdAt: string;
  }>;
}
```

---

### GET /api/templates/[id]

获取模板详情。

**响应**:
```typescript
{
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  data: TemplateData;      // 画布数据
  isPublic: boolean;
}
```

---

### POST /api/templates

创建模板。

**请求参数**:
```typescript
{
  name: string;
  description?: string;
  data: TemplateData;      // 画布数据
  isPublic?: boolean;
}
```

---

### PUT /api/templates/[id]

更新模板。

**请求参数**:
```typescript
{
  name?: string;
  description?: string;
  data?: TemplateData;
  isPublic?: boolean;
}
```

---

### DELETE /api/templates/[id]

删除模板。

---

### POST /api/templates/[id]/publish

发布模板（设为公开）。

---

### POST /api/templates/[id]/use

使用模板（记录使用次数）。

## 设置

### GET /api/settings/api-keys

获取用户的 API Key 配置。

**响应**:
```typescript
{
  providers: {
    [providerId: string]: {
      hasKey: boolean;     // 是否已配置（不返回实际 Key）
    }
  }
}
```

---

### PUT /api/settings/api-keys

设置 API Key。

**请求参数**:
```typescript
{
  providerId: string;      // Provider ID
  apiKey: string;          // API Key（将被加密存储）
}
```

**加密**:
- 算法：AES-256-GCM
- 存储位置：Supabase `user_settings` 表

---

### DELETE /api/settings/api-keys/[providerId]

删除 API Key。

## 任务轮询

### GET /api/jobs/[id]

查询异步任务状态。

**响应**:
```typescript
{
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;       // 进度（0-100）
  result?: any;            // 任务结果（完成时）
  error?: string;          // 错误信息（失败时）
}
```

## 支付

### POST /api/billing/checkout

创建支付会话。

**请求参数**:
```typescript
{
  plan: string;            // 套餐 ID
  provider: "paypal" | "alipay" | "wechat";
}
```

**响应**:
```typescript
{
  checkoutUrl: string;     // 支付页面 URL
}
```

## 错误响应格式

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

**常见错误代码**:
- `400 Bad Request`: 请求参数无效
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `409 Conflict`: 版本冲突
- `429 Too Many Requests`: 速率限制
- `500 Internal Server Error`: 服务器错误

---

相关文档：
- `authentication.md` - 认证授权机制
- `error-handling.md` - 错误处理详解
- `../product/models.md` - AI 模型清单
- `../product/nodes.md` - 节点类型清单
