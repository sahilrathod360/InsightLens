import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4185;
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
  console.log(`🌐 Real Photo Test Server running at http://localhost:${PORT}`);

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
  await new Promise(r => setTimeout(r, 1000));

  const result = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    // Load a real photo (e.g. city harbor with boats and cars)
    const img = new Image();
    img.src = '/images/city-harbor-night.jpg';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1280;
    testCanvas.height = 720;
    const ctx = testCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 1280, 720);

    const stream = testCanvas.captureStream(30);
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

  console.log('Real Photo Detection Result:', JSON.stringify(result, null, 2));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_live_vision_real_photo.png'), fullPage: false });

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
