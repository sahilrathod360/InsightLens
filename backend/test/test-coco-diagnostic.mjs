import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4177;
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
  console.log(`🌐 Diagnostic Server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });

  const result = await page.evaluate(async () => {
    const logs = [];
    try {
      logs.push('1. Importing tfjs...');
      const tf = await import('@tensorflow/tfjs');
      logs.push('2. tfjs imported. tf.version: ' + JSON.stringify(tf.version || 'ok'));

      logs.push('3. Importing coco-ssd...');
      const cocoMod = await import('@tensorflow-models/coco-ssd');
      logs.push('4. cocoMod keys: ' + Object.keys(cocoMod).join(', '));
      const loader = cocoMod.load || (cocoMod.default && cocoMod.default.load);
      logs.push('5. loader type: ' + typeof loader);

      if (typeof loader === 'function') {
        logs.push('6. Invoking loader()...');
        const model = await loader({ base: 'mobilenet_v2' });
        logs.push('7. Model loaded! model.detect type: ' + typeof model.detect);

        // Test detection on a dummy canvas with a colored rectangle
        const c = document.createElement('canvas');
        c.width = 640;
        c.height = 480;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(50, 50, 200, 200);

        logs.push('8. Detecting on test canvas...');
        const preds = await model.detect(c);
        logs.push('9. Detection test complete! Predictions count: ' + preds.length);
        return { success: true, logs, preds };
      }
      return { success: false, logs, error: 'loader not found' };
    } catch (e) {
      logs.push('ERROR: ' + e.message + ' | Stack: ' + e.stack);
      return { success: false, logs, error: e.message };
    }
  });

  console.log('Diagnostic Result:', JSON.stringify(result, null, 2));

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
