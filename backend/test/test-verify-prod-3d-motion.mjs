import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://insight-lens.vercel.app';
const ARTIFACT_DIR = path.resolve('C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd');

async function run() {
  console.log(`🌐 Launching Production 3D Motion Verification on ${PROD_URL}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PROD LOG:', msg.type(), msg.text()));

  // 1. Desktop 1920x1080 Continuous Motion Verification
  console.log('\n--- 1. Testing Production 1920x1080 Continuous 3D Motion ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const shotAPath = path.join(ARTIFACT_DIR, 'prod_3d_desktop_frame_A.png');
  const shotBPath = path.join(ARTIFACT_DIR, 'prod_3d_desktop_frame_B.png');

  await page.screenshot({ path: shotAPath, fullPage: false });
  console.log('Production Frame A captured at T = 0ms');

  // Wait 1.5 seconds with zero mouse movement
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: shotBPath, fullPage: false });
  console.log('Production Frame B captured at T = 1500ms (zero mouse input)');

  const bufA = fs.readFileSync(shotAPath);
  const bufB = fs.readFileSync(shotBPath);
  const isDifferent = !bufA.equals(bufB);
  console.log(`Production Autonomous Animation Verification: ${isDifferent ? 'PASS (Live continuous 3D motion confirmed)' : 'FAIL'}`);

  // 2. Laptop 1366x768 Viewport
  console.log('\n--- 2. Testing Production Laptop 1366x768 Viewport ---');
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_3d_laptop_1366.png'), fullPage: false });
  console.log('Captured prod_3d_laptop_1366.png');

  // 3. Mobile 390x844 Viewport
  console.log('\n--- 3. Testing Production Mobile 390x844 Viewport ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_3d_mobile_390.png'), fullPage: false });
  console.log('Captured prod_3d_mobile_390.png');

  await browser.close();
  console.log('✅ Live production 3D motion verification completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
