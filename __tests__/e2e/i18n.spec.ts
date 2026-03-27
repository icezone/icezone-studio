import { test, expect } from '@playwright/test'

test.describe('i18n', () => {
  test('login page has no raw i18n key leaks', async ({ page }) => {
    await page.goto('/login')
    const content = await page.textContent('body')
    // Raw i18n keys look like "auth.login" or "common.save"
    expect(content).not.toMatch(/\b(common|auth|dashboard|nav|settings)\.\w+\b/)
  })

  test('signup page has no raw i18n key leaks', async ({ page }) => {
    await page.goto('/signup')
    const content = await page.textContent('body')
    expect(content).not.toMatch(/\b(common|auth|dashboard|nav|settings)\.\w+\b/)
  })

  test('landing page has no raw i18n key leaks', async ({ page }) => {
    await page.goto('/')
    const content = await page.textContent('body')
    expect(content).not.toMatch(/\b(common|auth|dashboard|nav|settings)\.\w+\b/)
  })
})
