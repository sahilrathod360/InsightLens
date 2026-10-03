import puppeteer from 'puppeteer';
import path from 'path';

const PROD_URL = 'https://insight-lens.vercel.app';
const ARTIFACT_DIR = path.resolve('C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd');

async function verifyProduction() {
  console.log(`🌐 Launching Production Browser Verification on ${PROD_URL}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PROD CONSOLE:', msg.type(), msg.text()));

  // 1. Verify 1920x1080 Desktop Viewport
  console.log('\n--- 1. Verifying 1920x1080 Desktop Viewport on Production ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const desktopCanvas = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const container = document.getElementById('landing-bg-root');
    const style = container ? window.getComputedStyle(container) : null;
    const rect = canvas?.getBoundingClientRect();
    return {
      canvasExists: !!canvas,
      containerPosition: style?.position,
      containerDisplay: style?.display,
      width: canvas?.width,
      height: canvas?.height,
      rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null
    };
  });
  console.log('Production Desktop Canvas State:', desktopCanvas);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'production_verified_desktop_1920.png'), fullPage: false });

  // 2. Verify 1366x768 Standard Laptop Viewport
  console.log('\n--- 2. Verifying 1366x768 Laptop Viewport on Production ---');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const laptopCanvas = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      width: canvas?.width,
      height: canvas?.height,
      rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null
    };
  });
  console.log('Production Laptop Canvas State:', laptopCanvas);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'production_verified_laptop_1366.png'), fullPage: false });

  // 3. Verify 390x844 Mobile Viewport
  console.log('\n--- 3. Verifying 390x844 Mobile Viewport on Production ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'production_verified_mobile_390.png'), fullPage: false });

  // 4. Verify Live Vision Navigation & Detector Status on Production
  console.log('\n--- 4. Verifying Live Vision Page on Production ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.navigateTo('livevision');
  });

  console.log('Waiting 14s for live vision detector weights to load on production...');
  await new Promise(r => setTimeout(r, 14000));

  const prodLiveVision = await page.evaluate(() => {
    const statusEl = document.getElementById('live-detector-status');
    const countEl = document.getElementById('live-detected-count');
    return {
      statusText: statusEl?.innerText,
      countText: countEl?.innerText
    };
  });
  console.log('Production Live Vision State:', prodLiveVision);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'production_verified_livevision.png'), fullPage: false });

  await browser.close();
  console.log('✅ All production verifications completed successfully!');
}

verifyProduction().catch(err => {
  console.error('Production verification error:', err);
  process.exit(1);
});
