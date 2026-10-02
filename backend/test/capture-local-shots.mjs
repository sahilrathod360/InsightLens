import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer';

const dir = 'C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';

async function main() {
  const distDir = 'C:/InsightLens/frontend/dist';
  
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(distDir, reqPath);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).slice(1);
      const contentType = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
        svg: 'image/svg+xml',
        jpg: 'image/jpeg',
        png: 'image/png',
        json: 'application/json'
      }[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  await new Promise(r => server.listen(4173, '127.0.0.1', r));

  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_local_shots_'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempProfileDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. Desktop Home (1440x900)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(dir, 'new_home_desktop.png') });

  // 2. Desktop Analyze
  await page.evaluate(() => window.navigateTo('desk'));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'new_desk_desktop.png') });

  // 3. Desktop Compare
  await page.evaluate(() => window.navigateTo('compare'));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'new_compare_desktop.png') });

  // 4. Desktop Live Vision
  await page.evaluate(() => window.navigateTo('livevision'));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'new_livevision_desktop.png') });

  // 5. Mobile Home (390x844)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.navigateTo('landing'));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(dir, 'new_home_mobile.png') });

  await browser.close();
  server.close();
  console.log('All new local screenshots captured successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
