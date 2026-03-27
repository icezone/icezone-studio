import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('renders hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Storyboard/i)
    // Hero heading should be visible
    const hero = page.locator('h1').first()
    await expect(hero).toBeVisible()
  })

  test('has navigation links', async ({ page }) => {
    await page.goto('/')
    // Login link should exist
    const loginLink = page.getByRole('link', { name: /login|sign in|登录/i }).first()
    await expect(loginLink).toBeVisible()
  })

  test('navigates to login page', async ({ page }) => {
    await page.goto('/')
    const loginLink = page.getByRole('link', { name: /login|sign in|登录/i }).first()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page redirects when already unauthenticated route visited', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('settings route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })
})
