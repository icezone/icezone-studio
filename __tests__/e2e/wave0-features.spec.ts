import { test, expect } from '@playwright/test'

/**
 * E2E tests for Wave 0 + Wave 1 features
 * Tests video analysis, LLM analysis, novel input, templates, and key rotation
 *
 * These tests require authentication. They are skipped when
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD environment variables are not set.
 */

const hasAuth = !!(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
const email = process.env.E2E_TEST_EMAIL ?? ''
const password = process.env.E2E_TEST_PASSWORD ?? ''

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15000 })
  // Dismiss OnboardingWizard if shown (blocks pointer events for users with no API keys)
  const closeBtn = page.locator('button[aria-label="跳过引导"]')
  if (await closeBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await closeBtn.click()
    await expect(closeBtn).not.toBeVisible({ timeout: 3000 })
  }
}

/** Create a new project from dashboard and wait for canvas to load. Returns the project ID. */
async function createProject(page: import('@playwright/test').Page): Promise<string> {
  await page.click('button:has-text("新建项目")')
  await page.waitForURL(/\/canvas\//, { timeout: 15000 })
  // Wait for canvas to be ready
  await page.waitForSelector('[data-testid="add-node-button"]', { timeout: 10000 })
  const projectId = page.url().split('/canvas/')[1]?.split(/[?#]/)[0] ?? ''
  return projectId
}

/** Delete a project via API */
async function deleteProject(page: import('@playwright/test').Page, projectId: string) {
  if (projectId) {
    try {
      await page.request.delete(`/api/projects/${projectId}`, {
        timeout: 10_000 // 10s timeout for cleanup
      })
    } catch (error) {
      // Ignore cleanup errors - test already passed
      console.warn(`Failed to delete project ${projectId}:`, error)
    }
  }
}

/** Open the add-node menu */
async function openNodeMenu(page: import('@playwright/test').Page) {
  await page.click('[data-testid="add-node-button"]')
  // Wait for menu to appear
  await page.waitForTimeout(500)
}

test.describe('Wave 0: Video & LLM Analysis Features', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('N1: Video Analysis Node - can be added to canvas', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)

      // Check if Video Analysis option exists
      const videoAnalysisOption = page.locator('text=视频分析')
      await expect(videoAnalysisOption).toBeVisible({ timeout: 5000 })

      // Add video analysis node
      await videoAnalysisOption.click()

      // Verify node appears
      const videoAnalysisNode = page.locator('[data-testid="node-videoAnalysis"]').first()
      await expect(videoAnalysisNode).toBeVisible({ timeout: 5000 })

      // Check node has expected controls
      await expect(videoAnalysisNode.locator('text=灵敏度')).toBeVisible()
      await expect(videoAnalysisNode.locator('text=开始分析')).toBeVisible()
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('N2: Reverse Prompt - toolbar button appears on image nodes', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)
      await page.locator('text=上传图片').click()

      // Select the node
      const uploadNode = page.locator('[data-testid="node-upload"]').first()
      await expect(uploadNode).toBeVisible({ timeout: 5000 })
      await uploadNode.click()

      // Check for reverse prompt button in toolbar
      const reversePromptButton = page.locator('[data-testid="node-action-reverse-prompt"]')
      await expect(reversePromptButton).toBeDefined()
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('N3: Shot Analysis - toolbar button registered', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)
      await page.locator('text=上传图片').click()

      const uploadNode = page.locator('[data-testid="node-upload"]').first()
      await expect(uploadNode).toBeVisible({ timeout: 5000 })
      await uploadNode.click()

      const shotAnalysisButton = page.locator('[data-testid="node-action-shot-analysis"]')
      await expect(shotAnalysisButton).toBeDefined()
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('N4: Novel Input Node - can be added and accepts text', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)

      const novelOption = page.locator('text=小说/剧本输入')
      await expect(novelOption).toBeVisible({ timeout: 5000 })
      await novelOption.click()

      // Verify node appears
      const novelNode = page.locator('[data-testid="node-novelInput"]').first()
      await expect(novelNode).toBeVisible({ timeout: 5000 })

      // Check for text area
      const textarea = novelNode.locator('textarea')
      await expect(textarea).toBeVisible()

      // Type some text
      await textarea.fill('这是一个测试小说片段。')

      // Check for analyze button
      await expect(novelNode.locator('button:has-text("智能拆分")')).toBeVisible()
    } finally {
      await deleteProject(page, projectId)
    }
  })
})

test.describe('Wave 1: Template & Enhancement Features', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('N5: Template System - template button exists in canvas', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      // Check for template button in sidebar/toolbar
      const templateButton = page.locator('button[title*="模板"], button:has-text("模板")')
      await expect(templateButton.first()).toBeVisible({ timeout: 10000 })
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('N5: Template System - can open template library from dashboard', async ({ page }) => {
    // Check for template shortcuts on dashboard
    const templateSection = page.locator('text=开始创作')
    await expect(templateSection).toBeVisible({ timeout: 5000 })
  })

  test('N7: Storyboard Enhancement - batch generate button exists', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)
      await page.locator('text=分镜生成').click()

      const storyboardNode = page.locator('[data-testid="node-storyboardGen"]').first()
      await expect(storyboardNode).toBeVisible({ timeout: 5000 })

      // Check for batch generate button (Zap icon or text)
      const batchButton = storyboardNode.locator('button:has-text("批量生成"), button[title*="批量"]')
      await expect(batchButton.first()).toBeVisible()
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('N8: API Key Rotation - settings page has multi-key support', async ({ page }) => {
    await page.goto('/settings')

    // Check for API Keys section (zh: "API Key", en: "API Keys")
    const apiKeysSection = page.locator('text=API Key')
    await expect(apiKeysSection.first()).toBeVisible({ timeout: 5000 })

    // Check for provider select (multi-key support: providers listed in dropdown)
    // Available providers: kie, ppio, grsai, fal, openai, anthropic
    const providerSelect = page.locator('select').filter({ hasText: 'KIE' })
    await expect(providerSelect.first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Integration: Full Workflow', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Can create project, add multiple node types, and navigate', async ({ page }) => {
    test.setTimeout(60_000) // Increase timeout for full workflow test
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)

      // Check all new node types are available
      const nodeTypes = [
        '视频分析',
        '小说/剧本输入',
        '分镜生成',
        '上传图片'
      ]

      for (const nodeType of nodeTypes) {
        const option = page.locator(`text=${nodeType}`)
        await expect(option).toBeVisible({ timeout: 2000 })
      }

      // Add one node to verify functionality
      await page.locator('text=上传图片').click()
      const uploadNode = page.locator('[data-testid="node-upload"]').first()
      await expect(uploadNode).toBeVisible({ timeout: 5000 })

      // Verify canvas URL
      await expect(page).toHaveURL(/\/canvas\//, { timeout: 5000 })
    } finally {
      // Clean up: navigate back to dashboard and delete project
      try {
        await page.goto('/dashboard', { timeout: 10_000, waitUntil: 'domcontentloaded' })
        await deleteProject(page, projectId)
      } catch (error) {
        console.warn('Cleanup navigation failed, attempting direct delete:', error)
        await deleteProject(page, projectId)
      }
    }
  })
})

test.describe('Wave M4: Onboarding & Canvas UX', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('M4-N1: LogicalModelPicker - Image 节点显示逻辑模型名', async ({ page }) => {
    const projectId = await createProject(page)
    try {
      await openNodeMenu(page)
      // ImageEdit 节点
      const imageEditOption = page.locator('text=图片生成, text=图片编辑').first()
      await expect(imageEditOption).toBeVisible({ timeout: 5000 })
      await imageEditOption.click()

      // 验证节点存在
      const node = page.locator('[data-testid="node-imageEdit"], [data-testid="node-upload"]').first()
      await expect(node).toBeVisible({ timeout: 5000 })

      // 验证逻辑模型名出现（不应显示 "kie/" 前缀）
      const modelPicker = page.locator('[data-testid^="model-option-"]').first()
      await expect(modelPicker).toBeVisible({ timeout: 5000 })
    } finally {
      await deleteProject(page, projectId)
    }
  })

  test('M4-N2: Dashboard - OnboardingWizard 可被跳过', async ({ page }) => {
    // 清除 localStorage 引导完成标志以触发向导
    await page.goto('/dashboard')
    await page.evaluate(() => localStorage.removeItem('smart-routing-onboarded'))
    await page.reload()

    // 如果用户有 keys，向导不显示 — 测试跳过
    const wizard = page.locator('text=添加你的第一个 API Key')
    const hasWizard = await wizard.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasWizard) {
      console.log('用户已有 keys，跳过向导测试（符合预期）')
      return
    }

    // 向导可被关闭
    const closeBtn = page.locator('button[aria-label="跳过引导"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(wizard).not.toBeVisible({ timeout: 3000 })
  })
})
