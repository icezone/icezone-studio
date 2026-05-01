# Routing API Reference

## Overview

Smart Routing 为每次 AI 生成请求自动选择最优 API Key，基于成功率、延迟和成本三维评分。

---

## Endpoints

### GET /api/settings/call-history

返回当前用户近 30 天的调用统计。

#### 聚合模式（默认）

```
GET /api/settings/call-history
```

**Response 200:**

```json
{
  "total": 42,
  "successCount": 38,
  "avgLatencyMs": 1240,
  "totalCostCents": 186,
  "byModel": {
    "nano-banana-2": {
      "total": 20,
      "success": 18,
      "avgLatencyMs": 980,
      "totalCostCents": 60
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | number | 30 天内总调用次数（最多 500 条） |
| `successCount` | number | 状态为 `success` 的次数 |
| `avgLatencyMs` | number | 全部调用平均延迟（ms） |
| `totalCostCents` | number | 预估总费用（美分） |
| `byModel` | object | 按逻辑模型 ID 分组的明细 |

#### 分页模式

```
GET /api/settings/call-history?page=1&pageSize=20
```

**Query Params:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | — | 页码（从 1 开始），有此参数时切换为分页模式 |
| `pageSize` | number | 20 | 每页条数，最大 100 |

**Response 200:**

```json
{
  "records": [
    {
      "id": "uuid",
      "logical_model_id": "nano-banana-2",
      "status": "success",
      "latency_ms": 980,
      "cost_estimate_cents": 3,
      "created_at": "2026-04-30T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

---

### GET /api/settings/routing-preferences

返回当前用户的三层路由偏好（scenario 级 + model 级）。

```
GET /api/settings/routing-preferences
```

**Response 200:**

```json
{
  "preferences": [
    {
      "id": "uuid",
      "level": "scenario",
      "target": "image",
      "preferred_key_id": "key-uuid-or-null",
      "fallback_enabled": true
    },
    {
      "id": "uuid",
      "level": "model",
      "target": "nano-banana-2",
      "preferred_key_id": "key-uuid",
      "fallback_enabled": true
    }
  ]
}
```

### POST /api/settings/routing-preferences

创建或更新路由偏好（upsert by level + target）。

**Request Body:**

```json
{
  "level": "scenario",
  "target": "image",
  "preferred_key_id": "key-uuid-or-null",
  "fallback_enabled": true
}
```

| 字段 | 说明 |
|------|------|
| `level` | `"scenario"` \| `"model"` |
| `target` | scenario 名称或 logicalModelId |
| `preferred_key_id` | 指定 key UUID；`null` = 自动选择 |
| `fallback_enabled` | 首选 key 失败时是否自动 fallback |

---

### GET /api/settings/capabilities

返回当前用户已解锁的逻辑模型 ID 集合。

```
GET /api/settings/capabilities
```

**Response 200:**

```json
{
  "byKey": {
    "key-uuid": ["nano-banana-2", "nano-banana-pro"]
  },
  "all": ["nano-banana-2", "nano-banana-pro", "grok-image"]
}
```

---

## Error Responses

所有 endpoint 在认证失败时返回：

```json
{ "error": "unauthorized" }
```

HTTP 状态码：`401`

数据库错误时返回：

```json
{ "error": "error message from Supabase" }
```

HTTP 状态码：`500`
