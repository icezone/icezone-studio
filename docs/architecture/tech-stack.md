# 技术栈与依赖

## 产品信息

- **产品名称**: IceZone Studio — AI Creative Studio
- **仓库**: `https://github.com/icezone/icezone-studio`
- **产品目标**: 基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）、视频生成、AI 分析的 Web SaaS 产品

## 前端技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **类型系统**: TypeScript
- **状态管理**: Zustand 5
- **画布引擎**: @xyflow/react 12
- **样式方案**: TailwindCSS 4

## 后端技术栈

- **基础设施**: Supabase
  - 认证 (Auth)
  - 数据库 (Postgres)
  - 存储 (Storage)
  - 实时通信 (Realtime)
- **API 层**: Next.js API Routes
- **图片处理**: sharp

## 支付集成

- PayPal
- Alipay
- WeChat Pay

支持全球 + 中国市场。

## 认证方案

Supabase Auth 支持：
- Email + 密码
- Google OAuth
- WeChat OAuth

## 测试框架

- **单元测试**: Vitest
- **API 测试**: Vitest
- **E2E 测试**: Playwright

## 多媒体支持

- **图片生成/编辑**: 同步 + 异步模式
- **视频生成**: 异步轮询 + Realtime 推送
- **AI 视觉分析**: Gemini Vision API

## 关键原则

1. **解耦**: 模块间依赖接口而非实现
2. **可扩展**: 支持新节点/模型/Provider 热插拔
3. **可回归验证**: TDD 流程，完整测试覆盖
4. **自动持久化**: Supabase + IndexedDB 双写
5. **交互性能优先**: 防抖、idle 调度、客户端渲染

## 项目定位

基于桌面版（Storyboard-Copilot）升级的 Web SaaS 产品：
- 沿用画布域逻辑
- 沿用模型定义
- 沿用工具体系
- 沿用 UI 组件
- 重构基础设施层适配 Web 架构

## 依赖安装权限

- 允许使用 `npm install` 安装开发过程中需要的任何工具、库和依赖
- 安装新依赖后应更新 `package.json`，确保 `package-lock.json` 同步
- 优先选择社区主流、维护活跃的包
- 避免引入过大或过冷门的依赖

---

相关文档：
- `layering.md` - 分层架构说明
- `codebase-guide.md` - 代码库导航
- `../product/features-overview.md` - 产品功能概览
