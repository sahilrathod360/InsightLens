import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4182;
const DIST_DIR = path.resolve('frontend/dist');
const ARTIFACT_DIR = path.resolve('C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
  };
  return map[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(DIST_DIR, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, fallback) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback);
        }
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`🌐 Comprehensive Test Server running at http://localhost:${PORT}`);

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
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  // 1. Test 3D Background at 1920x1080 Desktop
  console.log('\n--- 1. Testing 1920x1080 Desktop Viewport ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const desktopCanvasInfo = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const container = document.getElementById('landing-bg-root');
    const rect = canvas?.getBoundingClientRect();
    const style = container ? window.getComputedStyle(container) : null;
    return {
      exists: !!canvas,
      containerPosition: style?.position,
      containerZIndex: style?.zIndex,
      containerDisplay: style?.display,
      width: canvas?.width,
      height: canvas?.height,
      rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null
    };
  });
  console.log('Desktop 1920x1080 Canvas State:', desktopCanvasInfo);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_3d_desktop_1920.png'), fullPage: false });

  // 2. Test 3D Background at 1366x768 Laptop
  console.log('\n--- 2. Testing 1366x768 Standard Laptop Viewport ---');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const laptopCanvasInfo = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      width: canvas?.width,
      height: canvas?.height,
      rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null
    };
  });
  console.log('Laptop 1366x768 Canvas State:', laptopCanvasInfo);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_3d_laptop_1366.png'), fullPage: false });

  // 3. Test 3D Background at 390x844 Mobile
  console.log('\n--- 3. Testing 390x844 Mobile Viewport ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_3d_mobile_390.png'), fullPage: false });

  // 4. Test Live Vision Object Detection with Real Scene Image
  console.log('\n--- 4. Testing Live Vision Detection & Bounding Boxes ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    window.navigateTo('livevision');
  });
  await new Promise(r => setTimeout(r, 1000));

  const liveVisionTest = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    // Draw realistic scene on canvas (laptop, phone, monitor, person shape)
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1280;
    testCanvas.height = 720;
    const ctx = testCanvas.getContext('2d');

    // Room background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 1280, 720);

    // Desk
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(100, 450, 1080, 220);

    // TV / Monitor
    ctx.fillStyle = '#111111';
    ctx.fillRect(350, 150, 580, 340);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(370, 170, 540, 300);
    ctx.fillStyle = '#000000';
    ctx.fillRect(600, 490, 80, 60);

    // Laptop
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(150, 420, 180, 120);

    // Feed canvas stream into video element
    const stream = testCanvas.captureStream(30);
    const video = document.getElementById('live-camera-feed');
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    // Wait for real-time detection ticks
    for (let attempt = 0; attempt < 35; attempt++) {
      await new Promise(r => setTimeout(r, 300));
      const layer = document.getElementById('live-bounding-box-layer');
      const countEl = document.getElementById('live-detected-count');
      const statusEl = document.getElementById('live-detector-status');
      const boxes = layer?.querySelectorAll('.live-detection-box') || [];

      if (boxes.length > 0) {
        const boxDetails = Array.from(boxes).map(b => ({
          text: b.innerText.trim().replace(/\s+/g, ' '),
          style: b.getAttribute('style')
        }));
        return {
          success: true,
          statusText: statusEl?.innerText,
          objectCountText: countEl?.innerText,
          boxCount: boxes.length,
          boxDetails
        };
      }
    }

    return {
      success: false,
      statusText: document.getElementById('live-detector-status')?.innerText,
      objectCountText: document.getElementById('live-detected-count')?.innerText
    };
  });

  console.log('Live Vision Test Result:', JSON.stringify(liveVisionTest, null, 2));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_live_vision_detected.png'), fullPage: false });

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
