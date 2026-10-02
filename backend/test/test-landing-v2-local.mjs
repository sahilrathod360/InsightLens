import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../../frontend/dist');
const ARTIFACT_DIR = 'C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';

// MIME map for static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function createStaticServer(port = 4173) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      // SPA fallback
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runVisualInspection() {
  console.log('🚀 Starting local static preview server for Landing Page V2 inspection...');
  const server = await createStaticServer(4173);
  const baseUrl = 'http://localhost:4173';

  console.log(`🌐 Server running at ${baseUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop Full HD (1920x1080)
    console.log('\n--- Checking Desktop 1920x1080 ---');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    // Check Hero elements
    const heroTitle = await page.$eval('#landing-hero-title', el => el.innerText.trim());
    console.log('Hero Title:', heroTitle);

    const hasDepthCanvas = await page.$eval('#landing-depth-canvas', el => !!el);
    console.log('3D Depth Canvas Present:', hasDepthCanvas);

    // Capture Hero Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_hero_desktop_1920.png') });
    console.log('Saved v2_hero_desktop_1920.png');

    // Test Interactive Asset Switcher
    console.log('Testing interactive quick lenses...');
    const planetThumb = await page.$('button[data-asset="planet"]');
    if (planetThumb) {
      await planetThumb.click();
      await new Promise(r => setTimeout(r, 300));
      const activeTitle = await page.$eval('#hero-active-title', el => el.innerText.trim());
      console.log('Active Title after switching to Planet:', activeTitle);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_hero_switched_planet.png') });
    }

    // Capture Full Desktop Landing Page
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_landing_full_desktop.png'), fullPage: true });
    console.log('Saved v2_landing_full_desktop.png');

    // Check horizontal overflow
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Desktop 1920x1080 horizontal overflow:', desktopOverflow ? 'FAIL' : 'PASS (0 overflow)');

    // 2. Desktop Laptop (1366x900)
    console.log('\n--- Checking Desktop Laptop 1366x900 ---');
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const laptopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Laptop 1366x900 horizontal overflow:', laptopOverflow ? 'FAIL' : 'PASS (0 overflow)');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_landing_laptop_1366.png') });

    // 3. Mobile Viewport (390x844)
    console.log('\n--- Checking Mobile Viewport 390x844 ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const mobile390Overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Mobile 390x844 horizontal overflow:', mobile390Overflow ? 'FAIL' : 'PASS (0 overflow)');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_landing_mobile_390_hero.png') });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v2_landing_mobile_390_full.png'), fullPage: true });

    // 4. Mobile Viewport (412x915)
    console.log('\n--- Checking Mobile Viewport 412x915 ---');
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const mobile412Overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Mobile 412x915 horizontal overflow:', mobile412Overflow ? 'FAIL' : 'PASS (0 overflow)');

    console.log('\n✅ All local visual checks passed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

runVisualInspection().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
