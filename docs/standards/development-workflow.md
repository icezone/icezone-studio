# 开发工作流

本文档说明 IceZone Studio 的开发工作流程和验证标准。

## 标准工作流（OpenSpec + planning-with-files）

IceZone Studio 采用两阶段工作流：

### 阶段 1: 计划（使用 OpenSpec）

**目的**：明确"为什么做"、"做什么"、"怎么做"

**命令**：`/opsx:propose`

**输出**：在 `openspec/changes/<change-id>/` 生成：

```
openspec/changes/<change-id>/
├── proposal.md          # 变更提案
│   ├── 问题陈述
│   ├── 解决方案
│   └── 影响范围
├── specs/               # 需求文档
│   ├── requirements.md  # 功能需求
│   └── scenarios.md     # 使用场景
├── design.md            # 技术设计
│   ├── 架构决策
│   ├── 数据模型
│   └── API 设计
└── tasks.md             # 实施清单
    └── [ ] Task 1
    └── [ ] Task 2
    └── ...
```

**关键原则**：
- ✅ 先规划后实施，避免返工
- ✅ proposal 说明"为什么"，design 说明"怎么做"
- ✅ tasks.md 是可执行的清单（checkbox 格式）
- ❌ 不要跳过规划直接写代码

---

### 阶段 2: 实施（使用 planning-with-files）

**目的**：基于 tasks.md 执行开发，自动同步任务状态

**命令**：`/plan`

**工作方式**：
1. 读取 `openspec/changes/<change-id>/tasks.md`
2. 逐个执行任务（TDD 流程）
3. 完成后自动更新 tasks.md（标记 ✅）
4. 每个里程碑后运行验证

**关键原则**：
- ✅ 严格遵循 tasks.md，不自行扩需求
- ✅ TDD 流程：先写测试，再写实现
- ✅ 小步提交：每完成一个任务就提交
- ❌ 不要偏离 tasks.md 范围

---

### 完整流程示例

```bash
# 1. 创建变更提案
/opsx:propose
# 输入：我想添加视频导出功能
# 输出：openspec/changes/001-add-video-export/
#       ├── proposal.md
#       ├── specs/
#       ├── design.md
#       └── tasks.md

# 2. 审查提案（人工）
# 检查 proposal/design/tasks 是否合理

# 3. 执行开发
/plan
# 自动读取 tasks.md，逐个执行任务
# 完成后自动标记 ✅

# 4. 归档变更
/opsx:archive
# 变更完成后归档
```

---

### 其他 OpenSpec 命令

- `/opsx:explore` - 浏览现有变更
- `/opsx:apply` - 应用变更到代码库
- `/opsx:archive` - 归档已完成的变更

---

## 详细开发流程

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
