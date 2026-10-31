import assert from 'node:assert';
import { config } from '../src/config/env.js';
import ModelRegistry from '../src/services/ai/ModelRegistry.js';
import GroqService from '../src/services/ai/GroqService.js';
import AIManager from '../src/services/ai/AIManager.js';
import ModelHealthTracker from '../src/services/ai/ModelHealthTracker.js';
import { parseAIResponse } from '../src/utils/aiParser.js';

async function runGroqIntegrationTests() {
  console.log('======================================================');
  console.log('--- Groq Provider Integration & Failover Test Suite ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Model Registry Groq Models Check
  try {
    console.log('[Test 1] Verifying Groq models registered in ModelRegistry...');
    const m11b = ModelRegistry.getModel('llama-3.2-11b-vision-preview');
    const m90b = ModelRegistry.getModel('llama-3.2-90b-vision-preview');

    assert(m11b, 'llama-3.2-11b-vision-preview must be registered');
    assert.strictEqual(m11b.provider, 'groq', '11b model provider must be groq');
    assert.strictEqual(m11b.vision, true, '11b model must be vision-capable');
    assert.strictEqual(m11b.structuredJson, true, '11b model must support structuredJson');

    assert(m90b, 'llama-3.2-90b-vision-preview must be registered');
    assert.strictEqual(m90b.provider, 'groq', '90b model provider must be groq');
    assert.strictEqual(m90b.vision, true, '90b model must be vision-capable');

    console.log('  ✓ Groq models verified in ModelRegistry with multimodal vision capabilities.');
    passed++;
  } catch (err) {
    console.error('  ✗ Test 1 Failed:', err.message);
    failed++;
  }

  // 2. Candidate Resolution with hasGroqKey
  try {
    console.log('[Test 2] Testing ModelRegistry vision candidate resolution with Groq key...');
    const candidates = ModelRegistry.getVisionCandidates({
      maxCandidates: 6,
      hasGeminiKey: true,
      hasOpenRouterKey: true,
      hasGroqKey: true,
      allowedProviders: ['gemini', 'openrouter', 'groq']
    });

    const groqCandidates = candidates.filter(c => c.provider === 'groq');
    assert(groqCandidates.length > 0, 'Candidates must include Groq models when hasGroqKey is true');
    console.log(`  ✓ Candidates resolved: ${candidates.map(c => `${c.provider}/${c.id}`).join(', ')}`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 2 Failed:', err.message);
    failed++;
  }

  // 3. Preferred Provider Routing: preferredProvider = 'groq'
  try {
    console.log('[Test 3] Testing preferredProvider = "groq" routing in ModelRegistry...');
    const groqFirstCandidates = ModelRegistry.getVisionCandidates({
      maxCandidates: 4,
      hasGeminiKey: true,
      hasOpenRouterKey: true,
      hasGroqKey: true,
      allowedProviders: ['gemini', 'openrouter', 'groq'],
      preferredProvider: 'groq'
    });

    assert.strictEqual(groqFirstCandidates[0].provider, 'groq', 'First candidate must be groq when preferredProvider is groq');
    console.log(`  ✓ Preferred Groq candidate placed first: ${groqFirstCandidates[0].id}`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 3 Failed:', err.message);
    failed++;
  }

  // 4. API Key Protection & Missing Key Handling
  try {
    console.log('[Test 4] Testing GroqService missing/invalid key handling...');
    const origKey = config.apiKeys.groq;
    config.apiKeys.groq = null;

    let rejectedMissing = false;
    try {
      await GroqService.generateWithModel(
        { id: 'llama-3.2-11b-vision-preview' },
        'data:image/jpeg;base64,1234'
      );
    } catch (e) {
      rejectedMissing = e.message.includes('missing') || e.status === 401;
    }
    assert(rejectedMissing, 'GroqService must reject when API key is null or missing');

    const connRes = await GroqService.testConnection(null);
    assert.strictEqual(connRes.success, false, 'testConnection must report failure when no key');

    // Restore key
    config.apiKeys.groq = origKey;
    console.log('  ✓ Missing key properly rejected with HTTP 401 error structure.');
    passed++;
  } catch (err) {
    console.error('  ✗ Test 4 Failed:', err.message);
    failed++;
  }

  // 5. Test Connection Diagnostic with Invalid Key
  try {
    console.log('[Test 5] Testing GroqService.testConnection with mock invalid key (verifying 401 response handling)...');
    const invalidTest = await GroqService.testConnection('gsk_invalid_test_key_placeholder');
    assert.strictEqual(invalidTest.success, false, 'Invalid key must fail authentication check');
    assert(invalidTest.message.includes('rejected') || invalidTest.message.includes('failed') || invalidTest.status === 401, 'Must report clear authentication diagnostic message');
    console.log(`  ✓ Authentication rejection verified safely without leaking key: ${invalidTest.message.slice(0, 75)}...`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 5 Failed:', err.message);
    failed++;
  }

  // 6. JSON Schema Parsing for Groq Output
  try {
    console.log('[Test 6] Testing parseAIResponse for Groq-generated JSON payload...');
    const sampleGroqJson = JSON.stringify({
      title: "James Webb Space Telescope Comprehensive Analysis",
      subject: "James Webb Space Telescope",
      domain: "Astronomy & Astrophysics",
      category: "Space Technology",
      detectionSummary: "Optical and infrared space observatory at the second Sun-Earth Lagrange point.",
      summaryLead: "The James Webb Space Telescope (JWST) is an infrared space observatory.",
      executiveSummary: "The James Webb Space Telescope provides unprecedented infrared resolution and sensitivity for deep cosmological observation.",
      visualEvidence: [
        { feature: "Primary Mirror", observation: "18 hexagonal beryllium segments coated in gold" },
        { feature: "Sunshield", observation: "Five-layer Kapton heat shield" }
      ],
      observations: [
        "Hexagonal beryllium segmented mirror structure with 6.5m aperture",
        "Multi-layered reflective sunshield oriented perpendicular to solar flux"
      ],
      keyTakeaways: ["Largest optical telescope in space", "Operates at Sun-Earth L2 Lagrange point"],
      methodology: "Multimodal analysis using Llama 3.2 Vision inference on Groq LPU.",
      structuredSections: [
        {
          heading: "Design and Instrumentation",
          content: "JWST features a 6.5-meter beryllium primary mirror coated with gold."
        }
      ],
      references: [
        {
          title: "The James Webb Space Telescope Mission",
          authors: ["Gardner, J. P.", "Mather, J. C."],
          year: 2006,
          url: "https://doi.org/10.1007/s11214-006-9031-5"
        }
      ]
    });

    const parsed = parseAIResponse(sampleGroqJson, 'Groq', 'llama-3.2-11b-vision-preview');
    assert(parsed.subject === "James Webb Space Telescope", 'Subject must match');
    assert(parsed.structuredSections.length === 1, 'Sections must be parsed');
    assert(parsed.references.length === 1, 'References must be parsed');
    console.log('  ✓ Groq structured JSON successfully normalized into standard research report schema.');
    passed++;
  } catch (err) {
    console.error('  ✗ Test 6 Failed:', err.message);
    failed++;
  }

  // 7. identifySubject Graceful Fallback Handling
  try {
    console.log('[Test 7] Testing GroqService.identifySubject with null/invalid input (graceful fallback)...');
    const fallbackResult = await GroqService.identifySubject('invalid_image_data', null, 1000);
    assert.strictEqual(fallbackResult, null, 'identifySubject must return null on failure rather than throwing uncaught exception');
    console.log('  ✓ identifySubject returns null on error, ensuring seamless failover to Gemini/OpenRouter.');
    passed++;
  } catch (err) {
    console.error('  ✗ Test 7 Failed:', err.message);
    failed++;
  }

  // 8. Model Health Tracker Integration
  try {
    console.log('[Test 8] Testing ModelHealthTracker recording for Groq models...');
    ModelHealthTracker.recordSuccess('llama-3.2-11b-vision-preview', 1200);
    const stats = ModelHealthTracker.getStats('llama-3.2-11b-vision-preview');
    assert(stats.successCount >= 1, 'Success count must increment');
    assert(ModelHealthTracker.isAvailable('llama-3.2-11b-vision-preview'), 'Model must be marked available');

    // Simulate 429 rate limit
    ModelHealthTracker.recordFailure('llama-3.2-11b-vision-preview', 'HTTP_429', 500, 'Rate limit exceeded');
    assert(!ModelHealthTracker.isAvailable('llama-3.2-11b-vision-preview'), 'Model must enter cooldown on HTTP 429');
    
    // Clear cooldown via recordSuccess
    ModelHealthTracker.recordSuccess('llama-3.2-11b-vision-preview', 800);
    assert(ModelHealthTracker.isAvailable('llama-3.2-11b-vision-preview'), 'Model available after cooldown clear');
    console.log('  ✓ ModelHealthTracker handles Groq latency tracking, failure telemetry, and 429 cooldowns.');
    passed++;
  } catch (err) {
    console.error('  ✗ Test 8 Failed:', err.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGroqIntegrationTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
