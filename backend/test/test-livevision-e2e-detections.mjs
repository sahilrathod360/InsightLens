import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4178;
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
  console.log(`🌐 Verification Server running at http://localhost:${PORT}`);

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
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`PAGE [${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  // -------------------------------------------------------------
  // TEST 1: 3D Background on Desktop 1920x1080 & Laptop 1366x768
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing 3D Background on Desktop 1920x1080 ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const desktopBgState = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const container = document.querySelector('.landing-bg-container');
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      canvasExists: !!canvas,
      containerExists: !!container,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      renderedWidth: rect?.width,
      renderedHeight: rect?.height,
      containerPosition: container ? window.getComputedStyle(container).position : null,
      containerZIndex: container ? window.getComputedStyle(container).zIndex : null
    };
  });
  console.log('Desktop 1920x1080 3D Background State:', desktopBgState);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_3d_desktop_1920.png'), fullPage: false });
  console.log('Saved live_3d_desktop_1920.png');

  console.log('\n--- 2. Testing 3D Background on Laptop 1366x768 ---');
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_3d_laptop_1366.png'), fullPage: false });
  console.log('Saved live_3d_laptop_1366.png');

  // -------------------------------------------------------------
  // TEST 3: Real Live Vision Multi-Object Detection in Browser
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Live Vision Detection Pipeline ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    window.navigateTo('livevision');
  });
  await new Promise(r => setTimeout(r, 1000));

  // Initialize camera and feed a realistic multi-object scene onto the video element
  const detectionResult = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    // Create a rich multi-object test canvas with distinct objects: person, tv, chair, bottle, laptop
    // We draw onto a hidden canvas and pipe the stream into the video element
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1280;
    testCanvas.height = 720;
    const ctx = testCanvas.getContext('2d');

    // Draw realistic scene with distinct recognizable shapes for COCO-SSD
    // Living room / desk setup:
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1280, 720); // Room background

    // 1. Table surface
    ctx.fillStyle = '#92400e';
    ctx.fillRect(100, 480, 1080, 240);

    // 2. TV / Monitor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(480, 150, 400, 260);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(500, 170, 360, 210); // Glowing screen
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(660, 410, 40, 70); // Stand

    // 3. Laptop on desk
    ctx.fillStyle = '#475569';
    ctx.fillRect(180, 440, 220, 140);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(190, 450, 200, 110);
    ctx.fillStyle = '#334155';
    ctx.fillRect(160, 575, 260, 15);

    // 4. Bottle
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.roundRect(430, 430, 40, 130, 10);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(440, 405, 20, 25); // cap

    // 5. Person silhouette
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(1020, 240, 50, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(960, 300, 120, 260, 20); // Torso
    ctx.fill();

    // Pipe this canvas stream into video element
    const stream = testCanvas.captureStream(30);
    const video = document.getElementById('live-camera-feed');
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    // Wait for detector model and detection loop ticks
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(r => setTimeout(r, 300));
      const layer = document.getElementById('live-bounding-box-layer');
      const countEl = document.getElementById('live-detected-count');
      const boxes = layer?.querySelectorAll('.live-detection-box') || [];
      const statusText = document.getElementById('live-detector-status')?.innerText;

      if (boxes.length > 0 || statusText === 'OBJECT DETECTION ACTIVE') {
        const boxDetails = Array.from(boxes).map(b => ({
          text: b.innerText.trim().replace(/\n+/g, ' '),
          style: b.getAttribute('style')
        }));
        return {
          success: true,
          statusText,
          objectCountText: countEl?.innerText,
          boxCount: boxes.length,
          boxDetails,
          videoWidth: video?.videoWidth,
          videoHeight: video?.videoHeight
        };
      }
    }

    return {
      success: false,
      statusText: document.getElementById('live-detector-status')?.innerText,
      objectCountText: document.getElementById('live-detected-count')?.innerText
    };
  });

  console.log('Live Vision Real Detection Output:', JSON.stringify(detectionResult, null, 2));

  // Capture screenshot of Live Vision with real detection bounding boxes
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_vision_detected_desktop.png'), fullPage: false });
  console.log('Saved live_vision_detected_desktop.png');

  // Test Mobile Live Vision Viewport
  console.log('\n--- 4. Testing Live Vision on Mobile 390x844 ---');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_vision_detected_mobile.png'), fullPage: false });
  console.log('Saved live_vision_detected_mobile.png');

  await browser.close();
  server.close();
  console.log('\n✅ All browser verification tests finished!');
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
