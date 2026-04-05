# reviewer - 任务计划

> 角色: 代码审查
> 状态: pending（等待各 dev 提请审查）
> 创建: 2026-03-25

## 职责

对各工作流 dev 完成的大功能/新模块进行代码审查。
收到审查请求后，读取相关代码，按 CRITICAL/HIGH/MEDIUM/LOW 分级输出问题。

**审批标准：**
- [OK] 通过：无 CRITICAL 或 HIGH
- [WARN] 警告：仅有 MEDIUM（可合并但需注意）
- [BLOCK] 阻断：有 CRITICAL 或 HIGH 问题

## 审查队列

（等待 dev 提请后填写）

## 重点检查项（此项目特定）

### 安全
- Supabase RLS 策略正确（用户数据隔离）
- API Key 不得在客户端暴露
- 图片上传路径不含路径穿越
- 支付 Webhook 签名校验

### 质量
- 服务端代码禁止直接使用 process.env 而不校验
- 图片处理 API 的文件大小限制落实
- 任务轮询不能无限重试

### 性能
- 画布拖拽期间不写盘（已在 CLAUDE.md 规定）
- imagePool 去重编码正确实现
- 防抖保存逻辑正确

### Doc-Code 一致性
- 新增 API 端点必须更新 docs/api-contracts.md
- 架构变更必须更新 docs/architecture.md
