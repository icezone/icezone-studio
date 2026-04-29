import { test, expect } from '@playwright/test'

// These tests require a real Supabase connection.
// They are skipped unless E2E_TEST_EMAIL and E2E_TEST_PASSWORD are set.
const E2E_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe('Dashboard (authenticated)', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD')

  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/login')
    await page.locator('#email').fill(E2E_EMAIL!)
    await page.locator('#password').fill(E2E_PASSWORD!)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard')
    // Dismiss OnboardingWizard if shown (triggered when user has no API keys)
    const closeBtn = page.locator('button[aria-label="跳过引导"]')
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click()
      await expect(closeBtn).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('shows dashboard with project list', async ({ page }) => {
    // Wait for dashboard to load - check for "My Projects" heading
    await expect(page.getByRole('heading', { name: /my projects|我的项目/i })).toBeVisible({ timeout: 10_000 })
    // Wait for API fetch to complete: either project cards or empty-state message
    // .count() doesn't auto-wait, so use toBeVisible() on an .or() locator instead
    const projectCard = page.locator('[data-testid="project-card"]')
    const emptyMsg = page.getByText(/no projects|还没有项目/i)
    await expect(projectCard.or(emptyMsg).first()).toBeVisible({ timeout: 10_000 })
  })

  test('can create a new project and navigate to canvas', async ({ page }) => {
    await page.getByRole('button', { name: /new project|新建项目/i }).click()
    // Should navigate to canvas after creation
    await page.waitForURL('**/canvas/**', { timeout: 10_000 })
    const url = page.url()
    expect(url).toContain('/canvas/')

    // Cleanup: delete the project created by this test
    const projectId = url.split('/canvas/')[1]?.split(/[?#]/)[0]
    if (projectId) {
      try {
        await page.request.delete(`/api/projects/${projectId}`, {
          timeout: 10_000 // 10s timeout for cleanup
        })
      } catch (error) {
        console.warn(`Failed to delete project ${projectId}:`, error)
      }
    }
  })

  test('sidebar has navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /my projects|我的项目/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings|设置/i })).toBeVisible()
  })

  test('can navigate to settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings|设置/i }).click()
    await page.waitForURL('**/settings')
    await expect(page.getByRole('heading', { name: /settings|设置/i })).toBeVisible()
  })
})
