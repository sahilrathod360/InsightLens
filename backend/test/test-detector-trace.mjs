import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4192;
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
  console.log(`🌐 Inspector Server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.navigateTo('livevision');
  });

  // Let's inspect what happens inside LiveVision step-by-step
  const stepLogs = await page.evaluate(async () => {
    const logs = [];
    const t0 = performance.now();
    const log = (msg) => logs.push(`[+${Math.round(performance.now() - t0)}ms] ${msg}`);

    try {
      log('1. Checking window and document...');
      const statusEl = document.getElementById('live-detector-status');
      log('Status element text: ' + statusEl?.innerText);

      log('2. Testing if detector is available or loading...');
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        log(`Tick ${i + 1}: status = ${statusEl?.innerText}`);
        if (statusEl?.innerText.includes('ACTIVE') || statusEl?.innerText.includes('unavailable')) {
          break;
        }
      }

      return { logs };
    } catch (e) {
      log('ERROR: ' + e.message);
      return { logs, error: e.message };
    }
  });

  console.log('Step Logs:', JSON.stringify(stepLogs, null, 2));

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
