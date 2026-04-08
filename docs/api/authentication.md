# 认证授权

本文档说明 IceZone Studio 的认证授权机制和 BYOK 功能。

## 认证方案

IceZone Studio 使用 Supabase Auth 作为认证基础设施。

### 支持的认证方式

#### 1. Email + 密码

**注册流程**:
1. 用户提供 Email 和密码
2. Supabase 发送验证邮件
3. 用户点击邮件中的链接完成验证
4. 账号激活

**登录流程**:
1. 用户输入 Email 和密码
2. Supabase 验证凭据
3. 返回 JWT token

#### 2. Google OAuth

**流程**:
1. 用户点击"使用 Google 登录"
2. 重定向到 Google 授权页面
3. 用户授权后重定向回应用
4. Supabase 创建/关联账号
5. 返回 JWT token

#### 3. WeChat OAuth

**流程**:
1. 用户点击"使用微信登录"
2. 重定向到微信授权页面
3. 用户扫码或授权
4. 微信回调应用
5. Supabase 创建/关联账号
6. 返回 JWT token

### Token 管理

**JWT Token**:
- 存储位置：浏览器 `localStorage`
- 有效期：1 小时
- 自动刷新：通过 Refresh Token

**Refresh Token**:
- 存储位置：浏览器 `localStorage`（HttpOnly cookie 暂不支持）
- 有效期：30 天
- 刷新机制：Supabase SDK 自动处理

### 客户端 vs 服务端

**客户端认证**（`src/lib/supabase/client.ts`）:
```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**服务端认证**（`src/lib/supabase/server.ts`）:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies }
)
```

**区别**:
- 客户端：使用 browser storage，适用于组件
- 服务端：使用 cookies，适用于 API Routes / Server Components

## 授权机制

### Row Level Security (RLS)

Supabase 使用 RLS 确保数据隔离。

**示例：projects 表**:
```sql
-- 用户只能查看自己的项目
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- 用户只能创建属于自己的项目
CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的项目
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

-- 用户只能删除自己的项目
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);
```

### API Routes 认证

所有需要认证的 API Routes 都检查 JWT：

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createServerClient()
  
  // 获取当前用户
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 继续处理...
}
```

## BYOK（Bring Your Own Key）

BYOK 允许用户使用自己的 API Key，避免消耗平台额度。

### 支持的 Provider

1. **kie** - KIE API Key
2. **ppio** - PPIO API Key
3. **grsai** - GRSAI API Key
4. **fal** - FAL API Key
5. **openai** - OpenAI API Key
6. **anthropic** - Anthropic API Key

### 加密存储

**加密算法**: AES-256-GCM

**存储位置**: Supabase `user_settings` 表

**加密流程**:
1. 用户输入 API Key
2. 前端发送到 `/api/settings/api-keys`
3. 后端使用 `crypto` 模块加密：
   ```typescript
   const algorithm = 'aes-256-gcm'
   const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
   const iv = crypto.randomBytes(16)
   
   const cipher = crypto.createCipheriv(algorithm, key, iv)
   let encrypted = cipher.update(apiKey, 'utf8', 'hex')
   encrypted += cipher.final('hex')
   const authTag = cipher.getAuthTag()
   ```
4. 存储 `{ encrypted, iv, authTag }` 到数据库

**解密流程**:
1. 从数据库读取 `{ encrypted, iv, authTag }`
2. 使用相同 key 解密：
   ```typescript
   const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'))
   decipher.setAuthTag(Buffer.from(authTag, 'hex'))
   let decrypted = decipher.update(encrypted, 'hex', 'utf8')
   decrypted += decipher.final('utf8')
   ```

### 使用优先级

当调用 AI API 时，按以下优先级选择 API Key：

1. **用户自带 Key**（如果已配置）
2. **平台默认 Key**

**实现**:
```typescript
async function getApiKey(userId: string, providerId: string): Promise<string> {
  // 1. 尝试获取用户配置的 Key
  const userKey = await getUserApiKey(userId, providerId)
  if (userKey) return userKey
  
  // 2. 使用平台默认 Key
  const platformKey = process.env[`${providerId.toUpperCase()}_API_KEY`]
  if (!platformKey) {
    throw new Error(`No API key available for provider: ${providerId}`)
  }
  return platformKey
}
```

### 安全注意事项

1. **环境变量**:
   - `ENCRYPTION_KEY` 必须是 64 位十六进制字符串（32 字节）
   - 生成方式：`openssl rand -hex 32`
   - 存储在 `.env.local`，不提交到 Git

2. **传输安全**:
   - API Key 传输时使用 HTTPS
   - 前端不存储明文 API Key

3. **作用域隔离**:
   - 每个用户的 API Key 独立存储
   - RLS 策略确保用户只能访问自己的 Key

4. **审计日志**:
   - API Key 的创建/更新/删除操作记录到审计日志
   - 包含时间戳和操作类型

## 会话管理

### 会话状态

```typescript
interface Session {
  access_token: string      // JWT token
  refresh_token: string     // Refresh token
  expires_at: number        // 过期时间（Unix 时间戳）
  user: {
    id: string
    email: string
    user_metadata: object
  }
}
```

### 自动刷新

Supabase SDK 自动处理 token 刷新：

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed')
  }
})
```

### 登出

```typescript
await supabase.auth.signOut()
```

这会：
- 清除本地存储的 token
- 失效服务端 session
- 重定向到登录页

---

相关文档：
- `endpoints.md` - API 端点参考
- `../product/models.md` - 支持 BYOK 的模型
- `error-handling.md` - 认证错误处理
