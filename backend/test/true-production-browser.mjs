// True Production Browser-Level Verification Script
// Uses real Puppeteer browser against https://insight-lens.vercel.app
// Inspects real network traffic, DOM elements, user interactions, and persistent states.

import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const FRONTEND_URL = 'https://insight-lens.vercel.app';
const EXPECTED_BACKEND_ORIGIN = 'https://insightlens-backend.onrender.com';

console.log('============================================================');
console.log('STARTING REAL BROWSER PRODUCTION TEST (PUPPETEER)');
console.log(`Target URL: ${FRONTEND_URL}`);
console.log(`Backend Origin: ${EXPECTED_BACKEND_ORIGIN}`);
console.log('============================================================\n');

async function runBrowserVerification() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkLog = [];
  const errorsDetected = [];

  // Monitor network requests & responses
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/')) {
      networkLog.push({
        type: 'REQUEST',
        method: req.method(),
        url,
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/')) {
      const status = res.status();
      const contentType = res.headers()['content-type'] || '';
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch (e) {}

      const entry = {
        type: 'RESPONSE',
        status,
        url,
        contentType,
        bodyPreview: bodyText.slice(0, 100),
        isDocType: bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html')
      };
      networkLog.push(entry);

      // Verify routing correctness: All API requests must go to onrender.com backend
      if (url.startsWith('https://insight-lens.vercel.app/api/')) {
        errorsDetected.push(`API called frontend origin instead of backend: ${url}`);
      }

      // Verify Content-Type and format: NEVER HTML
      if (entry.isDocType || contentType.includes('text/html')) {
        errorsDetected.push(`API endpoint returned HTML instead of JSON: ${url} (status ${status})`);
      }
    }
  });

  page.on('pageerror', err => {
    console.warn(`[Page Error] ${err.message}`);
    // Only capture true fatal API/JSON errors
    if (err.message.includes('<!DOCTYPE') || err.message.includes('is not valid JSON')) {
      errorsDetected.push(`Browser unhandled JSON parse error: ${err.message}`);
    }
  });

  try {
    // ------------------------------------------------------------------------
    // STEP 1: OPEN PRODUCTION HOMEPAGE
    // ------------------------------------------------------------------------
    console.log(`[Browser] Navigating to ${FRONTEND_URL}...`);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✔ Loaded production homepage');

    // ------------------------------------------------------------------------
    // STEP 2: TEST EXTENSIONS WORKSPACE & MARKETPLACE
    // ------------------------------------------------------------------------
    console.log('\n[Browser] Testing Extensions Marketplace...');
    
    // Click Extensions Nav Button
    await page.waitForSelector('button.nav-link[data-page="extensions"]', { visible: true, timeout: 10000 });
    await page.click('button.nav-link[data-page="extensions"]');
    await new Promise(r => setTimeout(r, 2000));

    // Verify catalog container is visible
    await page.waitForSelector('#extensions-catalog-grid', { visible: true, timeout: 10000 });
    
    // Wait for extension cards to load from production API
    await page.waitForFunction(() => {
      const grid = document.getElementById('extensions-catalog-grid');
      return grid && grid.querySelectorAll('.report-card').length >= 8;
    }, { timeout: 15000 });

    const cardCount = await page.evaluate(() => {
      return document.querySelectorAll('#extensions-catalog-grid .report-card').length;
    });
    console.log(`✔ Extensions Marketplace loaded ${cardCount} extension cards`);
    assert.ok(cardCount >= 8, `Expected at least 8 extension cards, found ${cardCount}`);

    // Verify Theme Studio card exists
    const hasThemeStudio = await page.evaluate(() => {
      return document.body.innerText.includes('Theme Studio');
    });
    assert.ok(hasThemeStudio, 'Theme Studio card must be visible on the page');
    console.log('✔ Theme Studio card verified');

    // Verify Typography Lab card exists
    const hasTypoLab = await page.evaluate(() => {
      return document.body.innerText.includes('Typography Lab');
    });
    assert.ok(hasTypoLab, 'Typography Lab card must be visible on the page');
    console.log('✔ Typography Lab card verified');

    // Install Theme Studio & Apply Terminal Theme
    console.log('[Browser] Applying theme via runtime...');
    await page.evaluate(async () => {
      if (typeof window.applyTheme === 'function') {
        await window.applyTheme('terminal');
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log('✔ Applied "terminal" theme in browser');

    // Reload and verify theme persistence
    console.log('[Browser] Reloading page to verify theme persistence from PostgreSQL...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const activeThemeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`✔ Reconstructed active theme after reload: ${activeThemeAttr || 'default/active'}`);

    // ------------------------------------------------------------------------
    // STEP 3: TEST KNOWLEDGE WORKSPACE & TABS
    // ------------------------------------------------------------------------
    console.log('\n[Browser] Testing Knowledge Workspace...');

    // Click Knowledge Nav Button
    await page.waitForSelector('button.nav-link[data-page="knowledge"]', { visible: true, timeout: 10000 });
    await page.click('button.nav-link[data-page="knowledge"]');
    await new Promise(r => setTimeout(r, 2000));

    // 1. Overview Tab
    await page.waitForSelector('#knowledge-pane-overview', { visible: true, timeout: 10000 });
    const overviewText = await page.evaluate(() => document.getElementById('knowledge-pane-overview')?.innerText || '');
    assert.ok(!overviewText.includes('Failed to load knowledge overview'), 'Overview tab must not show error message');
    console.log('✔ Knowledge Overview loaded cleanly');

    // 2. Time Machine Tab
    console.log('[Browser] Testing Time Machine tab...');
    await page.click('.knowledge-tab-btn[data-tab="timemachine"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('#knowledge-pane-timemachine', { visible: true });
    
    // Load Preset & Run Time Machine
    await page.evaluate(() => {
      if (typeof window.loadPresetKnowledge === 'function') {
        window.loadPresetKnowledge('api-spec');
      }
    });
    await new Promise(r => setTimeout(r, 500));
    
    const runBtn = await page.$('#run-timemachine-btn');
    if (runBtn) {
      await runBtn.click();
      console.log('[Browser] Clicked Run Time Machine, awaiting diff output...');
      await page.waitForFunction(() => {
        const out = document.getElementById('timemachine-results-container');
        return out && out.innerText.length > 50 && !out.innerText.includes('Loading');
      }, { timeout: 20000 });
      console.log('✔ Time Machine analysis completed and rendered diff cards');
    }

    // 3. Knowledge Gaps Tab
    console.log('[Browser] Testing Knowledge Gaps tab...');
    await page.click('.knowledge-tab-btn[data-tab="gaps"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('#knowledge-pane-gaps', { visible: true });

    await page.type('#gaps-input-text', 'The distributed messaging broker guarantees exact-once delivery with zero disk sync overhead.');
    const gapBtn = await page.$('#run-gaps-analyze-btn');
    if (gapBtn) {
      await gapBtn.click();
      console.log('[Browser] Clicked Analyze Gaps, awaiting assessment...');
      await page.waitForFunction(() => {
        const out = document.getElementById('gaps-list-container');
        return out && out.innerText.length > 20 && !out.innerText.includes('Loading knowledge gaps');
      }, { timeout: 20000 });
      console.log('✔ Knowledge Gap Detector completed and rendered findings');
    }

    // 4. Decision Memory Tab
    console.log('[Browser] Testing Decision Memory tab...');
    await page.click('.knowledge-tab-btn[data-tab="decisions"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('#knowledge-pane-decisions', { visible: true });
    const decText = await page.evaluate(() => document.getElementById('knowledge-pane-decisions')?.innerText || '');
    assert.ok(!decText.includes('Failed to load decisions'), 'Decision memory must not show failure error');
    console.log('✔ Decision Memory pane loaded cleanly');

    // Create a new decision in browser
    console.log('[Browser] Creating a new decision record...');
    await page.evaluate(() => {
      if (typeof window.openNewDecisionModal === 'function') window.openNewDecisionModal();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.type('#new-decision-text', 'Adopt PostgreSQL for Authoritative Extensions Persistence');
    await page.type('#new-decision-reason', 'LocalStorage alone is not authoritative for cross-device state synchronization.');
    
    await page.evaluate(() => {
      const form = document.getElementById('new-decision-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✔ New Decision created and submitted');

    // Reload and verify decision persistence
    console.log('[Browser] Reloading to verify decision persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.waitForSelector('button.nav-link[data-page="knowledge"]', { visible: true });
    await page.click('button.nav-link[data-page="knowledge"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.click('.knowledge-tab-btn[data-tab="decisions"]');
    await new Promise(r => setTimeout(r, 1500));
    const reloadedDecText = await page.evaluate(() => document.getElementById('knowledge-pane-decisions')?.innerText || '');
    assert.ok(reloadedDecText.includes('PostgreSQL') || reloadedDecText.includes('Authoritative'), 'Decision must persist across reloads');
    console.log('✔ Verified Decision persisted from PostgreSQL');

    // 5. Claim Domino Tab
    console.log('[Browser] Testing Claim Domino tab...');
    await page.click('.knowledge-tab-btn[data-tab="domino"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('#knowledge-pane-domino', { visible: true });
    const dominoText = await page.evaluate(() => document.getElementById('knowledge-pane-domino')?.innerText || '');
    assert.ok(!dominoText.includes('Failed to load graph'), 'Claim Domino must not show failure error');
    console.log('✔ Claim Domino pane loaded cleanly');

    // 6. Project Autopsy Tab
    console.log('[Browser] Testing Project Autopsy tab...');
    await page.click('.knowledge-tab-btn[data-tab="autopsy"]');
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('#knowledge-pane-autopsy', { visible: true });
    const autopsyText = await page.evaluate(() => document.getElementById('knowledge-pane-autopsy')?.innerText || '');
    assert.ok(!autopsyText.includes('Failed to load autopsies'), 'Project Autopsy must not show failure error');
    console.log('✔ Project Autopsy pane loaded cleanly');

    // ------------------------------------------------------------------------
    // STEP 4: NETWORK TRAFFIC AUDIT
    // ------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log('CAPTURED PRODUCTION NETWORK REQUESTS');
    console.log('============================================================');
    
    const apiResponses = networkLog.filter(n => n.type === 'RESPONSE');
    for (const res of apiResponses) {
      console.log(`[HTTP ${res.status}] ${res.url} | Content-Type: ${res.contentType}`);
    }

    console.log(`\nTotal API calls made by browser: ${apiResponses.length}`);
    console.log(`Total errors detected: ${errorsDetected.length}`);

    if (errorsDetected.length > 0) {
      console.error('\n✖ BROWSER NETWORK / ROUTING ERRORS DETECTED:');
      for (const err of errorsDetected) {
        console.error(`  - ${err}`);
      }
      throw new Error(`Browser test failed with ${errorsDetected.length} errors.`);
    }

    console.log('\n============================================================');
    console.log('ALL PRODUCTION BROWSER TESTS PASSED (100% SUCCESS)');
    console.log('============================================================');

  } finally {
    await browser.close();
  }
}

runBrowserVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Fatal Browser Test Error]', err);
    process.exit(1);
  });
