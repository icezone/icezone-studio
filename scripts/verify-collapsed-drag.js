/* eslint-disable */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM = 'C:/Users/Bruce/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const envPath = path.resolve(__dirname, '..', '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:3000/login', { timeout: 60000 });
  await page.fill('input[type="email"]', env.E2E_TEST_EMAIL);
  await page.fill('input[type="password"]', env.E2E_TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  const dismiss = page.locator('button[aria-label="跳过引导"]');
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) await dismiss.click();

  await page.goto('http://localhost:3000/canvas/d0d225a1-726a-4cf5-8f5a-db0e04cb9327', { timeout: 60000 });
  await page.waitForSelector('[data-testid="add-node-button"]', { timeout: 30000 });
  // Wait for nodes to actually render
  await page.waitForSelector('.react-flow__node', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const debug = await page.evaluate(() => ({
    nodeCount: document.querySelectorAll('.react-flow__node').length,
    wrapCount: document.querySelectorAll('.node-preview-wrap').length,
  }));
  console.log('debug:', debug);

  // Find an ImageEdit node (or any split node with both preview + settings)
  const measureAll = async (label) => page.evaluate((lbl) => {
    const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
    return nodes.map((n) => {
      const r = n.getBoundingClientRect();
      const wrap = n.querySelector('.node-preview-wrap');
      const card = n.querySelector('.node-preview-card');
      const settings = n.querySelector('.node-settings-panel');
      const wr = wrap?.getBoundingClientRect();
      const cr = card?.getBoundingClientRect();
      return {
        label: lbl,
        type: (n.className.match(/react-flow__node-(\w+)/) || [])[1],
        nodeRect: { top: r.top, bottom: r.bottom, h: r.height },
        wrapRect: wr ? { top: wr.top, bottom: wr.bottom, h: wr.height } : null,
        cardRect: cr ? { top: cr.top, bottom: cr.bottom, h: cr.height } : null,
        hasSettings: !!settings,
        nodeInlineStyle: n.getAttribute('style'),
      };
    });
  }, label);

  // 1) Initial state (collapsed)
  const initial = await measureAll('initial');
  console.log('--- INITIAL (collapsed) ---');
  console.log(JSON.stringify(initial, null, 2));

  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
