# image-dev - 工作日志

> 用于上下文恢复。压缩/重启后先读此文件。

---

（待 image-dev 开始工作后填写）

## 2026-03-25 19:49 — F.1 + F.2 完成

### F.1 Sharp 图片处理器
- 安装 sharp @types/sharp vitest
- 创建 vitest.config.ts（node 环境 + @/ alias）
- 实现 src/server/image/processor.ts：splitImage, cropImage, mergeImages, resizeImage, getMetadata
- 5 个单元测试文件，16 个测试用例全部通过

### F.2 API 路由
- 实现 src/server/image/validation.ts：Zod schema + 文件提取 + 20MB 限制
- 实现 4 个 API 路由：split, crop, merge, metadata
- 3 个 API 测试文件，11 个测试用例全部通过
- npx tsc --noEmit 零错误

### 测试统计
- 8 个测试文件，27 个测试用例，全部通过
- 覆盖：split, crop, merge, resize, metadata + 验证（413/400 错误码）

## 2026-03-25 19:59 — 审查反馈修复

- M1: extractFile/extractFiles 增加 file.type 白名单校验（png/jpeg/webp/gif/tiff/avif）
- M2: crop 路由增加 x+width/y+height 边界校验，越界返回 400
- M3: extractFiles 增加 MAX_MERGE_FILES=50 数量上限
- 新增 2 个测试用例（unsupported type + crop bounds）
- 29/29 测试通过，tsc 零错误
