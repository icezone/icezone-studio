# icezone-studio - API 契约

> 前后端接口定义。字段名和类型的真理源头。
> 维护者：devs（添加/变更端点时**必须**更新）
> 创建: 2026-03-25

---

## 认证（Supabase Auth 内置）

Supabase Auth 处理认证，无需自定义端点。
客户端使用 `@supabase/ssr` 管理 session cookie。

---

## 项目 CRUD

### GET /api/projects
Response:
```json
[{ "id": "uuid", "name": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }]
```

### POST /api/projects
Request: `{ "name": "string" }`
Response: `{ "id": "uuid", "name": "string", "created_at": "ISO8601" }`

### GET /api/projects/[id]
Response: `{ "id": "uuid", "name": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }`

### PATCH /api/projects/[id]
Request: `{ "name": "string" }`
Response: `{ "id": "uuid", "name": "string" }`

### DELETE /api/projects/[id]
Response: `204 No Content`

---

## 草稿

### GET /api/projects/[id]/draft
Response: `{ "data": object, "revision": number, "updated_at": "ISO8601" }`

### PUT /api/projects/[id]/draft
Request: `{ "data": object, "expectedRevision": number }`
Response success: `{ "revision": number }`
Response conflict: `409 { "error": "conflict", "serverRevision": number }`

### PATCH /api/projects/[id]/draft/viewport
Request: `{ "x": number, "y": number, "zoom": number }`
Response: `204 No Content`

---

## 资产

### POST /api/assets/upload
Request: `{ "projectId": "uuid", "filename": "string", "contentType": "string", "size": number }`
Response: `{ "uploadUrl": "string", "assetId": "uuid" }`

### POST /api/assets/complete
Request: `{ "assetId": "uuid" }`
Response: `{ "url": "string" }`

---

## 图片处理

### POST /api/image/split
Request: `FormData { file: File, rows: number, cols: number }`
Response: `{ "images": ["base64 | url"] }` 或直接返回 zip

### POST /api/image/crop
Request: `FormData { file: File, x: number, y: number, width: number, height: number }`
Response: `image/jpeg` 或 `image/png`

### POST /api/image/merge
Request: `FormData { files: File[], direction: "horizontal|vertical" }`
Response: `image/jpeg` 或 `image/png`

### POST /api/image/metadata
Request: `FormData { file: File }`
Response: `{ "width": number, "height": number, "format": "string", "size": number }`

通用错误：`413 { "error": "file_too_large" }`（> 20MB）

---

## AI 生成

### POST /api/ai/image/generate
Request:
```json
{
  "nodeId": "string",
  "projectId": "uuid",
  "modelId": "string",
  "prompt": "string",
  "imageUrl": "string | null",
  "params": object
}
```
Response sync: `{ "imageUrl": "string" }`
Response async: `{ "jobId": "uuid" }`
Error 402: `{ "error": "insufficient_credits", "required": number, "available": number }`

### GET /api/ai/models
Response: `[{ "id": "string", "displayName": "string", "providerId": "string" }]`

### GET /api/jobs/[id]
Response: `{ "id": "uuid", "status": "pending|running|completed|failed", "result": object | null, "error": string | null }`

---

## 视频生成

### POST /api/ai/video/generate
Request:
```json
{
  "nodeId": "string",
  "projectId": "uuid",
  "modelId": "string",
  "imageUrl": "string",
  "prompt": "string",
  "duration": number,
  "aspectRatio": "string",
  "extraParams": object
}
```
Response: `{ "jobId": "uuid" }`

---

## 错误约定

| 状态码 | 含义 |
|--------|------|
| 400 | 请求参数无效（含 Zod 校验失败详情） |
| 401 | 未认证 |
| 402 | 积分不足 |
| 403 | 无权限（RLS） |
| 404 | 资源不存在 |
| 409 | 并发冲突（草稿 revision 不匹配） |
| 413 | 文件过大 |
| 500 | 服务端错误 |
