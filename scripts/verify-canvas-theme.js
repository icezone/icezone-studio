/* eslint-disable */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM = 'C:/Users/Bruce/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'verify-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

const TOKENS = [
  '--canvas-node-bg',
  '--canvas-node-header-bg',
  '--canvas-node-section-bg',
  '--canvas-node-fg',
  '--canvas-node-fg-muted',
  '--canvas-badge-bg',
  '--canvas-menu-bg',
  '--canvas-overlay-bg',
  '--canvas-node-selected-border',
  '--canvas-node-hover-border',
  '--ui-primary',
  '--ui-primary-fg',
  '--accent-rgb',
];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Go to landing page (no auth required) — globals.css is loaded
  await page.goto('http://localhost:3000/', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const readTokens = async () => {
    return await page.evaluate((tokens) => {
      const cs = window.getComputedStyle(document.documentElement);
      const out = {};
      for (const t of tokens) out[t] = cs.getPropertyValue(t).trim();
      return out;
    }, TOKENS);
  };

  // Light first (default)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(300);
  const lightTokens = await readTokens();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'theme-light.png') });

  // Dark
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  const darkTokens = await readTokens();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'theme-dark.png') });

  // Sanity: check a primary button computed bg/color matches ui-primary / ui-primary-fg
  const btnCheck = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const out = [];
    for (const b of btns.slice(0, 30)) {
      const cs = window.getComputedStyle(b);
      const text = b.textContent?.trim().slice(0, 40);
      if (!text) continue;
      out.push({ text, bg: cs.backgroundColor, color: cs.color, classes: b.className.slice(0, 80) });
    }
    return out;
  });

  console.log(JSON.stringify({
    lightTokens,
    darkTokens,
    primaryButtonCheckInDarkMode: btnCheck.slice(0, 10),
  }, null, 2));

  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
