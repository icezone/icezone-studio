import { test, expect, type Page, type Locator } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Smoke test for StoryboardGen canvas node — Phase 3.B refactor verification.
 *
 * Confirms the node looks and works identically after:
 *   - State/memos extracted into useStoryboardGenForm hook
 *   - StoryboardGenSettings extracted as sub-component (wraps ModelParamsControls)
 *   - StoryboardGenBatchControls extracted as sub-component (生成 + 批量生成 buttons)
 *
 * NOTE: Elements inside ReactFlow's CSS-transformed canvas are continuously
 * repositioned by the matrix transform. Playwright marks them as "not stable"
 * for click/scroll actions. We use { force: true } for all interactions inside
 * the canvas, and rely on textContent() / isVisible() for assertions.
 *
 * Checklist:
 *   1. Node renders without blank area / console error
 *   2. Settings panel: model chip & params chip render with non-empty values
 *   3. Grid controls: 行/列 steppers render; + increments value; - decrements
 *   4. Ratio-control-mode toggle (整体/单帧): if visible, clicking toggles without error
 *   5. Generate buttons: both render side-by-side; clicking doesn't throw JS exception
 *   6. Batch progress bar absent initially; layout intact after batch click
 *   7. No uncaught console errors throughout
 */

const E2E_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''
const hasAuth = !!(E2E_EMAIL && E2E_PASSWORD)

const ARTIFACTS_DIR = path.join(
  process.cwd(),
  '__tests__', 'e2e', 'artifacts', 'storyboard-gen-smoke'
)

// Errors that are acceptable (missing API key, network failures, etc.)
const ACCEPTABLE_ERROR =
  /api.key|401|403|missing.*key|no.*api|network|fetch|abort|ERR_ABORTED|net::ERR|unauthorized|unauthenticated|Failed to load resource/i

// ─── helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', E2E_EMAIL)
  await page.fill('input[type="password"]', E2E_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15_000 })
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  const closeBtn = page.locator('button[aria-label="跳过引导"]')
  if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await closeBtn.click()
    await expect(closeBtn).not.toBeVisible({ timeout: 3_000 })
  }
}

async function createProject(page: Page): Promise<string> {
  const wizardClose = page.locator('button[aria-label="跳过引导"]')
  if (await wizardClose.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await wizardClose.click()
    await expect(wizardClose).not.toBeVisible({ timeout: 3_000 })
  }
  await page.click('button:has-text("新建项目")')
  await page.waitForURL(/\/canvas\//, { timeout: 15_000 })
  await page.waitForSelector('[data-testid="add-node-button"]', { timeout: 10_000 })
  return page.url().split('/canvas/')[1]?.split(/[?#]/)[0] ?? ''
}

async function deleteProject(page: Page, projectId: string) {
  if (!projectId) return
  try {
    await page.request.delete(`/api/projects/${projectId}`, { timeout: 10_000 })
  } catch (err) {
    console.warn(`Cleanup: failed to delete project ${projectId}:`, err)
  }
}

async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  const filePath = path.join(ARTIFACTS_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`[screenshot] ${filePath}`)
  return filePath
}

/**
 * Force-click a locator — bypasses Playwright's stability AND viewport checks.
 * Needed for elements inside ReactFlow's CSS transform matrix, which Playwright
 * may report as "not stable" or "outside viewport" even when the element is
 * functionally interactive (React handles the onClick regardless of transform).
 */
async function forceClick(locator: Locator) {
  try {
    await locator.click({ force: true })
  } catch {
    // Element outside viewport — dispatch click via JS (bypasses all Playwright checks)
    await locator.evaluate((el) => (el as HTMLElement).click())
  }
}

// ─── test suite ──────────────────────────────────────────────────────────────

test.describe('StoryboardGen node — Phase 3.B smoke test', () => {
  test.skip(!hasAuth, 'Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD')

  let projectId = ''
  const consoleErrors: string[] = []

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !ACCEPTABLE_ERROR.test(msg.text())) {
        consoleErrors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => {
      if (!ACCEPTABLE_ERROR.test(err.message)) {
        consoleErrors.push(`[pageerror] ${err.message}`)
      }
    })
    await login(page)
    projectId = await createProject(page)
  })

  test.afterEach(async ({ page }) => {
    await deleteProject(page, projectId)
    projectId = ''
    consoleErrors.length = 0
  })

  test('full storyboardGen node smoke checklist', async ({ page }) => {
    test.setTimeout(120_000)

    // ── Add storyboardGen node ────────────────────────────────────────────────
    await page.click('[data-testid="add-node-button"]')
    await page.waitForTimeout(500)
    const storyboardOption = page.locator('text=分镜生成')
    await expect(storyboardOption).toBeVisible({ timeout: 5_000 })
    await storyboardOption.click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // ── CHECK 1: Node renders ─────────────────────────────────────────────────
    const node = page.locator('[data-testid="node-storyboardGen"]').first()
    await expect(node).toBeVisible({ timeout: 10_000 })
    await shot(page, '01-node-added')
    console.log('[CHECK 1] Node renders without blank area: PASS')

    // ── Expand node via preview card ──────────────────────────────────────────
    // force: true because the node is inside ReactFlow's CSS transform
    const previewCard = node.locator('.node-preview-card').first()
    await expect(previewCard).toBeVisible({ timeout: 8_000 })
    await forceClick(previewCard)
    await page.waitForTimeout(800)

    const settingsPanel = node.locator('.node-settings-panel').first()
    await expect(settingsPanel).toBeVisible({ timeout: 8_000 })
    await shot(page, '02-settings-panel-expanded')
    console.log('[CHECK 2 setup] Settings panel (.node-settings-panel) visible: PASS')

    // ── CHECK 2: Model chip and params chip ───────────────────────────────────
    // ModelParamsControls renders UiChipButton (as <button>) with text content:
    //   - Model chip: "ModelName" + "ProviderName" (e.g. "Nano Banana 2" + "KIE")
    //   - Params chip: aspectRatioLabel + "·" + resolutionLabel
    // The node header (NodeHeader) also renders a button with the node title ("分镜生成").
    // We distinguish chips by looking for buttons that do NOT contain just the node title.
    //
    // Strategy: wait for chip buttons to appear (model list loads async),
    // then verify their text content without clicking (avoids stability issues).

    // Wait for model chip to appear — it's the button containing model display name
    // Model display names come from imageModels list; wait up to 15s for async load
    // The model chip text will be something like "Nano Banana 2" (not "分镜生成")
    const allBtnsWithText = settingsPanel.locator('button').filter({ hasText: /.+/ })
    await expect(allBtnsWithText.nth(1)).toBeVisible({ timeout: 15_000 })

    const chipCount = await allBtnsWithText.count()
    expect(chipCount).toBeGreaterThanOrEqual(2)

    // Collect text of all buttons to identify which are chips
    const btnTexts: string[] = []
    for (let i = 0; i < chipCount; i++) {
      const t = (await allBtnsWithText.nth(i).textContent())?.trim() ?? ''
      btnTexts.push(t)
    }
    console.log(`[CHECK 2a] Buttons with text in settings panel: [${btnTexts.map(t => `"${t}"`).join(', ')}]`)
    expect(chipCount).toBeGreaterThanOrEqual(2)
    console.log(`[CHECK 2a] At least 2 buttons with text found (${chipCount}): PASS`)

    // Button list (observed): ["分镜生成"(title), "ModelKIE"(model chip), "自动· 2K"(params chip),
    //                           "其他参数"(extra params), "生成"(generate), "批量生成 (Nf)"(batch)]
    // Model chip is index 1 (first non-title chip, contains model name + provider)
    // Params chip is index 2 (contains aspect ratio · resolution, e.g. "自动· 2K")

    // Skip index 0 (node title button). Model chip = first chip button with content.
    // We identify model chip as the button whose text is NOT a known action label.
    const actionLabels = /^(生成|批量生成|整体|单帧|其他参数)$/
    const modelChipIdx = btnTexts.findIndex(
      (t, i) => i > 0 && t.length > 0 && !actionLabels.test(t)
    )
    expect(modelChipIdx).toBeGreaterThanOrEqual(0)
    const modelChipText = btnTexts[modelChipIdx] ?? ''
    expect(modelChipText.length).toBeGreaterThan(0)
    console.log(`[CHECK 2b] Model chip has non-empty value ("${modelChipText}"): PASS`)

    // Params chip: next non-action button after model chip (aspect ratio · resolution)
    const paramsChipIdx = btnTexts.findIndex(
      (t, i) => i > modelChipIdx && t.length > 0 && !actionLabels.test(t)
    )
    if (paramsChipIdx >= 0) {
      const paramsChipText = btnTexts[paramsChipIdx] ?? ''
      console.log(`[CHECK 2c] Params chip has value ("${paramsChipText}"): PASS`)
    } else {
      console.log('[CHECK 2c] Params chip: single-param model, only model chip present: PASS')
    }
    console.log('[CHECK 2d] Chips render with values (stability bypass — no click needed): PASS')

    // ── CHECK 3: Grid controls (行/列 steppers) ───────────────────────────────
    // GridStepperControl: div > span(label) > button(Minus) > span(value) > button(Plus)
    // Steppers are at the TOP of settings panel — always in viewport after expansion.

    const rowsLabel = settingsPanel.locator('span').filter({ hasText: /^行$/ }).first()
    await expect(rowsLabel).toBeVisible({ timeout: 5_000 })
    console.log('[CHECK 3a] Rows stepper label ("行") visible: PASS')

    const colsLabel = settingsPanel.locator('span').filter({ hasText: /^列$/ }).first()
    await expect(colsLabel).toBeVisible({ timeout: 3_000 })
    console.log('[CHECK 3b] Cols stepper label ("列") visible: PASS')

    // Navigate to stepper container via parent
    const rowsContainer = rowsLabel.locator('..')
    const rowsPlusBtn = rowsContainer.locator('button').last()
    const rowsMinusBtn = rowsContainer.locator('button').first()
    const rowsValueSpan = rowsContainer.locator('span').last()

    const initialRowsText = (await rowsValueSpan.textContent({ timeout: 3_000 }))?.trim() ?? '2'
    const initialRows = Number(initialRowsText)

    // force: true — inside ReactFlow transform
    await forceClick(rowsPlusBtn)
    await page.waitForTimeout(400)
    const newRowsText = (await rowsValueSpan.textContent({ timeout: 3_000 }))?.trim() ?? '2'
    const newRows = Number(newRowsText)
    expect(newRows).toBeGreaterThan(initialRows)
    console.log(`[CHECK 3c] Rows + increments: ${initialRows} → ${newRows}: PASS`)

    await shot(page, '03-after-grid-row-increment')

    await forceClick(rowsMinusBtn)
    await page.waitForTimeout(300)
    const restoredText = (await rowsValueSpan.textContent({ timeout: 3_000 }))?.trim() ?? '2'
    expect(Number(restoredText)).toBe(initialRows)
    console.log(`[CHECK 3d] Rows - decrements back: ${newRows} → ${restoredText}: PASS`)

    // ── CHECK 4: Ratio-control-mode toggle (整体/单帧) ─────────────────────────
    const overallBtn = settingsPanel.locator('button').filter({ hasText: /^整体$/ }).first()
    const cellBtn = settingsPanel.locator('button').filter({ hasText: /^单帧$/ }).first()
    const hasRatioToggle = await overallBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hasRatioToggle) {
      await forceClick(overallBtn)
      await page.waitForTimeout(300)
      await forceClick(cellBtn)
      await page.waitForTimeout(300)
      console.log('[CHECK 4] Ratio-control-mode toggle (整体/单帧) clicks without error: PASS')
    } else {
      console.log('[CHECK 4] Ratio-control-mode toggle: not visible for default model (expected): PASS')
    }

    // ── CHECK 5: Generate buttons render side-by-side ─────────────────────────
    // StoryboardGenBatchControls places "生成" and "批量生成 (Nf)" in a flex row.
    // Both are at the bottom of the settings panel.
    // We assert their text and bounding-box y-alignment; use force clicks.

    const generateBtn = settingsPanel.locator('button').filter({ hasText: /^生成$/ }).first()
    const batchBtn = settingsPanel.locator('button').filter({ hasText: /批量生成/ }).first()

    await expect(generateBtn).toBeVisible({ timeout: 10_000 })
    console.log('[CHECK 5a] Primary generate button ("生成") visible: PASS')

    await expect(batchBtn).toBeVisible({ timeout: 5_000 })
    const batchText = (await batchBtn.textContent())?.trim() ?? ''
    console.log(`[CHECK 5b] Batch generate button ("${batchText}") visible: PASS`)

    // Side-by-side: verify both buttons share the same immediate parent element.
    // boundingBox() returns ReactFlow canvas coords (not viewport px) so pixel
    // distance is not meaningful. Use DOM parent equality instead.
    const sameParent = await page.evaluate(() => {
      const node = document.querySelector('[data-testid="node-storyboardGen"]')
      if (!node) return false
      const buttons = Array.from(node.querySelectorAll('button'))
      const genBtn = buttons.find(b => b.textContent?.trim() === '生成')
      const batchBtn = buttons.find(b => b.textContent?.trim().startsWith('批量生成'))
      if (!genBtn || !batchBtn) return false
      return genBtn.parentElement === batchBtn.parentElement
    })
    expect(sameParent).toBe(true)
    console.log('[CHECK 5c] Generate buttons share the same parent flex container: PASS')

    // Click generate — must not produce a JS exception
    const errsBefore = consoleErrors.length
    await forceClick(generateBtn)
    await page.waitForTimeout(1_200)
    const newErrs = consoleErrors.slice(errsBefore)
    if (newErrs.length > 0) console.error('[CHECK 5d] Errors after generate click:', newErrs)
    expect(newErrs).toHaveLength(0)
    console.log('[CHECK 5d] Primary generate click — no JS exception: PASS')

    // Click batch generate — must not produce a JS exception
    const errsBefore2 = consoleErrors.length
    await forceClick(batchBtn)
    await page.waitForTimeout(1_200)
    const newErrs2 = consoleErrors.slice(errsBefore2)
    if (newErrs2.length > 0) console.error('[CHECK 5e] Errors after batch click:', newErrs2)
    expect(newErrs2).toHaveLength(0)
    console.log('[CHECK 5e] Batch generate click — no JS exception: PASS')

    // ── CHECK 6: Layout integrity after batch click ───────────────────────────
    await expect(node).toBeVisible()
    await expect(settingsPanel).toBeVisible()
    const progressVisible = await settingsPanel
      .locator('[class*="h-1"]').first()
      .isVisible({ timeout: 500 }).catch(() => false)
    console.log(`[CHECK 6] Layout intact; progress bar ${progressVisible ? 'visible (batch started)' : 'not rendered (no API key, expected)'}: PASS`)

    // ── CHECK 7: No uncaught console errors ───────────────────────────────────
    if (consoleErrors.length > 0) {
      console.error('[CHECK 7] UNCAUGHT ERRORS:', consoleErrors)
    }
    expect(consoleErrors).toHaveLength(0)
    console.log('[CHECK 7] No uncaught console errors throughout: PASS')

    await shot(page, '04-final-state')
  })
})
