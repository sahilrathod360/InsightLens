import puppeteer from 'puppeteer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FRONTEND_URL = 'https://insight-lens.vercel.app';
const dir = 'C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';

async function capture() {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_audit_shots_'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempProfileDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(dir, 'prod_home_desktop.png'), fullPage: false });
  
  // Desk page
  await page.click('button.nav-link[data-page="desk"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(dir, 'prod_desk_desktop.png'), fullPage: false });

  // Compare page
  await page.click('button.nav-link[data-page="compare"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(dir, 'prod_compare_desktop.png'), fullPage: false });

  // Mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.click('button.nav-link[data-page="landing"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(dir, 'prod_home_mobile.png'), fullPage: false });

  await browser.close();
  console.log('Screenshots captured successfully');
}

capture().catch(err => {
  console.error('Error capturing shots:', err);
  process.exit(1);
});
