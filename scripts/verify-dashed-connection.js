/* eslint-disable */
/* Verify the dragging connection line is dashed (not solid). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM = 'C:/Users/Bruce/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const OUT_DIR = path.resolve(__dirname, '..', 'verify-screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
console.log('email loaded:', !!env.E2E_TEST_EMAIL, 'pw loaded:', !!env.E2E_TEST_PASSWORD);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM,
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto('http://localhost:3000/login', { timeout: 60000 });
  await page.fill('input[type="email"]', env.E2E_TEST_EMAIL);
  await page.fill('input[type="password"]', env.E2E_TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  console.log('logged in OK');

  // Dismiss onboarding wizard if present
  const closeBtn = page.locator('button[aria-label="跳过引导"]');
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Open existing canvas
  await page.goto('http://localhost:3000/canvas/d0d225a1-726a-4cf5-8f5a-db0e04cb9327', { timeout: 60000 });
  await page.waitForSelector('[data-testid="add-node-button"]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  // Find a node handle to drag from
  const handleInfo = await page.evaluate(() => {
    const h = document.querySelector('.node-preview-wrap .react-flow__handle-right');
    if (!h) return null;
    const r = h.getBoundingClientRect();
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
  });
  if (!handleInfo) throw new Error('no handle found');
  console.log('handle at', handleInfo);

  // Start drag: mouse down + move (no release — keep dragging state)
  await page.mouse.move(handleInfo.x, handleInfo.y);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.move(handleInfo.x + 200, handleInfo.y + 150, { steps: 10 });
  await page.waitForTimeout(400);

  // While in dragging state, inspect the connection path
  const inspect = await page.evaluate(() => {
    const p = document.querySelector('.react-flow__connection-path');
    if (!p) return { exists: false };
    const cs = window.getComputedStyle(p);
    return {
      exists: true,
      stroke: cs.stroke,
      strokeWidth: cs.strokeWidth,
      strokeDasharray: cs.strokeDasharray,
      strokeLinecap: cs.strokeLinecap,
      inlineStyle: p.getAttribute('style'),
    };
  });

  await page.screenshot({ path: path.join(OUT_DIR, 'dragging-state.png'), fullPage: false });
  // Release
  await page.mouse.up();

  console.log(JSON.stringify(inspect, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
