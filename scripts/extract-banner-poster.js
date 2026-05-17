/* One-off: extract first frame of public/banner.mp4 → public/banner-poster.jpg */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CHROMIUM = 'C:/Users/Bruce/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const VIDEO = path.resolve(__dirname, '..', 'public', 'banner.mp4');
const OUT = path.resolve(__dirname, '..', 'public', 'banner-poster.jpg');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  const videoBuf = fs.readFileSync(VIDEO);

  await page.route('https://x.local/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/banner.mp4')) {
      route.fulfill({ status: 200, contentType: 'video/mp4', body: videoBuf });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><video id="v" src="/banner.mp4" muted playsinline preload="auto" autoplay></video>',
      });
    }
  });

  await page.goto('https://x.local/', { timeout: 30000 });
  await page.waitForFunction(() => {
    const v = document.getElementById('v');
    return v && v.readyState >= 2 && v.videoWidth > 0;
  }, null, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    const v = document.getElementById('v');
    v.currentTime = 0;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return { w: v.videoWidth, h: v.videoHeight, dataUrl: c.toDataURL('image/jpeg', 0.85) };
  });

  const buf = Buffer.from(result.dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(OUT, buf);
  console.log(JSON.stringify({ saved: OUT, w: result.w, h: result.h, sizeKB: (buf.length / 1024).toFixed(1) }));

  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
