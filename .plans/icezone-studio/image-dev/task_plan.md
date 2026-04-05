# image-dev - 任务计划

> 角色: Phase 0 工作流 F — 图片处理 API
> 状态: in_progress
> worktree: D:/ws-image-processing（分支 ws/image-processing）
> 创建: 2026-03-25

## 目标

在 ws-image-processing worktree 中完成 Phase 0 工作流 F：
基于 sharp 的图片处理 API（split/crop/merge/resize/metadata），含完整 TDD 测试。

## 详细步骤

### F.1 Sharp 图片处理器
- [ ] 安装 sharp @types/sharp
- [ ] src/server/image/processor.ts — split、crop、merge、resize、metadata

**先写测试（使用测试图片）：**
- __tests__/unit/image-split.test.ts — 2x2 切割产生 4 张正确尺寸图片
- __tests__/unit/image-crop.test.ts — 16:9 裁剪
- __tests__/unit/image-merge.test.ts — 2 张图片合并
- __tests__/unit/image-resize.test.ts — 保持比例缩放
- __tests__/unit/image-metadata.test.ts — 元数据读写往返

### F.2 API 路由
- [ ] app/api/image/split/route.ts
- [ ] app/api/image/crop/route.ts
- [ ] app/api/image/merge/route.ts
- [ ] app/api/image/metadata/route.ts
- [ ] Zod 校验 + 文件大小限制（> 20MB 拒绝）

**先写测试：**
- __tests__/api/image-split.test.ts
- __tests__/api/image-crop.test.ts
- __tests__/api/image-validation.test.ts — 拒绝超大文件和无效参数

### F.3 CJK 字体
- [ ] 捆绑 Noto Sans CJK 子集到 public/fonts/，用于分镜合并文字叠加

## 验证门控（完成后检查）
- [ ] 全部 vitest 测试通过
- [ ] API 返回正确 Content-Type 和状态码
- [ ] 真实图片切割/合并验证（可手动测试）

## 涉及文件（主要）
- src/server/image/processor.ts
- app/api/image/split/route.ts, crop/route.ts, merge/route.ts, metadata/route.ts
- __tests__/unit/image-*.test.ts
- __tests__/api/image-*.test.ts
- public/fonts/（Noto Sans CJK 子集）

## 备注
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- 测试图片放在 __tests__/fixtures/
- 禁止在此工作流改动 app/(auth)/ 或 src/stores/
- 完成后提 PR: ws/image-processing → main
