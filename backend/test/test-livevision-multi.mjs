import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4180;
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
  console.log(`🌐 Multi-Object Test Server running at http://localhost:${PORT}`);

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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.navigateTo('livevision');
  });
  await new Promise(r => setTimeout(r, 1000));

  // Multi-object scene test: TV, Laptop, Person, Bottle
  const detectionResult = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Background Room
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1280, 720);

    // 1. Desk/Table
    ctx.fillStyle = '#78350f';
    ctx.fillRect(50, 420, 1180, 300);

    // 2. Large TV / Monitor in background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(380, 80, 520, 330);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(400, 100, 480, 270); // screen
    ctx.fillStyle = '#475569';
    ctx.fillRect(620, 410, 40, 60); // neck
    ctx.fillRect(560, 460, 160, 15); // base

    // 3. Laptop on left
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(120, 390, 240, 160);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(130, 400, 220, 130);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(100, 545, 280, 20);

    // 4. Person on right
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(1060, 220, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(980, 290, 160, 290, 25);
    ctx.fill();

    const stream = canvas.captureStream(30);
    const video = document.getElementById('live-camera-feed');
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    // Wait for detection ticks
    for (let attempt = 0; attempt < 35; attempt++) {
      await new Promise(r => setTimeout(r, 300));
      const layer = document.getElementById('live-bounding-box-layer');
      const countEl = document.getElementById('live-detected-count');
      const boxes = layer?.querySelectorAll('.live-detection-box') || [];
      const statusText = document.getElementById('live-detector-status')?.innerText;

      if (boxes.length > 0) {
        const boxDetails = Array.from(boxes).map(b => ({
          text: b.innerText.trim().replace(/\n+/g, ' '),
          style: b.getAttribute('style')
        }));
        return {
          success: true,
          statusText,
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

  console.log('Multi-Object Scene Detections:', JSON.stringify(detectionResult, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_vision_multi_objects_real.png'), fullPage: false });
  console.log('Saved live_vision_multi_objects_real.png');

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
