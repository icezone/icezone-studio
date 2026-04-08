# 开发工作流

本文档说明 IceZone Studio 的开发工作流程和验证标准。

## 工作流程

### 1. 明确变更范围

先界定是以下哪种类型的变更：
- UI 变更
- 节点行为变更
- 工具逻辑变更
- 模型适配变更
- API 路由变更
- 持久化/性能变更

### 2. TDD 流程

遵循测试驱动开发流程：

1. **先写失败的测试**：描述期望行为
2. **实现最少代码**：使测试通过
3. **重构**：保持测试绿色
4. **提交前运行完整测试套件**

### 3. 沿着数据流改动

遵循数据流方向：

```
UI 输入 → Store → 应用服务 → API Routes → Supabase/Provider
```

**禁止跨层"偷改"状态**：尽量只在对应层处理对应职责。

### 4. 小步提交与即时验证

每次改动后做轻量检查（见下文"快速检查"），通过后再继续。

### 5. 本地浏览器验证优先

- 功能开发阶段以本地 `npm run dev` + 浏览器验证为主
- 确保功能在本地完全可用后再考虑部署

### 6. 最后做一次完整构建

在功能收尾或大改合并前运行完整构建。

### 7. 发布快捷口令

当用户明确说"推送更新"时，默认执行一次补丁版本发布：
- 基于上一个 release/tag 自动递增 patch 版本号
- 汇总代码变动生成 Markdown 更新日志
- 完成版本同步、发布提交、annotated tag 与远端推送
- 如用户额外指定 minor/major 或自定义说明，则按用户要求覆盖默认行为

自动生成的更新日志正文只保留 `## 新增`、`## 优化`、`## 修复` 等二级标题分组与对应列表项；不要额外输出 `# vx.y.z` 标题、`基于某个 tag 之后的若干提交整理` 说明或 `## 完整提交` 区块，空分组可省略。

## 常用命令

### 开发服务器

```bash
# 启动开发服务器（本地浏览器验证）
npm run dev
```

### 测试

```bash
# 运行单元测试
npx vitest run

# 运行单元测试（watch 模式）
npx vitest

# 运行 E2E 测试
npx playwright test

# 运行特定测试文件
npx vitest run __tests__/unit/xxx.test.ts
npx playwright test __tests__/e2e/xxx.spec.ts
```

### Supabase 本地开发

```bash
npx supabase start
npx supabase db reset        # 重置并重跑迁移
npx supabase migration new <name>  # 创建新迁移
```

## 验证标准

### 快速检查（优先执行）

```bash
# TS 类型检查
npx tsc --noEmit

# 单元测试
npx vitest run

# lint 检查
npm run lint
```

### 收尾检查

```bash
# 前端完整构建
npm run build

# 全量 E2E 测试
npx playwright test

# 触发一次正式发布
npm run release -- patch --notes-file docs/releases/vx.y.z.md
```

### 检查说明

- **日常迭代**：以 `tsc --noEmit` + `vitest run` + 浏览器手测为主
- **影响打包、依赖、入口、API 路由时**：执行完整构建
- **E2E 测试**：在合并前运行
- **发布说明**：优先落到 `docs/releases/vx.y.z.md`，再通过 `npm run release` 或"推送更新"口令触发发布
- `docs/releases/vx.y.z.md` 的默认格式同样只保留二级标题分组和列表正文，不写额外总标题、范围说明和完整提交清单

## CHANGELOG 同步规则

- **每次合并 PR 到 main 时，必须同步更新 `CHANGELOG.md`**
- 在 `[Unreleased]` 区块下追加本次变更条目，按 `Added` / `Changed` / `Fixed` / `Removed` 分组
- 条目格式：一句话描述变更，不带 commit hash 或 PR 编号
- 正式发布时，将 `[Unreleased]` 内容移到新版本号标题下，清空 `[Unreleased]`
- CHANGELOG 采用双语格式（English + 中文），两个语言区块都需要同步更新

## 提交前检查清单

- [ ] 功能路径可用（至少手测 1 条主路径 + 1 条异常路径）
- [ ] 无明显性能回退（拖拽、缩放、输入响应）
- [ ] 轻量检查通过：`npx tsc --noEmit` + `npx vitest run`
- [ ] 大改或发布前：`npm run build` + `npx playwright test`
- [ ] 如为正式发布，确认 `docs/releases/vx.y.z.md` 已更新，并与本次 tag/版本号一致
- [ ] 新增约束/行为变化需同步更新文档

---

相关文档：
- `code-quality.md` - 代码质量标准
- `testing.md` - 测试规范详解
- `../architecture/codebase-guide.md` - 代码库导航
- `../architecture/tech-stack.md` - 技术栈说明
