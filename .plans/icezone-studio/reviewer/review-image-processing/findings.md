# Review: image-dev 工作流 F - 图片处理模块

**审查日期**: 2026-03-25
**审查对象**: D:/ws-image-processing（分支 ws/image-processing）
**裁决**: [OK] 通过 — 初审 [WARN]，3 个 MEDIUM 已全部修复，升级为 [OK]

---

## 审查范围

| 文件 | 行数 | 职责 |
|------|------|------|
| src/server/image/processor.ts | 168 | splitImage, cropImage, mergeImages, resizeImage, getMetadata |
| src/server/image/validation.ts | 78 | Zod schema + 文件提取 + 20MB 限制 |
| app/api/image/split/route.ts | 41 | POST /api/image/split |
| app/api/image/crop/route.ts | 45 | POST /api/image/crop |
| app/api/image/merge/route.ts | 42 | POST /api/image/merge |
| app/api/image/metadata/route.ts | 26 | POST /api/image/metadata |
| 测试文件 x 8 | ~280 | 27 个用例 |

---

## CRITICAL (0)

无。

## HIGH (0)

无。

## MEDIUM (3)

### M1. 缺少文件类型（Content-Type / magic bytes）校验

**位置**: `src/server/image/validation.ts` — `extractFile()` / `extractFiles()`

**问题**: 仅校验文件大小（20MB），未校验文件是否为有效图片格式。用户可以上传任意文件（如 .exe、.html、.svg），sharp 处理非图片时会抛出内部错误，返回泛化的 500 "Internal server error"，而非明确的 400 错误。

**建议**: 至少检查 `file.type` 是否为 `image/png|image/jpeg|image/webp|image/gif`，或在 sharp 解析阶段捕获格式错误后返回 400。

### M2. crop 参数未校验越界

**位置**: `src/server/image/validation.ts` — `cropSchema`，`src/server/image/processor.ts:42-52`

**问题**: `cropSchema` 仅校验 x >= 0, y >= 0, width >= 1, height >= 1，不校验 crop 区域是否超出图片边界。如果 `x + width > imageWidth` 或 `y + height > imageHeight`，sharp 会抛出内部错误（"extract_area: bad extract area"），返回泛化 500 而非友好的 400 提示。

**建议**: 在 `cropImage` 执行前获取 metadata 并校验边界，或在 route handler 中捕获 sharp 的 extract 错误并返回明确的 400 响应。

### M3. merge 缺少文件数量上限

**位置**: `src/server/image/validation.ts` — `extractFiles()`，`app/api/image/merge/route.ts`

**问题**: `extractFiles` 只校验 "至少 1 个文件"，无上限。恶意请求可携带大量图片（每个 < 20MB），导致 sharp 并发处理时内存暴涨。

**建议**: 设置合理上限，如 `max: 20` 或 `max: 50`。

## LOW (3)

### L1. processor.ts 中未使用 `totalWidth` / `totalHeight`

**位置**: `src/server/image/processor.ts:71, 106`

**问题**: `mergeImages` 中水平合并计算了 `totalWidth`、垂直合并计算了 `totalHeight`，但实际使用 `offsetX` / `offsetY` 作为最终宽高（因为 resize 可能改变尺寸）。这两个变量是死代码。

### L2. 四条 route 的错误处理模式高度重复

**位置**: 四个 route.ts 文件的 catch 块

**问题**: `FileTooLargeError -> 413, ValidationError -> 400, ZodError -> 400, else -> 500` 逻辑在四个文件中完全重复。

**建议**: 可抽取一个 `handleImageApiError(error)` 工具函数，减少重复。优先级低，当前代码量不大，不影响正确性。

### L3. split 返回 base64 数组，大图场景可能导致响应体过大

**位置**: `app/api/image/split/route.ts:23-25`

**问题**: 10x10 切割一张 20MB 图片 = 100 个 base64 块，响应体可能非常大。当前阶段可接受，后续可考虑改为上传到 Storage 后返回 URL 列表。

---

## 正面评价

1. **代码结构清晰**: processor / validation / route 三层分离，职责单一，符合项目架构规范。
2. **Zod 校验全面**: 所有参数均通过 Zod schema 校验，`z.coerce.number()` 处理 FormData 字符串转换。
3. **自定义错误类设计合理**: `ValidationError` / `FileTooLargeError` 分类明确，错误码映射清晰。
4. **测试覆盖良好**: 27 个用例涵盖正常路径、边界条件、参数校验、文件缺失、越界参数。
5. **无 console.log 残留**: 生产代码中无调试日志。
6. **文件规模控制良好**: 最大文件 168 行，远低于 400 行警戒线。
7. **merge 的自动对齐逻辑合理**: 水平合并统一高度、垂直合并统一宽度，保持比例。

---

## 结论

**[OK]** — 代码质量良好，架构清晰，测试充分。初审 3 个 MEDIUM 问题已全部修复：M1 文件类型白名单校验、M2 crop 越界校验、M3 merge 文件数量上限。29 用例全通过。通过审查。
