import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../src/config/env.js';
import cacheManager from '../src/utils/cacheManager.js';
import AIManager from '../src/services/ai/AIManager.js';
import GeminiService from '../src/services/ai/GeminiService.js';
import GroqService from '../src/services/ai/GroqService.js';
import OpenRouterService from '../src/services/ai/OpenRouterService.js';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSequentialPriorityTests() {
  console.log('======================================================');
  console.log('--- InsightLens: Sequential Provider Priority & Fallback Suite ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // Load Saul Goodman test image
  const saulImagePath = path.join(__dirname, '../../saul_extracted_1.jpg');
  assert(fs.existsSync(saulImagePath), 'Saul Goodman image file saul_extracted_1.jpg must exist');
  const saulBase64 = fs.readFileSync(saulImagePath).toString('base64');
  const saulDataUrl = `data:image/jpeg;base64,${saulBase64}`;

  // Preserve original API keys and methods
  const origGeminiKey = config.apiKeys.gemini;
  const origGroqKey = config.apiKeys.groq;
  const origOpenRouterKey = config.apiKeys.openrouter;

  const origGeminiGenerate = GeminiService.generateWithModel.bind(GeminiService);
  const origGroqGenerate = GroqService.generateWithModel.bind(GroqService);
  const origOpenRouterGenerate = OpenRouterService.generateWithModel.bind(OpenRouterService);

  // --- SCENARIO 1: Gemini succeeds -> Groq and OpenRouter must NOT be called ---
  try {
    cacheManager.clear();
    console.log('[Scenario 1] Testing Gemini success (Primary) -> Verifying Groq & OpenRouter NOT called...');
    let groqCalled = false;
    let openRouterCalled = false;
    let geminiCalled = false;

    GeminiService.generateWithModel = async (...args) => {
      geminiCalled = true;
      return origGeminiGenerate(...args);
    };
    GroqService.generateWithModel = async (...args) => {
      groqCalled = true;
      return origGroqGenerate(...args);
    };
    OpenRouterService.generateWithModel = async (...args) => {
      openRouterCalled = true;
      return origOpenRouterGenerate(...args);
    };

    const reqId = `TEST-SCENARIO-1-${Date.now()}`;
    const report = await AIManager.generateReport(saulDataUrl, {
      visualType: 'photograph',
      researchLength: 'brief'
    }, null, reqId);

    assert(geminiCalled, 'Gemini must be called as primary');
    assert(!groqCalled, 'Groq must NOT be called when Gemini succeeds');
    assert(!openRouterCalled, 'OpenRouter must NOT be called when Gemini succeeds');
    assert.strictEqual(report.aiProvider, 'Gemini', 'aiProvider must be Gemini');
    assert.strictEqual(report.fallbackTriggered, false, 'fallbackTriggered must be false');

    // Verify entity accuracy on Saul Goodman
    const subjectLower = (report.subject || '').toLowerCase();
    const summaryLower = (report.executiveSummary || '').toLowerCase();
    const matchesSaul = subjectLower.includes('saul') || subjectLower.includes('mcgill') || subjectLower.includes('goodman') ||
                        summaryLower.includes('saul') || summaryLower.includes('mcgill') || summaryLower.includes('goodman') ||
                        summaryLower.includes('better call saul');
    assert(matchesSaul, `Subject or summary must accurately identify Saul Goodman / Jimmy McGill (got subject: "${report.subject}")`);
    
    // Verify no Michael Collings / Patriot hallucination
    assert(!subjectLower.includes('michael collings'), 'Must NOT hallucinate Michael Collings');
    assert(!subjectLower.includes('patriot (2000)'), 'Must NOT hallucinate Patriot (2000)');

    console.log(`  ✓ Scenario 1 PASSED: Provider=${report.aiProvider}, Model=${report.actualModel}, Subject="${report.subject}"`);
    console.log(`  ✓ Zero calls to Groq or OpenRouter verified.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Scenario 1 FAILED:', err.message);
    failed++;
  } finally {
    GeminiService.generateWithModel = origGeminiGenerate;
    GroqService.generateWithModel = origGroqGenerate;
    OpenRouterService.generateWithModel = origOpenRouterGenerate;
  }

  // --- SCENARIO 2: Gemini fails -> Groq succeeds -> OpenRouter must NOT be called ---
  try {
    cacheManager.clear();
    console.log('\n[Scenario 2] Testing Gemini failure -> Groq fallback -> Verifying OpenRouter NOT called...');
    let groqCalled = false;
    let openRouterCalled = false;

    // Simulate Gemini failure
    GeminiService.generateWithModel = async () => {
      throw new Error('SIMULATED_GEMINI_RATE_LIMIT_429');
    };
    GroqService.generateWithModel = async (...args) => {
      groqCalled = true;
      return origGroqGenerate(...args);
    };
    OpenRouterService.generateWithModel = async (...args) => {
      openRouterCalled = true;
      return origOpenRouterGenerate(...args);
    };

    const reqId = `TEST-SCENARIO-2-${Date.now()}`;
    const report = await AIManager.generateReport(saulDataUrl, {
      subjectContext: 'Saul Goodman',
      visualType: 'photograph',
      researchLength: 'brief'
    }, null, reqId);

    assert(groqCalled, 'Groq must be called when Gemini fails');
    assert(!openRouterCalled, 'OpenRouter must NOT be called when Groq succeeds');
    assert.strictEqual(report.aiProvider, 'Groq', 'aiProvider must be Groq');
    assert.strictEqual(report.fallbackTriggered, true, 'fallbackTriggered must be true');
    assert(report.fallbackReason?.includes('SIMULATED_GEMINI_RATE_LIMIT_429'), 'fallbackReason must record Gemini failure');

    console.log(`  ✓ Scenario 2 PASSED: Provider=${report.aiProvider}, Model=${report.actualModel}`);
    console.log(`  ✓ Fallback recorded: "${report.fallbackReason}"`);
    console.log(`  ✓ Zero calls to OpenRouter verified.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Scenario 2 FAILED:', err.message);
    failed++;
  } finally {
    GeminiService.generateWithModel = origGeminiGenerate;
    GroqService.generateWithModel = origGroqGenerate;
    OpenRouterService.generateWithModel = origOpenRouterGenerate;
  }

  // --- SCENARIO 3: Gemini & Groq fail -> OpenRouter succeeds ---
  try {
    cacheManager.clear();
    console.log('\n[Scenario 3] Testing Gemini AND Groq failure -> OpenRouter fallback...');
    let openRouterCalled = false;

    GeminiService.generateWithModel = async () => {
      throw new Error('SIMULATED_GEMINI_TIMEOUT');
    };
    GroqService.generateWithModel = async () => {
      throw new Error('SIMULATED_GROQ_503_UNAVAILABLE');
    };
    OpenRouterService.generateWithModel = async (...args) => {
      openRouterCalled = true;
      // Mock minimal successful response if OpenRouter has no vision credit or model
      try {
        return await origOpenRouterGenerate(...args);
      } catch {
        return {
          subject: 'Saul Goodman',
          category: 'Cultural Studies',
          executiveSummary: 'Saul Goodman / Jimmy McGill character analysis under OpenRouter fallback.',
          detailedAnalysis: 'Character analysis under legal drama genre.',
          structuredSections: [{ title: 'Overview', content: 'Detailed analysis content.' }],
          references: [],
          claims: []
        };
      }
    };

    const reqId = `TEST-SCENARIO-3-${Date.now()}`;
    const report = await AIManager.generateReport(saulDataUrl, {
      subjectContext: 'Saul Goodman',
      visualType: 'photograph',
      researchLength: 'brief'
    }, null, reqId);

    assert(openRouterCalled, 'OpenRouter must be called when both Gemini and Groq fail');
    assert.strictEqual(report.aiProvider, 'OpenRouter', 'aiProvider must be OpenRouter');
    assert.strictEqual(report.fallbackTriggered, true, 'fallbackTriggered must be true');

    console.log(`  ✓ Scenario 3 PASSED: Provider=${report.aiProvider}, Fallback triggered to OpenRouter.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Scenario 3 FAILED:', err.message);
    failed++;
  } finally {
    GeminiService.generateWithModel = origGeminiGenerate;
    GroqService.generateWithModel = origGroqGenerate;
    OpenRouterService.generateWithModel = origOpenRouterGenerate;
  }

  // --- SCENARIO 4: All 3 fail -> Clean HTTP 502 error, zero fake reports ---
  try {
    cacheManager.clear();
    console.log('\n[Scenario 4] Testing all 3 providers failing -> Must throw structured 502 APIError, no fake report...');
    GeminiService.generateWithModel = async () => {
      throw new Error('GEMINI_DOWN');
    };
    GroqService.generateWithModel = async () => {
      throw new Error('GROQ_DOWN');
    };
    OpenRouterService.generateWithModel = async () => {
      throw new Error('OPENROUTER_DOWN');
    };

    let caughtError = null;
    try {
      const reqId = `TEST-SCENARIO-4-${Date.now()}`;
      await AIManager.generateReport(saulDataUrl, {
        subjectContext: 'Saul Goodman'
      }, null, reqId);
    } catch (e) {
      caughtError = e;
    }

    assert(caughtError, 'Must throw an error when all providers fail');
    assert.strictEqual(caughtError.statusCode, 502, 'Must return HTTP 502 error code');
    assert.strictEqual(caughtError.type, 'ALL_PROVIDERS_FAILED', 'Must return ALL_PROVIDERS_FAILED type');
    console.log(`  ✓ Scenario 4 PASSED: Clean 502 APIError received: "${caughtError.message}"`);
    passed++;
  } catch (err) {
    console.error('  ✗ Scenario 4 FAILED:', err.message);
    failed++;
  } finally {
    GeminiService.generateWithModel = origGeminiGenerate;
    GroqService.generateWithModel = origGroqGenerate;
    OpenRouterService.generateWithModel = origOpenRouterGenerate;
  }

  // --- TEST 5: Verify PDF & Normalized Report Section Parity (No empty section fallbacks) ---
  try {
    console.log('\n[Test 5] Verifying ReportNormalizer guarantees non-empty PDF sections...');
    const rawMinimalReport = {
      subject: 'Jimmy McGill / Saul Goodman',
      category: 'Legal Fiction',
      executiveSummary: 'An American legal crime drama television series character.',
      structuredSections: [
        { title: 'Character Genesis', content: 'Jimmy McGill begins as an earnest public defender before adopting the pseudonym Saul Goodman.' }
      ]
    };

    const normalized = normalizeReport(rawMinimalReport);
    assert(normalized.detailedAnalysis && normalized.detailedAnalysis.length > 20, 'detailedAnalysis must be populated');
    assert(normalized.identification && normalized.identification.length > 20, 'identification must be populated');
    assert(normalized.scientificTechnicalInfo && normalized.scientificTechnicalInfo.length > 20, 'scientificTechnicalInfo must be populated');

    assert(!normalized.detailedAnalysis.includes('No detailed analysis was returned'), 'Must not contain empty fallback');
    assert(!normalized.identification.includes('No identification detail was returned'), 'Must not contain empty fallback');
    assert(!normalized.scientificTechnicalInfo.includes('No technical detail was returned'), 'Must not contain empty fallback');

    console.log('  ✓ Normalized sections verified non-empty:');
    console.log(`    - detailedAnalysis: "${normalized.detailedAnalysis.substring(0, 60)}..."`);
    console.log(`    - identification: "${normalized.identification.substring(0, 60)}..."`);
    console.log(`    - scientificTechnicalInfo: "${normalized.scientificTechnicalInfo.substring(0, 60)}..."`);
    passed++;
  } catch (err) {
    console.error('  ✗ Test 5 FAILED:', err.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`--- Sequential Priority Suite Results: ${passed} Passed, ${failed} Failed ---`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSequentialPriorityTests();
