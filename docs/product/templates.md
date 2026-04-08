# 模板系统

本文档说明 IceZone Studio 的模板系统。

## 模板概览

模板是预配置的画布状态，包含：
- 节点配置（类型、位置、数据）
- 连线关系
- 布局结构

用户可以：
- 使用官方模板快速开始
- 保存自定义模板
- 分享模板给其他用户

## 官方模板

IceZone Studio 提供 3 个官方模板：

### 1. 小说转分镜

**用途**: 将小说/剧本转换为分镜序列

**节点组成**:
- `novelInputNode` - 输入小说文本
- 多个 `storyboardGenNode` - 为每个场景生成分镜

**适用场景**:
- 剧本可视化
- 漫画创作
- 动画预制

---

### 2. 视频拆解重制

**用途**: 分析视频并重新制作类似风格的内容

**节点组成**:
- `videoAnalysisNode` - 分析视频场景
- 多个 `imageNode` - 为关键帧生成新图片
- `videoGenNode` - 合成新视频

**适用场景**:
- 视频风格迁移
- 内容重制
- 参考学习

---

### 3. 批量图片生成

**用途**: 批量生成同系列图片

**节点组成**:
- 多个 `imageNode` - 使用相似提示词生成
- 批量导出节点

**适用场景**:
- 系列插画创作
- 产品图批量生成
- A/B 测试

## 用户自定义模板

### 保存模板

1. 在画布中完成布局和配置
2. 点击顶部工具栏的"保存为模板"
3. 填写模板信息：
   - 名称
   - 描述
   - 缩略图（自动生成）
4. 选择可见性：
   - 私有（仅自己可见）
   - 公开（所有用户可见）

### 加载模板

1. 点击"模板库"按钮
2. 浏览官方模板或我的模板
3. 点击"使用此模板"
4. 模板内容加载到当前画布

### 发布模板

私有模板可以发布为公开模板：

1. 在"我的模板"列表中选择模板
2. 点击"发布"按钮
3. 系统审核通过后，模板出现在"官方模板"区

### 分享模板

通过模板 ID 分享模板：

```
https://icezone.studio/templates/{template-id}
```

其他用户访问链接后可以：
- 预览模板
- 使用模板创建新项目

## 模板序列化

### 画布 → 模板

**序列化内容**:
```typescript
interface TemplateData {
  nodes: CanvasNode[];      // 节点配置
  edges: CanvasEdge[];      // 连线关系
  viewport: {               // 视口状态
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {               // 元数据
    name: string;
    description: string;
    thumbnail: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**图片去重**:
- 使用 `imagePool + __img_ref__` 编码
- 相同图片只存储一次
- 减少模板文件大小

**敏感数据清理**:
- 移除 API Key
- 移除用户 ID
- 移除项目 ID

### 模板 → 画布

**反序列化流程**:

1. 加载模板数据
2. 重新生成节点 ID（避免冲突）
3. 重新生成边 ID
4. 解码图片引用
5. 应用到画布

**位置调整**:
- 模板默认居中显示
- 用户可以拖拽调整

## 模板存储

### 数据库表结构

**templates 表**:
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API 端点

- `GET /api/templates` - 列出模板
- `GET /api/templates/{id}` - 获取模板详情
- `POST /api/templates` - 创建模板
- `PUT /api/templates/{id}` - 更新模板
- `DELETE /api/templates/{id}` - 删除模板
- `POST /api/templates/{id}/publish` - 发布模板
- `POST /api/templates/{id}/use` - 使用模板

## 模板最佳实践

### 创建模板时

1. **清理无关节点**：移除调试、测试节点
2. **重置敏感数据**：清空 API Key、个人信息
3. **添加说明节点**：使用 `textAnnotationNode` 添加使用说明
4. **合理命名**：节点使用描述性名称（而非"节点 1"、"节点 2"）
5. **测试可用性**：保存后重新加载，确保正常工作

### 使用模板时

1. **先预览再使用**：了解模板结构和用途
2. **逐步定制**：基于模板调整，而非全部重写
3. **保存为新模板**：定制后的版本可以另存为新模板

---

相关文档：
- `nodes.md` - 节点类型清单
- `../api/endpoints.md` - 模板 API 参考
- `../architecture/codebase-guide.md` - 模板代码位置
