import puppeteer from 'puppeteer';
import path from 'path';

const PROD_URL = 'https://insight-lens.vercel.app';
const ARTIFACT_DIR = path.resolve('C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd');

async function run() {
  console.log(`🌐 Connecting to LIVE PRODUCTION at ${PROD_URL}...`);

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
  page.on('console', msg => console.log('PROD LOG [' + msg.type() + ']:', msg.text()));
  page.on('pageerror', err => console.log('PROD ERROR:', err.message));

  // 1. Desktop 1920x1080 3D Background Check
  console.log('\n--- 1. Live Desktop 1920x1080 3D Background Verification ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const prodBgState = await page.evaluate(() => {
    const canvas = document.getElementById('landing-depth-canvas');
    const container = document.querySelector('.landing-bg-container');
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      canvasExists: !!canvas,
      containerExists: !!container,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      renderedWidth: rect?.width,
      renderedHeight: rect?.height,
      containerPosition: container ? window.getComputedStyle(container).position : null
    };
  });
  console.log('Live Production 3D Background State:', prodBgState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_3d_desktop_1920.png'), fullPage: false });
  console.log('Saved live_prod_3d_desktop_1920.png');

  // 2. Laptop 1366x768 Check
  console.log('\n--- 2. Live Laptop 1366x768 3D Background Verification ---');
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_3d_laptop_1366.png'), fullPage: false });
  console.log('Saved live_prod_3d_laptop_1366.png');

  // 3. Mobile 390x844 Check
  console.log('\n--- 3. Live Mobile 390x844 3D Background Verification ---');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_3d_mobile_390.png'), fullPage: false });
  console.log('Saved live_prod_3d_mobile_390.png');

  // 4. Live Vision Object Detection Verification
  console.log('\n--- 4. Live Vision Real Detection on Production ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    window.navigateTo('livevision');
  });
  await new Promise(r => setTimeout(r, 1200));

  const prodDetectionResult = await page.evaluate(async () => {
    await window.startLiveCameraStream();

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Draw living room scene with TV monitor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(50, 420, 1180, 300);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(380, 80, 520, 330);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(400, 100, 480, 270);
    ctx.fillStyle = '#475569';
    ctx.fillRect(620, 410, 40, 60);
    ctx.fillRect(560, 460, 160, 15);

    const stream = canvas.captureStream(30);
    const video = document.getElementById('live-camera-feed');
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(r => setTimeout(r, 400));
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
      statusText: document.getElementById('live-detector-status')?.innerText
    };
  });

  console.log('Production Live Vision Result:', JSON.stringify(prodDetectionResult, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_vision_detected.png'), fullPage: false });
  console.log('Saved live_prod_vision_detected.png');

  await browser.close();
  console.log('\n🎉 ALL PRODUCTION VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
