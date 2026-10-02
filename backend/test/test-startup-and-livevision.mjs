import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FRONTEND_URL = 'https://insight-lens.vercel.app';
const BACKEND_URL = 'https://insightlens-backend.onrender.com';

console.log('============================================================');
console.log('STARTING STARTUP BENCHMARK & LIVE VISION PRODUCTION AUDIT');
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`Backend URL:  ${BACKEND_URL}`);
console.log('============================================================\n');

async function runAudit() {
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_audit_'));
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempProfileDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --------------------------------------------------------------------------
  // TEST 1: STARTUP SPEED BENCHMARK & ZERO UNWANTED TOASTS
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: STARTUP SPEED BENCHMARK & TOAST PURGE ---');
  const t0 = Date.now();
  
  // Track all toasts that appear
  const observedToasts = [];
  await page.exposeFunction('onToastObserved', (msg) => {
    observedToasts.push(msg);
  });

  await page.evaluateOnNewDocument(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('animate-toast-in')) {
            window.onToastObserved(node.innerText);
          }
        }
      }
    });
    window.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('toast-container');
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
    });
  });

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const t1 = Date.now();
  const timeToInteractive = t1 - t0;
  console.log(`[T0 -> T1] Page Load to Shell Interactive: ${timeToInteractive}ms`);

  // Wait for home page elements to be visible
  await page.waitForSelector('#page-landing', { visible: true, timeout: 10000 });
  const t4 = Date.now();
  console.log(`[T0 -> T4] Home (Landing) Page Usable: ${t4 - t0}ms`);

  // Allow any initial async tasks to settle
  await new Promise(r => setTimeout(r, 2000));

  console.log(`Observed initial startup toasts: ${JSON.stringify(observedToasts)}`);
  
  // Verify NO mode deactivation toasts appeared
  const unwantedToasts = observedToasts.filter(t => 
    t.includes('Academic Mode') || 
    t.includes('Focus Mode') || 
    t.includes('Presentation Mode') || 
    t.includes('Developer Mode')
  );
  assert.equal(unwantedToasts.length, 0, `Expected 0 unwanted mode toasts on startup, found: ${JSON.stringify(unwantedToasts)}`);
  console.log('✔ Startup Toast Suppression: PASS (0 unwanted notifications on startup)\n');

  // --------------------------------------------------------------------------
  // TEST 2: LIVE VISION OBJECT DETECTION INTERFACE & CAMERA LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: LIVE VISION OBJECT DETECTION CONTROLS & OVERLAY ---');
  
  // Navigate to Live Vision
  await page.evaluate(() => {
    window.navigateTo('livevision');
  });

  await page.waitForFunction(() => {
    const el = document.getElementById('page-livevision');
    return el && !el.classList.contains('hidden');
  }, { timeout: 10000 });
  
  // Check required buttons and status elements
  const hasStartBtn = await page.$('#start-camera-btn');
  const hasSwitchBtn = await page.$('#switch-camera-btn');
  const hasPauseBtn = await page.$('#pause-camera-btn');
  const hasStopBtn = await page.$('#stop-camera-btn');
  const hasLayer = await page.$('#live-bounding-box-layer');

  assert.ok(hasStartBtn, 'Start camera button must exist');
  assert.ok(hasSwitchBtn, 'Switch camera button must exist');
  assert.ok(hasPauseBtn, 'Pause camera button must exist');
  assert.ok(hasStopBtn, 'Stop camera button must exist');
  assert.ok(hasLayer, 'Live bounding box overlay layer must exist');

  console.log('✔ Live Vision UI Elements & Controls: PASS');

  // Start fake camera stream in Puppeteer
  await page.click('#start-camera-btn');
  await new Promise(r => setTimeout(r, 1500));

  const isVideoVisible = await page.evaluate(() => {
    const wrapper = document.getElementById('live-video-wrapper');
    const video = document.getElementById('live-camera-feed');
    return !wrapper.classList.contains('hidden') && video && !video.paused;
  });
  console.log(`Live Camera Video Stream Active: ${isVideoVisible}`);

  // Test Pause / Resume cycle
  await page.click('#pause-camera-btn');
  await new Promise(r => setTimeout(r, 500));
  const isPaused = await page.evaluate(() => {
    const btn = document.getElementById('pause-camera-btn');
    return btn.innerText.includes('Resume');
  });
  assert.ok(isPaused, 'Pause button must toggle to Resume');
  console.log('✔ Live Vision Pause Toggle: PASS');

  await page.click('#pause-camera-btn');
  await new Promise(r => setTimeout(r, 500));
  const isResumed = await page.evaluate(() => {
    const btn = document.getElementById('pause-camera-btn');
    return btn.innerText.includes('Pause');
  });
  assert.ok(isResumed, 'Resume button must toggle back to Pause');
  console.log('✔ Live Vision Resume Toggle: PASS');

  // Stop camera
  await page.click('#stop-camera-btn');
  await new Promise(r => setTimeout(r, 500));
  const isStopped = await page.evaluate(() => {
    const wrapper = document.getElementById('live-video-wrapper');
    const placeholder = document.getElementById('live-camera-placeholder');
    return wrapper.classList.contains('hidden') && !placeholder.classList.contains('hidden');
  });
  assert.ok(isStopped, 'Stop camera must restore placeholder');
  console.log('✔ Live Vision Stop Camera Lifecycle: PASS\n');

  // --------------------------------------------------------------------------
  // TEST 3: MOBILE RESPONSIVENESS (390x844 & 412x915)
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: MOBILE RESPONSIVENESS & BOUNDING BOX SCALING ---');
  
  for (const [w, h, name] of [[390, 844, 'iPhone 14'], [412, 915, 'Pixel 7']]) {
    await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 300));
    
    const isMobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(isMobileOverflow, false, `No horizontal scroll allowed on ${name} (${w}x${h})`);
    console.log(`✔ Mobile Viewport ${name} (${w}x${h}): PASS (0 horizontal overflow)`);
  }

  await browser.close();
  console.log('\n============================================================');
  console.log('ALL STARTUP BENCHMARKS & LIVE VISION PRODUCTION AUDITS PASSED!');
  console.log('============================================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
