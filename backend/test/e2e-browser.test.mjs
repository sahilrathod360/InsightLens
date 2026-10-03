import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const TARGET_URL = process.env.TEST_URL || 'https://insight-lens.vercel.app';

console.log('--- Running Canonical E2E Browser Test Suite ---');
console.log(`Target: ${TARGET_URL}`);

let browser;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('✓ Target page successfully loaded in headless Chrome');

  // 1. Landing 3D Canvas
  const canvasExists = await page.evaluate(() => {
    const canvas = document.getElementById('landing-bg') || document.querySelector('canvas');
    return canvas !== null;
  });
  assert.equal(canvasExists, true, 'Landing page canvas element must exist');
  console.log('✓ 3D Spatial Landing Canvas element verified');

  // 2. Mobile Viewport Responsiveness
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  const isMobileResponsive = await page.evaluate(() => {
    return document.body.scrollWidth <= window.innerWidth + 10;
  });
  assert.equal(isMobileResponsive, true, 'Mobile viewport must not horizontally overflow');
  console.log('✓ Mobile viewport (390x844) responsiveness verified');

  console.log('======================================================');
  console.log('✓ Canonical E2E Browser Test Suite Passed!');
  console.log('======================================================');
} catch (err) {
  console.error('Browser E2E test failure:', err.message);
  throw err;
} finally {
  if (browser) await browser.close();
}
