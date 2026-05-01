# 如何扩展新的聚合维度

本指南说明如何在 `GET /api/settings/call-history` 基础上，添加新的聚合维度（例如：按 provider 分组、按日期分组）。

## 架构说明

调用历史存储在 `model_call_history` 表中，字段包括：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键 |
| `user_id` | uuid | 关联用户 |
| `logical_model_id` | text | 逻辑模型 ID，如 `nano-banana-2` |
| `key_id` | uuid \| null | 关联 API Key（key 删除后置 NULL） |
| `status` | text | `success` \| `failed` \| `timeout` |
| `latency_ms` | integer | 调用延迟（ms） |
| `cost_estimate_cents` | integer | 预估费用（美分） |
| `created_at` | timestamptz | 调用时间 |

已存在索引：
- `idx_history_user_model_time` on `(user_id, logical_model_id, created_at DESC)`
- `idx_history_user_key_time` on `(user_id, key_id, created_at DESC)`

## 添加新聚合维度的步骤

### Step 1: 确定新维度的 SQL 查询

以「按 provider 分组」为例，provider 信息需要 JOIN `user_api_keys` 表：

```sql
SELECT
  k.provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE h.status = 'success') AS success_count,
  ROUND(AVG(h.latency_ms)) AS avg_latency_ms,
  SUM(h.cost_estimate_cents) AS total_cost_cents
FROM model_call_history h
LEFT JOIN user_api_keys k ON h.key_id = k.id
WHERE h.user_id = $1
  AND h.created_at >= NOW() - INTERVAL '30 days'
GROUP BY k.provider
ORDER BY total DESC;
```

### Step 2: 在 route.ts 中添加新聚合

在 `src/app/api/settings/call-history/route.ts` 的聚合模式分支中，添加新字段：

```typescript
// 按 provider 分组（示例）
const byProvider: Record<string, { total: number; success: number }> = {}
for (const r of rows) {
  // 需要先在 select 中加入 key_id 和 JOIN user_api_keys
  // 此处仅示意聚合逻辑
}

return NextResponse.json({
  total,
  successCount,
  avgLatencyMs,
  totalCostCents,
  byModel,
  byProvider, // 新增字段
})
```

### Step 3: 更新 CostSummaryPanel（如需展示）

在 `src/features/settings/CostSummaryPanel.tsx` 中：

1. 在 `CallHistoryStats` interface 中添加新字段：
   ```typescript
   byProvider?: Record<string, { total: number; success: number }>
   ```

2. 在 JSX 中添加新的展示表格（参考 `byModel` 部分的实现）。

3. 在 `src/i18n/locales/zh.json` 和 `en.json` 的 `settings.costPanel` 中添加对应标签。

### Step 4: 测试

在 `src/app/api/settings/call-history/route.test.ts` 中为新字段添加测试用例：

```typescript
it('byProvider 按 provider 正确分组', async () => {
  // mock 数据包含 provider 信息
  mockLimit.mockResolvedValueOnce({ data: rowsWithProvider, error: null })
  const res = await GET(makeRequest())
  const body = await res.json()
  expect(body.byProvider['kie'].total).toBe(2)
})
```

### Step 5: 文档

更新 `docs/api/routing.md` 中 `GET /api/settings/call-history` 的 Response 格式，加入新字段说明。

## 注意事项

- **limit 上限**：聚合模式默认读取最近 500 条记录做内存聚合。若数据量超大，应改为 Supabase 的 `rpc()` 调用服务端聚合函数。
- **NULL 处理**：`key_id` 在 key 被删除后为 NULL，聚合时需要 `LEFT JOIN` 并处理 NULL provider。
- **索引**：新的聚合维度若涉及非 `user_id + created_at` 的查询路径，考虑在 `supabase/migrations/` 中新增索引迁移文件。
