# canvas-dev - 任务计划

> 角色: Phase 1 工作流 C — 画布 + 节点
> 状态: blocked（等待 db-dev 完成 B.2+B.3）
> worktree: D:/ws-canvas-nodes（分支 ws/canvas-nodes）
> 创建: 2026-03-25

## 目标

在 ws-canvas-nodes worktree 中完成 Phase 1 工作流 C：
Web 版画布编辑器，含节点渲染、图片上传、自动保存和工具体系。
**前置条件**：db-dev 的项目 CRUD API（B.2）和草稿 API（B.3）已合并到 main。

## 详细步骤

### C.1 从桌面版复制画布域代码（直接复用）
- [ ] src/features/canvas/domain/ — canvasNodes, nodeRegistry, nodeDisplay（原样复制）
- [ ] src/features/canvas/models/ — 模型定义、注册表（原样复制）
- [ ] src/features/canvas/tools/ — 工具类型、内置工具（原样复制）
- [ ] src/features/canvas/ui/ — UI 组件（原样复制）
- [ ] src/features/canvas/edges/, hooks/, pricing/（原样复制）
- [ ] src/stores/canvasStore.ts（原样复制，零 Tauri 依赖）
- [ ] src/components/ui/primitives.tsx（原样复制）

**注意**: 桌面版仓库路径需要从 team-lead 获取，或通过 WebSearch 确认

### C.2 节点组件适配（从桌面版复制后微调）
- [ ] 从桌面版复制 nodes/*.tsx
- [ ] 替换 Tauri 文件操作 → Web API（`<input type="file">`, `<a download>`, `window.open`）

### C.3 基础设施适配器
- [ ] src/features/canvas/application/ports.ts — 接口定义（AiGateway, VideoAiGateway, ImageSplitGateway, ImagePersistence）
- [ ] src/features/canvas/infrastructure/webAiGateway.ts — 实现 AiGateway
- [ ] src/features/canvas/infrastructure/webVideoGateway.ts — 实现 VideoAiGateway
- [ ] src/features/canvas/infrastructure/webImageSplitGateway.ts — 实现 ImageSplitGateway
- [ ] src/features/canvas/infrastructure/webImagePersistence.ts — 实现 ImagePersistence

**先写测试：**
- __tests__/unit/webAiGateway.test.ts
- __tests__/unit/webImageSplitGateway.test.ts
- __tests__/unit/imageData-web.test.ts

### C.4 imageData 重写
- [ ] 基于 Supabase Storage 重写 imageData（替换 Tauri 本地文件）

### C.5 服务接线切换
- [ ] src/features/canvas/application/canvasServices.ts — 切换到 Web 适配器

### C.6 画布页面
- [ ] app/(app)/canvas/[id]/page.tsx — 'use client'
- [ ] 加载草稿、自动保存、保存状态指示器（从 projectStore 读取）

### C.7 资产上传管道
- [ ] app/api/assets/upload/route.ts — 签名上传 URL
- [ ] app/api/assets/complete/route.ts — 注册资产元数据

**先写测试：**
- __tests__/api/assets-upload.test.ts
- __tests__/e2e/canvas-basic.spec.ts
- __tests__/e2e/canvas-upload.spec.ts
- __tests__/e2e/canvas-save.spec.ts
- __tests__/e2e/canvas-tools.spec.ts

## 验证门控（完成后检查）
- [ ] 画布正常加载项目数据
- [ ] 所有节点类型正常渲染
- [ ] 图片上传 → 显示 → 自动保存 → 刷新 → 恢复
- [ ] 撤销/重做可用
- [ ] 工具产生结果节点

## 涉及文件（主要）
- src/features/canvas/（大量文件）
- src/stores/canvasStore.ts
- src/components/ui/primitives.tsx
- app/(app)/canvas/[id]/page.tsx
- app/api/assets/upload/route.ts, complete/route.ts

## 备注
- 必须先 rebase 到 main（包含 db-dev 的 B.2+B.3）再开始此工作流
- TDD 流程：先写失败测试 → 最少实现通过 → 重构
- 完成后提 PR: ws/canvas-nodes → main
