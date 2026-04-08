# AI 模型清单

本文档列出 IceZone Studio 支持的所有 AI 模型和 Provider。

## 图片生成模型

共 7 个模型，分布在 4 个 Provider：

### KIE（默认）

- **nano-banana-2**: 标准版本，速度快
- **nano-banana-pro**: 高质量版本，细节更丰富

### FAL

- **nano-banana-2**: 标准版本
- **nano-banana-pro**: 高质量版本

### GRSAI

- **nano-banana-2**: 标准版本
- **nano-banana-pro**: 高质量版本

### PPIO

- **gemini-3.1-flash**: 基于 Gemini 的快速生成模型

## 视频生成模型

共 5 个模型，分布在 3 个 Provider：

### Kling（默认）

**模型**: `kling/kling-3.0`

**支持时长**:
- 3s
- 5s
- 10s
- 15s

**支持宽高比**:
- 16:9（横屏）
- 9:16（竖屏）
- 1:1（方形）

**特性**:
- 支持 Image-to-Video
- 支持音频生成
- 支持种子控制

**API 基础设施**: 基于 KIE API

---

### Sora2

**模型**:
- `sora2/sora2-pro` - 高质量版本
- `sora2/sora2-standard` - 标准版本

**支持时长**:
- 10s
- 15s

**时长映射**: duration → n_frames（内部转换）

**API 基础设施**: 基于 KIE API

---

### VEO

**模型**:
- `veo/veo3` - 标准质量
- `veo/veo3_fast` - 快速生成

**种子范围**: 10000-99999（自动 clamp）

**API 基础设施**: 基于 KIE API

## AI 分析功能

### N1: 视频分析

**功能**:
- 场景检测（Scene Detection）
- 关键帧提取（Key Frame Extraction）

**API 端点**: `/api/video/analyze`

**节点**: `videoAnalysisNode`

**技术**:
- 使用 ffmpeg 进行场景检测
- 基于相似度算法提取关键帧

---

### N2: 反向提示词

**功能**:
- 从图片生成描述性提示词
- 用于 AI 图片生成的参考

**API 端点**: `/api/ai/reverse-prompt`

**对话框**: `ReversePromptDialog`

**技术**:
- Gemini Vision API
- 多语言支持（中文/英文）

---

### N3: 镜头分析

**功能**:
- 专业影视镜头分析
- 输出景别、运镜、灯光、构图信息

**API 端点**: `/api/ai/shot-analysis`

**对话框**: `ShotAnalysisDialog`

**技术**:
- Gemini Vision API
- 结构化输出（JSON）

---

### N4: 小说拆分

**功能**:
- 文本场景拆分
- 角色提取

**API 端点**: `/api/ai/novel-analyze`

**节点**: `novelInputNode`

**技术**:
- Gemini Text API
- 基于章节/段落的智能分割

## BYOK（Bring Your Own Key）

支持用户自带 API Key，避免消耗平台额度。

### 支持的 Provider

1. **kie** - KIE API Key
2. **ppio** - PPIO API Key
3. **grsai** - GRSAI API Key
4. **fal** - FAL API Key
5. **openai** - OpenAI API Key
6. **anthropic** - Anthropic API Key

### 存储方式

- **加密算法**: AES-256-GCM
- **存储位置**: Supabase `user_settings` 表
- **作用域**: 每个用户独立存储

### 使用优先级

1. 用户自带 Key（如果已配置）
2. 平台默认 Key

## 模型扩展

### 自动发现机制

每个模型文件导出标准格式的定义对象：

```typescript
// 图片模型
export const imageModel: ImageModelDefinition = { ... };

// 视频模型
export const videoModel: VideoModelDefinition = { ... };
```

注册表自动扫描并加载所有符合格式的模型。

### Provider 共享基础设施

所有基于 KIE API 的 Provider 共享：
- 统一 API Key 管理
- 共享图片上传逻辑（支持 http://、data:、base64）
- 共享状态轮询逻辑

文件位置: `src/server/video/providers/kie-common.ts`

---

相关文档：
- `../extensions/add-model.md` - 新增模型指南
- `../extensions/add-provider.md` - 新增 Provider 指南
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - API 端点参考
