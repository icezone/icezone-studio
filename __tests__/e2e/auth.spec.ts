import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading')).toBeVisible()
    await expect(page.getByPlaceholder(/email|you@example/i)).toBeVisible()
    await expect(page.getByPlaceholder(/password|••/i)).toBeVisible()
  })

  test('signup page renders form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading')).toBeVisible()
    await expect(page.getByPlaceholder(/email|you@example/i)).toBeVisible()
  })

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login')
    const signupLink = page.getByRole('link', { name: /sign up|signup|注册/i })
    await expect(signupLink).toBeVisible()
    await signupLink.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup')
    const loginLink = page.getByRole('link', { name: /log in|login|sign in|登录/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('not-an-email')
    await page.locator('#password').fill('password123')
    await page.locator('button[type="submit"]').click()
    // Native HTML5 validation or custom error should trigger
    const emailInput = page.locator('#email')
    const validity = await emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid)
    expect(validity).toBe(false)
  })

  test('shows error for password too short on signup', async ({ page }) => {
    await page.goto('/signup')
    await page.locator('#email').fill('test@example.com')
    await page.locator('#password').fill('abc')
    await page.locator('#confirmPassword').fill('abc')
    await page.getByRole('button', { name: /sign up|create|注册/i }).click()
    const errorText = page.getByText(/6 char|too short|至少/i)
    await expect(errorText).toBeVisible({ timeout: 3000 })
  })
})
