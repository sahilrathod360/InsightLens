import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4198;
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
  console.log(`🌐 3D Motion Test Server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  // 1. Desktop 1920x1080: Continuous Motion Verification
  console.log('\n--- 1. Testing Desktop 1920x1080 Continuous 3D Motion ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const shotAPath = path.join(ARTIFACT_DIR, '3d_motion_desktop_frame_A.png');
  const shotBPath = path.join(ARTIFACT_DIR, '3d_motion_desktop_frame_B.png');

  await page.screenshot({ path: shotAPath, fullPage: false });
  console.log('Frame A captured at T = 0ms');

  // Wait 1.5 seconds with zero mouse movement
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: shotBPath, fullPage: false });
  console.log('Frame B captured at T = 1500ms (zero mouse input)');

  const bufA = fs.readFileSync(shotAPath);
  const bufB = fs.readFileSync(shotBPath);
  const isDifferent = !bufA.equals(bufB);
  console.log(`Autonomous Animation Verification: ${isDifferent ? 'PASS (Pixels continuously changing in 3D without mouse movement)' : 'FAIL'}`);

  // 2. Laptop 1366x768 Viewport
  console.log('\n--- 2. Testing Laptop 1366x768 Viewport ---');
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '3d_motion_laptop_1366.png'), fullPage: false });
  console.log('Captured 3d_motion_laptop_1366.png');

  // 3. Mobile 390x844 Viewport
  console.log('\n--- 3. Testing Mobile 390x844 Viewport ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '3d_motion_mobile_390.png'), fullPage: false });
  console.log('Captured 3d_motion_mobile_390.png');

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
