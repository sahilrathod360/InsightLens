// AI Provider Failover and Error-Handling Audit Test Suite
// Verifies:
// 1. Gemini successful request
// 2. OpenRouter free model test (if available) / key status check
// 3. OpenRouter HTTP 402 handling on non-free models
// 4. Automatic fallback to Gemini when OpenRouter fails (with preferredProvider: 'openrouter')
// 5. Invalid key handling and timeout bounds

import assert from 'node:assert';
import fs from 'node:fs';
import { config } from '../src/config/env.js';
import GeminiService from '../src/services/ai/GeminiService.js';
import OpenRouterService from '../src/services/ai/OpenRouterService.js';
import AIManager from '../src/services/ai/AIManager.js';
import ModelHealthTracker from '../src/services/ai/ModelHealthTracker.js';

const sampleDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function runFailoverAudit() {
  console.log('\n======================================================');
  console.log('--- AI Provider Failover & Resilience Audit ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // --- Step 1: Gemini Successful Live Request ---
  try {
    console.log('[Test 1] Testing Gemini live visual analysis request...');
    const t0 = Date.now();
    const result = await GeminiService.generateWithModel(
      { id: 'gemini-3.5-flash-lite', timeoutMs: 25000 },
      sampleDataUrl,
      { subjectContext: 'Test Swatch', researchLength: 'short' }
    );
    assert(result && result.subject, 'Gemini must return valid report object with subject');
    console.log(`  ✓ Gemini successful. Subject: "${result.subject}", TTFB: ${result.timeToFirstByteMs}ms, Total: ${Date.now() - t0}ms`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 1 Failed:', err.message);
    failed++;
  }

  // --- Step 2: OpenRouter Key & Model Status ---
  try {
    console.log('[Test 2] Testing OpenRouter key status and credit limit...');
    const apiKey = config.apiKeys.openrouter;
    if (!apiKey) {
      console.log('  ⚠ No OpenRouter key configured');
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await res.json();
      console.log(`  ✓ OpenRouter key response: HTTP ${res.status}. Data: label="${data.data?.label}", limit=${data.data?.limit}, usage=${data.data?.usage}, is_free_tier=${data.data?.is_free_tier}`);
      passed++;
    }
  } catch (err) {
    console.error('  ✗ Test 2 Failed:', err.message);
    failed++;
  }

  // --- Step 3: OpenRouter HTTP 402 Handling ---
  try {
    console.log('[Test 3] Testing OpenRouter HTTP 402 handling on non-free model...');
    let caught402 = false;
    try {
      await OpenRouterService.generateWithModel(
        { id: 'google/gemini-2.5-flash-lite', timeoutMs: 8000 },
        sampleDataUrl,
        { subjectContext: 'Test Swatch', researchLength: 'short' }
      );
    } catch (err) {
      caught402 = err.message.includes('402') || err.message.includes('credits') || err.message.includes('Payment');
      console.log(`  ✓ OpenRouter error caught gracefully: "${err.message}" (Detected 402/Credits: ${caught402})`);
      assert(caught402, 'Should catch 402 or credit error');
    }
    passed++;
  } catch (err) {
    console.error('  ✗ Test 3 Failed:', err.message);
    failed++;
  }

  // --- Step 4: Automatic Fallback to Gemini when Preferred Provider is OpenRouter ---
  try {
    console.log('[Test 4] Testing automatic fallback from OpenRouter to Gemini in AIManager...');
    const t0 = Date.now();
    // Load real image to pass sharp / imageOptimizer cleanly
    const realImgBuf = fs.readFileSync('C:\\InsightLens\\frontend\\public\\images\\neural-network.jpg');
    const realDataUrl = `data:image/jpeg;base64,${realImgBuf.toString('base64')}`;

    // Request with preferredProvider: 'openrouter'. Because OpenRouter models fail with 402,
    // the racing pool should seamlessly promote Gemini candidates and succeed!
    const report = await AIManager.generateReport(
      realDataUrl,
      { subjectContext: 'Neural Network Architecture', researchLength: 'short' },
      'openrouter' // Preferred provider requested
    );

    assert(report && report.subject, 'AIManager must return valid report despite OpenRouter failure');
    assert(report.aiProvider.toLowerCase().includes('gemini'), 'Provider should have fallen back to Gemini');
    console.log(`  ✓ Seamless fallback verified in ${Date.now() - t0}ms. Final Provider: "${report.aiProvider}", Model: "${report.actualModel}"`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 4 Failed:', err.message);
    failed++;
  }

  // --- Step 5: Invalid Key and Timeout Handling ---
  try {
    console.log('[Test 5] Testing invalid API key and timeout error boundaries...');
    // Test timeout abort
    const timeoutPromise = GeminiService.generateWithModel(
      { id: 'gemini-3.5-flash-lite', timeoutMs: 1 }, // 1ms timeout
      sampleDataUrl,
      { subjectContext: 'Test Timeout', researchLength: 'short' }
    );
    let caughtTimeout = false;
    try {
      await timeoutPromise;
    } catch (err) {
      caughtTimeout = true;
      console.log(`  ✓ Timeout handled cleanly: "${err.message}"`);
    }
    assert(caughtTimeout, 'Timeout must trigger AbortError or timeout exception');

    // Test invalid key
    const invalidKeyRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=AIzaSyFakeKey1234567890Invalid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
    });
    assert(invalidKeyRes.status === 400 || invalidKeyRes.status === 401 || invalidKeyRes.status === 403, 'Invalid key should return 400/401/403');
    console.log(`  ✓ Invalid key rejected with HTTP ${invalidKeyRes.status} as expected.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 5 Failed:', err.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`--- Provider Failover Results: ${passed} / 5 Passed (${failed} Failed) ---`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runFailoverAudit();
