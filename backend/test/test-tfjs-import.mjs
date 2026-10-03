import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4176;
const DIST_DIR = path.resolve('frontend/dist');

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
  console.log(`🌐 Test Server running at http://localhost:${PORT}`);

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
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });

  // Navigate to livevision
  await page.evaluate(() => {
    window.navigateTo('livevision');
  });
  await new Promise(r => setTimeout(r, 1000));

  // Test detector loading directly in browser context
  const modelLoadResult = await page.evaluate(async () => {
    try {
      console.log('Importing tfjs and coco-ssd...');
      const tf = await import('/assets/coco-ssd.es2017.esm.min-CTrvMo1a.js'); // check assets or dynamic import
      console.log('TF loaded');
      return { success: true };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });

  console.log('Model import test:', modelLoadResult);

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
