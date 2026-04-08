# 测试规范

本文档说明 IceZone Studio 的测试框架、流程和标准。

## 测试框架

### 单元测试 / API 测试

**工具**: Vitest

**配置**: `vitest.config.ts`

**运行**:
```bash
npx vitest run          # 运行一次
npx vitest              # watch 模式
```

### E2E 测试

**工具**: Playwright

**配置**: `playwright.config.ts`

**运行**:
```bash
npx playwright test                    # 运行所有测试
npx playwright test --ui               # UI 模式
npx playwright test --debug            # 调试模式
npx playwright test __tests__/e2e/xxx.spec.ts  # 运行特定文件
```

## TDD 工作流

每个任务遵循 TDD（Test-Driven Development）流程：

### 1. 先写失败的测试

描述期望行为：

```typescript
describe('ImageGenerationService', () => {
  it('应该生成图片并返回 URL', async () => {
    const params = {
      model: 'kie/nano-banana-2',
      prompt: 'a beautiful sunset'
    }
    
    const result = await imageGenerationService.generate(params)
    
    expect(result.imageUrl).toMatch(/^https?:\/\//)
  })
})
```

### 2. 实现最少代码使测试通过

```typescript
export async function generate(params: GenerateParams) {
  const response = await fetch('/api/ai/image/generate', {
    method: 'POST',
    body: JSON.stringify(params)
  })
  
  return await response.json()
}
```

### 3. 重构，保持测试绿色

优化代码结构、命名、抽象，但确保测试仍然通过。

### 4. 提交前运行完整测试套件

```bash
npx vitest run
```

## 测试分类

| 类别 | 工具 | 位置 | 运行时机 |
|------|------|------|---------|
| 单元 | Vitest | `__tests__/unit/` 或同位 `*.test.ts` | 每次提交 |
| API | Vitest | `__tests__/api/` | 每次提交 |
| E2E | Playwright | `__tests__/e2e/` | 合并前 |

## 测试命名

### 单元测试

```typescript
describe('模块名', () => {
  it('应该做什么', () => {
    // 测试代码
  })
})
```

**示例**:
```typescript
describe('cropImage', () => {
  it('应该裁剪图片并返回新 URL', async () => {
    const result = await cropImage({
      imageUrl: 'https://example.com/image.png',
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    
    expect(result.imageUrl).toBeDefined()
  })
  
  it('应该在坐标越界时抛出错误', async () => {
    await expect(cropImage({
      imageUrl: 'https://example.com/image.png',
      x: -10,  // 越界
      y: 0,
      width: 100,
      height: 100
    })).rejects.toThrow('Crop bounds out of range')
  })
})
```

### E2E 测试

```typescript
test.describe('用户流程', () => {
  test('步骤描述', async ({ page }) => {
    // 测试代码
  })
})
```

**示例**:
```typescript
test.describe('图片生成流程', () => {
  test('应该能够创建节点并生成图片', async ({ page }) => {
    await page.goto('/canvas/new')
    
    // 创建图片编辑节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('[data-testid="image-node"]')
    
    // 输入提示词
    await page.fill('[data-testid="prompt-input"]', 'a beautiful sunset')
    
    // 点击生成
    await page.click('[data-testid="generate-button"]')
    
    // 等待生成完成
    await page.waitForSelector('[data-testid="export-image-node"]', {
      timeout: 30000
    })
    
    // 验证图片已显示
    const image = await page.locator('[data-testid="export-image"] img')
    expect(await image.getAttribute('src')).toMatch(/^https?:\/\//)
  })
})
```

## 单元测试最佳实践

### 隔离外部依赖

使用 mock：

```typescript
import { vi } from 'vitest'

describe('generateImage', () => {
  it('应该调用 API 并返回结果', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://example.com/result.png' })
    })
    
    const result = await generateImage(params)
    
    expect(global.fetch).toHaveBeenCalledWith('/api/ai/image/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    })
    expect(result.imageUrl).toBe('https://example.com/result.png')
  })
})
```

### 测试边界条件

```typescript
describe('validateCropBounds', () => {
  it('应该接受有效的裁剪范围', () => {
    expect(() => validateCropBounds(0, 0, 100, 100, 200, 200)).not.toThrow()
  })
  
  it('应该拒绝负坐标', () => {
    expect(() => validateCropBounds(-10, 0, 100, 100, 200, 200))
      .toThrow('Crop bounds out of range')
  })
  
  it('应该拒绝越界宽度', () => {
    expect(() => validateCropBounds(0, 0, 300, 100, 200, 200))
      .toThrow('Crop bounds out of range')
  })
})
```

### 使用测试数据工厂

```typescript
// testUtils.ts
export function createMockNode(overrides?: Partial<CanvasNode>): CanvasNode {
  return {
    id: 'node-1',
    type: 'imageNode',
    position: { x: 0, y: 0 },
    data: {
      prompt: 'test prompt',
      model: 'kie/nano-banana-2'
    },
    ...overrides
  }
}

// 测试中使用
const node = createMockNode({ id: 'custom-id' })
```

## API 测试最佳实践

### 测试 API 端点

```typescript
describe('POST /api/ai/image/generate', () => {
  it('应该返回图片 URL', async () => {
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        model: 'kie/nano-banana-2',
        prompt: 'a beautiful sunset'
      })
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.imageUrl).toMatch(/^https?:\/\//)
  })
  
  it('应该在缺少参数时返回 400', async () => {
    const response = await fetch('/api/ai/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        model: 'kie/nano-banana-2'
        // 缺少 prompt
      })
    })
    
    expect(response.status).toBe(400)
  })
})
```

## E2E 测试最佳实践

### 认证门控

E2E 测试需要真实 Supabase 认证：

```typescript
const hasAuth = process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD

test.skip(!hasAuth, 'requires authentication', async ({ page }) => {
  // 测试需要认证的功能...
})
```

**CI 配置**（GitHub Secrets）:
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

### 使用 test fixtures

```typescript
// fixtures.ts
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // 登录
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.E2E_TEST_EMAIL!)
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!)
    await page.click('[type="submit"]')
    await page.waitForURL('/projects')
    
    await use(page)
  }
})

// 测试中使用
test('应该创建项目', async ({ authenticatedPage }) => {
  await authenticatedPage.click('[data-testid="new-project"]')
  // ...
})
```

### 避免脆弱的选择器

```tsx
✅ 使用 data-testid
<button data-testid="generate-button">生成</button>
await page.click('[data-testid="generate-button"]')

❌ 避免依赖 CSS 类或文本
await page.click('.btn-primary')  // CSS 类可能变化
await page.click('text=生成')      // 文本可能翻译
```

### 处理异步操作

```typescript
// 等待元素出现
await page.waitForSelector('[data-testid="result"]')

// 等待网络请求
await page.waitForResponse(response => 
  response.url().includes('/api/ai/image/generate') && response.status() === 200
)

// 轮询状态
await page.waitForFunction(() => {
  const status = document.querySelector('[data-testid="status"]')?.textContent
  return status === 'completed'
}, { timeout: 30000 })
```

## 测试覆盖率

### 目标

- **单元测试**：核心业务逻辑覆盖率 > 80%
- **API 测试**：所有端点至少 1 个成功案例 + 1 个失败案例
- **E2E 测试**：主要用户流程全覆盖

### 生成覆盖率报告

```bash
npx vitest run --coverage
```

## CI/CD 集成

### GitHub Actions

```yaml
- name: Run unit tests
  run: npx vitest run

- name: Run E2E tests
  run: npx playwright test
  env:
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

## 测试数据清理

### E2E 测试后清理

```typescript
test.afterEach(async ({ page }) => {
  // 清理测试数据
  await page.evaluate(async () => {
    const projects = await fetch('/api/projects?test=true')
    const data = await projects.json()
    for (const project of data.projects) {
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    }
  })
})
```

---

相关文档：
- `development-workflow.md` - 开发工作流（包含测试命令）
- `code-quality.md` - 代码质量标准
- `../api/error-handling.md` - 错误处理测试
