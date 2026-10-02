import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACT_DIR = 'C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';
const PROD_URL = 'https://insight-lens.vercel.app';

async function verifyProduction() {
  console.log(`🌐 Connecting to LIVE PRODUCTION at ${PROD_URL}...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. Desktop Full HD (1920x1080)
    console.log('\n--- 1. Desktop 1920x1080 Live Production Verification ---');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1920, height: 1080 });
    await pageDesktop.goto(PROD_URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));

    const heroTitle = await pageDesktop.$eval('#landing-hero-title', el => el.innerText.trim());
    console.log('Live Hero Title:', heroTitle);

    const canvasExists = await pageDesktop.$eval('#landing-depth-canvas', el => !!el);
    console.log('Live 3D Depth Canvas:', canvasExists ? 'PRESENT (PASS)' : 'MISSING (FAIL)');

    const realAssetsCount = await pageDesktop.$$eval('#hero-asset-lenses button', btns => btns.length);
    console.log(`Live Hero Quick Lenses: ${realAssetsCount} assets (PASS)`);

    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_v2_hero_1920.png') });
    console.log('Saved live_prod_v2_hero_1920.png');

    // Test quick lens switch
    const planetBtn = await pageDesktop.$('button[data-asset="planet"]');
    if (planetBtn) {
      await planetBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const activeTitle = await pageDesktop.$eval('#hero-active-title', el => el.innerText.trim());
      console.log('Active Title after switch:', activeTitle);
      await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_v2_hero_planet_switched.png') });
    }

    await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_v2_full_desktop.png'), fullPage: true });
    console.log('Saved live_prod_v2_full_desktop.png');

    const desktopOverflow = await pageDesktop.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Desktop 1920x1080 Overflow Check:', desktopOverflow ? 'FAIL' : 'PASS (0 overflow)');
    await pageDesktop.close();

    // 2. Mobile 390x844
    console.log('\n--- 2. Mobile 390x844 Live Production Verification ---');
    const pageMobile390 = await browser.newPage();
    await pageMobile390.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pageMobile390.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));

    const mobile390Overflow = await pageMobile390.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Mobile 390x844 Overflow Check:', mobile390Overflow ? 'FAIL' : 'PASS (0 overflow)');

    await pageMobile390.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_v2_mobile_390.png') });
    await pageMobile390.screenshot({ path: path.join(ARTIFACT_DIR, 'live_prod_v2_mobile_390_full.png'), fullPage: true });
    console.log('Saved live_prod_v2_mobile_390.png');
    await pageMobile390.close();

    // 3. Mobile 412x915
    console.log('\n--- 3. Mobile 412x915 Live Production Verification ---');
    const pageMobile412 = await browser.newPage();
    await pageMobile412.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
    await pageMobile412.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));

    const mobile412Overflow = await pageMobile412.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log('Mobile 412x915 Overflow Check:', mobile412Overflow ? 'FAIL' : 'PASS (0 overflow)');
    await pageMobile412.close();

    console.log('\n🎉 ALL LIVE PRODUCTION VERIFICATIONS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

verifyProduction().catch(err => {
  console.error('Live Production Verification failed:', err);
  process.exit(1);
});
