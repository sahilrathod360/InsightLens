import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4195;
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
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.navigateTo('livevision');
  });

  console.log('Navigated to Live Vision. Starting camera with realistic multi-object scene...');
  const result = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    // Create a real-looking photographic visual feed on canvas (e.g. workspace with monitor, laptop, keyboard, cup, person)
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1280;
    testCanvas.height = 720;
    const ctx = testCanvas.getContext('2d');

    // Desk surface
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, 480, 1280, 240);

    // Wall
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, 1280, 480);

    // Large TV / Monitor in center
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(360, 100, 560, 360);
    ctx.fillStyle = '#2980B9';
    ctx.fillRect(380, 120, 520, 320);
    ctx.fillStyle = '#111111';
    ctx.fillRect(610, 460, 60, 50);
    ctx.fillRect(560, 510, 160, 15);

    // Laptop on desk left
    ctx.fillStyle = '#BDC3C7';
    ctx.fillRect(100, 420, 220, 140);
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(110, 430, 200, 110);
    ctx.fillStyle = '#95A5A6';
    ctx.fillRect(80, 550, 260, 15);

    // Bottle / Cup on desk right
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(1020, 420, 50, 120);

    // Stream to video element
    const stream = testCanvas.captureStream(30);
    const video = document.getElementById('live-camera-feed');
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    // Wait up to 25s for model download and object detection ticks
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 500));
      const layer = document.getElementById('live-bounding-box-layer');
      const countEl = document.getElementById('live-detected-count');
      const statusEl = document.getElementById('live-detector-status');
      const latencyEl = document.getElementById('live-frame-latency');
      const boxes = layer?.querySelectorAll('.live-detection-box') || [];

      if (statusEl?.innerText === 'OBJECT DETECTION ACTIVE') {
        // Return full state once active
        return {
          modelLoaded: true,
          statusText: statusEl?.innerText,
          countText: countEl?.innerText,
          latencyText: latencyEl?.innerText,
          boxCount: boxes.length,
          boxes: Array.from(boxes).map(b => ({
            label: b.innerText.trim().replace(/\s+/g, ' '),
            style: b.getAttribute('style')
          }))
        };
      }
    }

    return {
      modelLoaded: false,
      statusText: document.getElementById('live-detector-status')?.innerText
    };
  });

  console.log('Live Vision Real-Time Detection Result:', JSON.stringify(result, null, 2));

  // Take high-res verification screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_vision_verified_active.png'), fullPage: false });
  console.log('Saved live_vision_verified_active.png artifact.');

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
