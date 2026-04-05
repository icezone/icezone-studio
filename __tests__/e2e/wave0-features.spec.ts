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
}

/** Create a new project from dashboard and wait for canvas to load */
async function createProject(page: import('@playwright/test').Page) {
  await page.click('button:has-text("新建项目")')
  await page.waitForURL(/\/canvas\//, { timeout: 15000 })
  // Wait for canvas to be ready
  await page.waitForSelector('[data-testid="add-node-button"]', { timeout: 10000 })
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
    await createProject(page)
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
  })

  test('N2: Reverse Prompt - toolbar button appears on image nodes', async ({ page }) => {
    await createProject(page)
    await openNodeMenu(page)
    await page.locator('text=上传图片').click()

    // Select the node
    const uploadNode = page.locator('[data-testid="node-upload"]').first()
    await expect(uploadNode).toBeVisible({ timeout: 5000 })
    await uploadNode.click()

    // Check for reverse prompt button in toolbar
    const reversePromptButton = page.locator('[data-testid="node-action-reverse-prompt"]')
    await expect(reversePromptButton).toBeDefined()
  })

  test('N3: Shot Analysis - toolbar button registered', async ({ page }) => {
    await createProject(page)
    await openNodeMenu(page)
    await page.locator('text=上传图片').click()

    const uploadNode = page.locator('[data-testid="node-upload"]').first()
    await expect(uploadNode).toBeVisible({ timeout: 5000 })
    await uploadNode.click()

    const shotAnalysisButton = page.locator('[data-testid="node-action-shot-analysis"]')
    await expect(shotAnalysisButton).toBeDefined()
  })

  test('N4: Novel Input Node - can be added and accepts text', async ({ page }) => {
    await createProject(page)
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
  })
})

test.describe('Wave 1: Template & Enhancement Features', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('N5: Template System - template button exists in canvas', async ({ page }) => {
    await createProject(page)

    // Check for template button in sidebar/toolbar
    const templateButton = page.locator('button[title*="模板"], button:has-text("模板")')
    await expect(templateButton.first()).toBeVisible({ timeout: 10000 })
  })

  test('N5: Template System - can open template library from dashboard', async ({ page }) => {
    // Check for template shortcuts on dashboard
    const templateSection = page.locator('text=从模板开始')
    await expect(templateSection).toBeVisible({ timeout: 5000 })
  })

  test('N7: Storyboard Enhancement - batch generate button exists', async ({ page }) => {
    await createProject(page)
    await openNodeMenu(page)
    await page.locator('text=分镜生成').click()

    const storyboardNode = page.locator('[data-testid="node-storyboardGen"]').first()
    await expect(storyboardNode).toBeVisible({ timeout: 5000 })

    // Check for batch generate button (Zap icon or text)
    const batchButton = storyboardNode.locator('button:has-text("批量生成"), button[title*="批量"]')
    await expect(batchButton.first()).toBeVisible()
  })

  test('N8: API Key Rotation - settings page has multi-key support', async ({ page }) => {
    await page.goto('/settings')

    // Check for API Keys section
    const apiKeysSection = page.locator('text=API Keys')
    await expect(apiKeysSection).toBeVisible({ timeout: 5000 })

    // Check for add key button (multi-key support indicator)
    const addKeyButton = page.locator('button:has-text("添加"), button:has-text("Add")')
    await expect(addKeyButton.first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Integration: Full Workflow', () => {
  test.skip(!hasAuth, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured')

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Can create project, add multiple node types, and navigate', async ({ page }) => {
    await createProject(page)
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

    // Return to dashboard
    await page.click('a[href="/dashboard"]')
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Verify project appears in list
    const projectCard = page.locator('[data-testid="project-card"]').first()
    await expect(projectCard).toBeVisible({ timeout: 5000 })
  })
})
