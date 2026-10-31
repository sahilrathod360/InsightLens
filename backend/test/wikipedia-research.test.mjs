// Test suite for Wikipedia REST API Research Integration in InsightLens
// Tests real network requests, entity resolution, geographic filtering, and report grounding.

import WikipediaService from '../src/services/research/WikipediaService.js';
import ResearchEngine from '../src/services/research/ResearchEngine.js';

async function runWikipediaTestSuite() {
  console.log('======================================================');
  console.log('--- InsightLens: Wikipedia Research Integration Suite ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Real Scientific Entity Retrieval
  console.log('[Test 1] Testing live scientific entity summary retrieval...');
  try {
    const t0 = Date.now();
    const result = await WikipediaService.getEntitySummary('Hubble Space Telescope');
    const elapsed = Date.now() - t0;
    assert(result !== null, 'Retrieved entity summary for Hubble Space Telescope');
    assert(result.title.toLowerCase().includes('hubble'), `Title contains "Hubble" (got: "${result.title}")`);
    assert(result.extract.length > 50, `Extract has meaningful content (${result.extract.length} chars)`);
    assert(result.url.startsWith('https://en.wikipedia.org/wiki/'), `URL is valid Wikipedia desktop page (${result.url})`);
    assert(result.tier === 2, 'Evidentiary tier is strictly Tier 2 (Tertiary Context)');
    console.log(`  (Response received in ${elapsed}ms)`);
  } catch (err) {
    assert(false, `Test 1 threw error: ${err.message}`);
  }

  // Test 2: Compound Query Entity Resolution (e.g., Manhattan Skyline -> Manhattan)
  console.log('\n[Test 2] Testing compound query resolution and entity root matching...');
  try {
    const result = await WikipediaService.getEntitySummary('Manhattan Skyline', {
      concepts: ['New York City', 'Skyscrapers', 'Hudson River'],
      category: 'Urban Architecture'
    });
    assert(result !== null, 'Resolved compound query "Manhattan Skyline"');
    assert(
      result.title.toLowerCase().includes('manhattan') || result.title.toLowerCase().includes('tallest buildings'),
      `Result matches urban New York context (got: "${result.title}")`
    );
    assert(!result.description?.toLowerCase().includes('philippines'), 'Result is not confused with Metro Manila');
  } catch (err) {
    assert(false, `Test 2 threw error: ${err.message}`);
  }

  // Test 3: Cultural & Pop-Culture Entity Resolution
  console.log('\n[Test 3] Testing cultural/character entity resolution (Spider-Man)...');
  try {
    const result = await WikipediaService.getEntitySummary('Spider-Man', {
      concepts: ['Marvel Comics', 'Stan Lee', 'Peter Parker'],
      category: 'Fictional Character / Comics'
    });
    assert(result !== null, 'Resolved entity for "Spider-Man"');
    assert(result.title === 'Spider-Man', `Expected title "Spider-Man", got: "${result.title}"`);
    assert(result.sourceType === 'ENCYCLOPEDIC_BACKGROUND', 'sourceType marked as ENCYCLOPEDIC_BACKGROUND');
  } catch (err) {
    assert(false, `Test 3 threw error: ${err.message}`);
  }

  // Test 4: Geographic Contradiction Detection
  console.log('\n[Test 4] Testing geographic contradiction protection (Manhattan vs Manila)...');
  try {
    // If context is strictly New York City, a candidate containing Philippines/Manila must be rejected
    const result = await WikipediaService.getEntitySummary('Metro Manila', {
      concepts: ['New York City', 'Manhattan', 'Empire State'],
      category: 'Architecture'
    });
    // Metro Manila contradicts NYC context, so it should be rejected (returns null)
    assert(result === null, 'Geographic contradiction was detected and successfully rejected');
  } catch (err) {
    assert(false, `Test 4 threw error: ${err.message}`);
  }

  // Test 5: Cache Hit and Performance Acceleration
  console.log('\n[Test 5] Testing in-memory cache lookup and acceleration...');
  try {
    const query = 'Marie Curie';
    const tStart = Date.now();
    const first = await WikipediaService.getEntitySummary(query);
    const firstDuration = Date.now() - tStart;

    const tCache = Date.now();
    const second = await WikipediaService.getEntitySummary(query);
    const cachedDuration = Date.now() - tCache;

    assert(first !== null && second !== null, 'Both calls returned valid Marie Curie summary');
    assert(first.title === second.title, 'Cached title strictly matches first call');
    assert(cachedDuration < 10, `Cached call returned instantly (${cachedDuration}ms vs initial ${firstDuration}ms)`);
  } catch (err) {
    assert(false, `Test 5 threw error: ${err.message}`);
  }

  // Test 6: Bounded Timeout & Network Resilience
  console.log('\n[Test 6] Testing timeout bound enforcement...');
  try {
    const t0 = Date.now();
    const timeoutResult = await WikipediaService.getEntitySummary('Quantum Electrodynamics Uncached Subject Test', {
      timeoutMs: 1 // 1ms forces immediate AbortController signal
    });
    const elapsed = Date.now() - t0;
    assert(timeoutResult === null, 'Gracefully returned null on timeout without throwing unhandled exception');
    assert(elapsed < 200, `Abort controller aborted quickly (${elapsed}ms)`);
  } catch (err) {
    assert(false, `Test 6 threw unhandled exception: ${err.message}`);
  }

  // Test 7: Integration in ResearchEngine Grounding Dossier
  console.log('\n[Test 7] Testing Wikipedia integration into ResearchEngine dossier...');
  try {
    const dossier = await ResearchEngine.retrieveGroundingDossier({
      subject: 'James Webb Space Telescope',
      concepts: ['astronomy', 'infrared observatory'],
      category: 'Science & Technology',
      visualType: 'photograph'
    });

    assert(dossier.hasEncyclopedicSources === true, 'ResearchEngine correctly identified encyclopedic source');
    assert(dossier.encyclopedicSource !== null, 'Encyclopedic source is populated in dossier');
    assert(dossier.encyclopedicSource.source === 'Wikipedia', 'Source name is Wikipedia');
    assert(dossier.encyclopedicSource.url.includes('wikipedia.org'), `URL contains wikipedia.org (${dossier.encyclopedicSource.url})`);
    assert(
      dossier.groundingPromptText.includes('Wikipedia') && dossier.groundingPromptText.includes('ENCYCLOPEDIC BACKGROUND CONTEXT'),
      'Grounding prompt text contains Wikipedia encyclopedic context section'
    );
  } catch (err) {
    assert(false, `Test 7 threw error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`--- Test Suite Results: ${passed} / ${passed + failed} Passed (${failed} Failed) ---`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWikipediaTestSuite().catch(err => {
  console.error('[FATAL TEST RUNNER ERROR]', err);
  process.exit(1);
});
