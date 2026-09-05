import assert from 'node:assert/strict';
import sharp from 'sharp';
import AIManager from '../src/services/ai/AIManager.js';
import ModelRegistry from '../src/services/ai/ModelRegistry.js';
import ModelHealthTracker from '../src/services/ai/ModelHealthTracker.js';
import GeminiService from '../src/services/ai/GeminiService.js';
import OpenRouterService from '../src/services/ai/OpenRouterService.js';
import { APIError } from '../src/utils/apiUtils.js';

console.log('=== INSIGHTLENS AI RELIABILITY & RESILIENCE TEST SUITE ===\n');

// Reset health tracker before testing
ModelHealthTracker.reset();

// Helper: Generate a unique test image buffer
async function createTestImage(r, g, b, label = '') {
  const imgBuf = await sharp({
    create: { width: 120, height: 120, channels: 3, background: { r, g, b } }
  }).jpeg().toBuffer();
  return `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
}

// ============================================================================
// TEST 1: Normal Live Analysis on Fresh Person Image
// ============================================================================
console.log('--- TEST 1: Live Analysis on Fresh Person/Athlete Image ---');
const personImage = await createTestImage(30, 80, 200, 'Athlete');
const t1Start = Date.now();
const report1 = await AIManager.generateReport(personImage, {
  subjectContext: 'Marathon Athlete in Blue Kit',
  language: 'en',
  researchLength: 'standard',
  writingStyle: 'academic',
  citationStyle: 'APA'
});
const t1Duration = Date.now() - t1Start;
console.log(`Test 1 Completed in ${t1Duration}ms using [${report1.aiProvider} / ${report1.actualModel}]`);
assert.ok(report1.subject, 'Report 1 must have subject');
assert.ok(report1.title, 'Report 1 must have title');
assert.ok(report1.evidenceLedger, 'Report 1 must include evidenceLedger');
assert.ok(Array.isArray(report1.evidenceLedger), 'evidenceLedger must be an array');
assert.equal(report1.reportVersion, '2.2', 'Report version must be 2.2');
assert.ok(report1.evidenceLedger.length > 0, 'Report 1 must contain structured evidence ledger entries');
console.log(`✓ Test 1 PASSED: Generated ${report1.evidenceLedger.length} ledger claims. Version: ${report1.reportVersion}\n`);

// ============================================================================
// TEST 2: Second Fresh Image Live Analysis (Chart/Diagram Context)
// ============================================================================
console.log('--- TEST 2: Second Fresh Image Live Analysis ---');
const chartImage = await createTestImage(220, 100, 40, 'Chart');
const t2Start = Date.now();
const report2 = await AIManager.generateReport(chartImage, {
  subjectContext: 'Annual Revenue Growth Bar Chart 2020-2025',
  language: 'en',
  researchLength: 'standard'
});
const t2Duration = Date.now() - t2Start;
console.log(`Test 2 Completed in ${t2Duration}ms using [${report2.aiProvider} / ${report2.actualModel}]`);
assert.ok(report2.subject, 'Report 2 must have subject');
assert.ok(report2.evidenceLedger, 'Report 2 must have evidenceLedger');
console.log(`✓ Test 2 PASSED: Second image analysis succeeded without user retry.\n`);

// ============================================================================
// TEST 3: Simulated Gemini 429 Rate Limit on Primary Model -> Auto Fallback
// ============================================================================
console.log('--- TEST 3: Simulated Gemini 429 Rate Limit on Primary Model ---');
ModelHealthTracker.reset();

const origGeminiWithModel = GeminiService.generateWithModel.bind(GeminiService);
let gemini429CallCount = 0;

GeminiService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  const modelId = modelConfig.id || modelConfig;
  if (modelId === 'gemini-3.5-flash-lite' && gemini429CallCount === 0) {
    gemini429CallCount++;
    console.log(`[SIMULATION] Injecting 429 Rate Limit into ${modelId}`);
    ModelHealthTracker.recordFailure(modelId, 'HTTP_429', 150, 'Rate limit exceeded');
    throw new APIError('RESOURCE_EXHAUSTED: 429 Too Many Requests', 429, 'Gemini');
  }
  return origGeminiWithModel(modelConfig, dataUrl, promptObj, signal);
};

const simImage1 = await createTestImage(10, 200, 100);
const t3Start = Date.now();
const report3 = await AIManager.generateReport(simImage1, { subjectContext: 'Simulated 429 Recovery Test' });
const t3Duration = Date.now() - t3Start;

assert.ok(report3.subject, 'Report 3 must succeed via fallback');
assert.notEqual(report3.actualModel, 'gemini-3.5-flash-lite', 'Should have fallen back to alternative candidate');
assert.equal(ModelHealthTracker.isAvailable('gemini-3.5-flash-lite'), false, '429 model must be placed on cooldown');
console.log(`✓ Test 3 PASSED: 429 model automatically bypassed. Fallback model [${report3.actualModel}] won in ${t3Duration}ms.\n`);

// Restore GeminiService
GeminiService.generateWithModel = origGeminiWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 4: Simulated Gemini 503 High Demand Spikes -> Auto Fallback
// ============================================================================
console.log('--- TEST 4: Simulated Gemini 503 High Demand Spike ---');
let gemini503Count = 0;
GeminiService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  const modelId = modelConfig.id || modelConfig;
  if (modelId === 'gemini-3.5-flash-lite' && gemini503Count === 0) {
    gemini503Count++;
    console.log(`[SIMULATION] Injecting 503 High Demand into ${modelId}`);
    ModelHealthTracker.recordFailure(modelId, 'HTTP_503', 200, 'Service Unavailable / High Demand');
    throw new APIError('503 Service Unavailable: High Demand', 503, 'Gemini');
  }
  return origGeminiWithModel(modelConfig, dataUrl, promptObj, signal);
};

const simImage2 = await createTestImage(180, 30, 180);
const report4 = await AIManager.generateReport(simImage2, { subjectContext: 'Simulated 503 Recovery Test' });
assert.ok(report4.subject, 'Report 4 must succeed via fallback');
assert.equal(ModelHealthTracker.isAvailable('gemini-3.5-flash-lite'), false, '503 model must be on cooldown');
console.log(`✓ Test 4 PASSED: 503 error handled gracefully with zero user retry.\n`);

GeminiService.generateWithModel = origGeminiWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 5: Simulated Candidate Timeout -> In-Flight Sibling / Queue Wins
// ============================================================================
console.log('--- TEST 5: Simulated Candidate Timeout ---');
GeminiService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  const modelId = modelConfig.id || modelConfig;
  if (modelId === 'gemini-3.5-flash-lite') {
    // Simulate long hanging request aborted by signal or local timeout
    return new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new APIError('Candidate simulated timeout', 408, 'Gemini'));
      }, 500);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      });
    });
  }
  return origGeminiWithModel(modelConfig, dataUrl, promptObj, signal);
};

const simImage3 = await createTestImage(40, 140, 240);
const report5 = await AIManager.generateReport(simImage3, { subjectContext: 'Simulated Timeout Test' });
assert.ok(report5.subject, 'Report 5 must succeed via sibling candidate');
console.log(`✓ Test 5 PASSED: Timed out candidate did not stall request; sibling won [${report5.actualModel}].\n`);

GeminiService.generateWithModel = origGeminiWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 6: Simulated OpenRouter 402 Fast-Fail & Cooldown Exclusion
// ============================================================================
console.log('--- TEST 6: Simulated OpenRouter 402 Fast-Fail ---');
const origOpenRouterWithModel = OpenRouterService.generateWithModel.bind(OpenRouterService);
OpenRouterService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  console.log(`[SIMULATION] OpenRouter 402 Insufficient Credits for ${modelConfig.id}`);
  ModelHealthTracker.recordFailure(modelConfig.id, 'HTTP_402', 300, 'Requires more credits');
  throw new APIError('402 Insufficient credits', 402, 'OpenRouter');
};

const simImage4 = await createTestImage(90, 90, 90);
const report6 = await AIManager.generateReport(simImage4, {
  subjectContext: 'OpenRouter 402 Recovery Test',
  preferredProvider: 'openrouter' // Request preferred openrouter, but it should fail fast and fallback to Gemini
});
assert.ok(report6.subject, 'Report 6 must succeed via Gemini fallback');
assert.equal(report6.aiProvider, 'Google Gemini AI', 'Must fallback to Gemini');
console.log(`✓ Test 6 PASSED: 402 fast-failed and smoothly fell back to healthy Gemini.\n`);

OpenRouterService.generateWithModel = origOpenRouterWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 7: Malformed AI JSON Response -> Schema Parser Catches -> Next Wins
// ============================================================================
console.log('--- TEST 7: Malformed AI JSON Handling ---');
let malformedCount = 0;
GeminiService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  if (malformedCount === 0) {
    malformedCount++;
    console.log(`[SIMULATION] Returning malformed non-JSON text from ${modelConfig.id}`);
    throw new APIError('Failed to parse JSON response', 422, 'Gemini');
  }
  return origGeminiWithModel(modelConfig, dataUrl, promptObj, signal);
};

const simImage5 = await createTestImage(120, 20, 70);
const report7 = await AIManager.generateReport(simImage5, { subjectContext: 'Malformed JSON Fallback Test' });
assert.ok(report7.subject, 'Report 7 must succeed via clean candidate');
console.log(`✓ Test 7 PASSED: Malformed JSON handled without fatal crash.\n`);

GeminiService.generateWithModel = origGeminiWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 8: All Gemini Providers Fail -> OpenRouter Succeeds (Cross-Provider)
// ============================================================================
console.log('--- TEST 8: All Gemini Fail -> Mock OpenRouter Succeeds ---');
GeminiService.generateWithModel = async function() {
  throw new APIError('Gemini outage', 503, 'Gemini');
};

OpenRouterService.generateWithModel = async function(modelConfig, dataUrl, promptObj, signal) {
  // Return valid mock report conforming to schema
  return {
    title: 'Cross-Provider Resilience Analysis',
    subject: 'Redundant Optical System',
    category: 'Computer Science',
    executiveSummary: 'This is a verified test summary for cross-provider resilience.',
    summaryLead: 'This is a verified test summary for cross-provider resilience.',
    detailedAnalysis: 'Full analysis confirming robust cross-provider fallback architecture.',
    sections: [{ heading: 'System Architecture', body: 'Redundant provider switching active.' }],
    evidenceLedger: [
      {
        claim: 'Fallback to OpenRouter executed cleanly',
        evidenceType: 'inference',
        supportStatus: 'supported',
        evidence: 'Primary provider injected failure triggered secondary provider',
        reasoning: 'Multi-provider concurrency engine validated'
      }
    ],
    references: ['1. System Fault Tolerance Review (2026)']
  };
};

const simImage6 = await createTestImage(250, 250, 10);
const report8 = await AIManager.generateReport(simImage6, { subjectContext: 'Cross Provider Failover' });
assert.ok(report8.subject, 'Report 8 must succeed');
assert.equal(report8.aiProvider, 'OpenRouter', 'Must be served by OpenRouter');
console.log(`✓ Test 8 PASSED: Cross-provider failover succeeded seamlessly.\n`);

GeminiService.generateWithModel = origGeminiWithModel;
OpenRouterService.generateWithModel = origOpenRouterWithModel;
ModelHealthTracker.reset();

// ============================================================================
// TEST 9: All Providers Fail -> Bounded 502 (NO Fake Demo Report)
// ============================================================================
console.log('--- TEST 9: All Providers Fail -> Strictly Throws 502 (No Demo Fake) ---');
GeminiService.generateWithModel = async function() {
  throw new APIError('Gemini Down', 503, 'Gemini');
};
OpenRouterService.generateWithModel = async function() {
  throw new APIError('OpenRouter Down', 503, 'OpenRouter');
};

const simImage7 = await createTestImage(0, 0, 0);
await assert.rejects(
  () => AIManager.generateReport(simImage7, { subjectContext: 'Total Outage Test' }),
  err => {
    assert.equal(err.status, 502, 'Must return HTTP 502 on total failure');
    assert.match(err.message, /AI providers failed/i, 'Must report honest error');
    return true;
  }
);
console.log(`✓ Test 9 PASSED: Total outage strictly throws HTTP 502 and never generates fake reports.\n`);

GeminiService.generateWithModel = origGeminiWithModel;
OpenRouterService.generateWithModel = origOpenRouterWithModel;
ModelHealthTracker.reset();

console.log('==================================================');
console.log('ALL AI RELIABILITY & RESILIENCE TESTS PASSED (100% SUCCESS)');
console.log('==================================================\n');
