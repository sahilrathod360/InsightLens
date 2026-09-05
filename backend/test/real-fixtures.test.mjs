import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AIManager from '../src/services/ai/AIManager.js';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRealFixturesTest() {
  console.log('=========================================================');
  console.log('=== PHASE: REAL REPOSITORY IMAGE FIXTURE TESTS ===');
  console.log('========================================================\n');

  // 1. Real Diagram IMAGE
  console.log('--- TEST 1: Real Diagram Fixture (neural-network.jpg) ---');
  const diagramPath = path.resolve(__dirname, '../../frontend/public/images/neural-network.jpg');
  const diagramBuf = fs.readFileSync(diagramPath);
  const diagramDataUrl = 'data:image/jpeg;base64,' + diagramBuf.toString('base64');

  const rawDiagramReport = await AIManager.generateReport(diagramDataUrl, {
    subjectContext: 'Deep Neural Network Architecture',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const diagramReport = normalizeReport(rawDiagramReport);
  assert.ok(diagramReport.subject, 'Subject must exist');
  assert.ok(diagramReport.evidenceLedger && diagramReport.evidenceLedger.length > 0, 'Ledger must have entries');
  assert.equal(diagramReport.scientificName, undefined, 'Diagram must not have scientificName');
  console.log('✓ TEST 1 PASSED: Diagram report generated cleanly.');
  console.log('  Subject: ' + diagramReport.subject);
  console.log('  Classification: ' + diagramReport.domainClassification);
  console.log('  Ledger Count: ' + diagramReport.evidenceLedger.length);

  // 2. Real Urban / Vehicle Fixture
  console.log('\n--- TEST 2: Real Urban / Engineering Fixture (urban-analysis.jpg) ---');
  const urbanPath = path.resolve(__dirname, '../../frontend/public/images/urban-analysis.jpg');
  const urbanBuf = fs.readFileSync(urbanPath);
  const urbanDataUrl = 'data:image/jpeg;base64,' + urbanBuf.toString('base64');

  const rawUrbanReport = await AIManager.generateReport(urbanDataUrl, {
    subjectContext: 'Modern Urban Civil Bridge Engineering',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const urbanReport = normalizeReport(rawUrbanReport);
  assert.ok(urbanReport.subject, 'Subject must exist');
  assert.ok(urbanReport.evidenceLedger && urbanReport.evidenceLedger.length > 0, 'Ledger must have entries');
  assert.equal(urbanReport.scientificName, undefined, 'Urban engineering must not have scientificName');
  console.log('✓ TEST 2 PASSED: Urban report generated cleanly.');
  console.log('  Subject: ' + urbanReport.subject);
  console.log('  Classification: ' + urbanReport.domainClassification);
  console.log('  Ledger Count: ' + urbanReport.evidenceLedger.length);

  // 3. Real Mountain / Landscape Fixture
  console.log('\n--- TEST 3: Real Landscape Fixture (mountain-analysis.jpg) ---');
  const mountainPath = path.resolve(__dirname, '../../frontend/public/images/mountain-analysis.jpg');
  const mountainBuf = fs.readFileSync(mountainPath);
  const mountainDataUrl = 'data:image/jpeg;base64,' + mountainBuf.toString('base64');

  const rawMountainReport = await AIManager.generateReport(mountainDataUrl, {
    subjectContext: 'Alpine Mountain Landscape',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const mountainReport = normalizeReport(rawMountainReport);
  assert.ok(mountainReport.subject, 'Subject must exist');
  assert.ok(mountainReport.evidenceLedger && mountainReport.evidenceLedger.length > 0, 'Ledger must have entries');
  console.log('✓ TEST 3 PASSED: Landscape report generated cleanly.');
  console.log('  Subject: ' + mountainReport.subject);
  console.log('  Classification: ' + mountainReport.domainClassification);
  console.log('  Ledger Count: ' + mountainReport.evidenceLedger.length);

  console.log('\n=========================================================');
  console.log('=== ALL REAL FIXTURE TESTS PASSED WITH ZERO ERRORS ===');
  console.log('=========================================================\n');
}

runRealFixturesTest().catch(err => {
  console.error('Real Fixture Test Failed:', err);
  process.exit(1);
});