import assert from 'node:assert/strict';
import sharp from 'sharp';
import AIManager from '../src/services/ai/AIManager.js';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

function createSyntheticImage(w, h, color) {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: color
    }
  }).jpeg().toBuffer();
}

function verifyReportInvariants(report, isBio = false) {
  assert.equal(report.confidenceScore, undefined, 'Must not have confidenceScore');
  assert.equal(report.aiConfidence, undefined, 'Must not have aiConfidence');
  assert.equal(report.confidence, undefined, 'Must not have confidence');

  if (!isBio) {
    assert.equal(report.scientificName, undefined, 'Non-biological entities must NOT have scientificName');
  }

  assert.ok(Array.isArray(report.evidenceLedger), 'evidenceLedger must be an array');
  assert.ok(report.evidenceLedger.length >= 1, 'evidenceLedger must contain at least 1 entry');

  const prohibitedBiometricPhrases = [
    /facial (structure|geometry|morphology|features|characteristics)\s+(uniquely\s+)?identif/i,
    /uniquely identif/i,
    /identity (is\+)?(verified|confirmed|proven)\s+by+facial/i,
    /photographic database(s)?(\+ matching)?/i,
    /biometric\s+(identification|analysis|matching)/i
  ];

  for (const entry of report.evidenceLedger) {
    assert.ok(entry.claim, 'Ledger entry must have claim');
    assert.ok(['visual_observation', 'inference', 'external_source'].includes(entry.evidenceType), 'Invalid evidenceType: ' + entry.evidenceType);
    assert.ok(['supported', 'partially_supported', 'uncertain', 'unsupported'].includes(entry.supportStatus), 'Invalid supportStatus: ' + entry.supportStatus);

    for (const pattern of prohibitedBiometricPhrases) {
      assert.ok(!pattern.test(entry.claim), 'Prohibited biometric phrase in claim: ' + entry.claim);
      assert.ok(!pattern.test(entry.evidence), 'Prohibited biometric phrase in evidence: ' + entry.evidence);
      assert.ok(!pattern.test(entry.reasoning), 'Prohibited biometric phrase in reasoning: ' + entry.reasoning);
    }
  }

  for (const v of report.visualEvidence || []) {
    for (const pattern of prohibitedBiometricPhrases) {
      assert.ok(!pattern.test(v.statement), 'Prohibited phrase in visualEvidence: ' + v.statement);
    }
  }
}

async function runThreeVisualTypeTests() {
  console.log('=========================================================');
  console.log('=== PHASE: THBEE REAL VISUAL TYPE TESTS ===');
  console.log('=========================================================\n');

  // TEST A: Person
  console.log('--- TEST A: Person Photograph (Roman Reigns) ---');
  const personImg = await createSyntheticImage(400, 400, { r: 25, g: 30, b: 60 });
  const personDataUrl = 'data:image/jpeg;base64,' + personImg.toString('base64');
  const rawPersonReport = await AIManager.generateReport(personDataUrl, {
    subjectContext: 'Roman Reigns',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const personReport = normalizeReport(rawPersonReport);
  verifyReportInvariants(personReport, false);
  console.log('✓ TEST A PASSED');
  console.log('  Subject: ' + personReport.subject);
  console.log('  Title: ' + personReport.title);
  console.log('  Classification: ' + personReport.domainClassification);
  console.log('  ScientificName present: ' + (personReport.scientificName !== undefined));
  console.log('  Ledger Count: ' + personReport.evidenceLedger.length);

  // TEST B: Vehicle
  console.log('\n--- TEST B: Vehicle Photograph (Ford Mustang GT) ---');
  const vehicleImg = await createSyntheticImage(500, 350, { r: 180, g: 20, b: 20 });
  const vehicleDataUrl = 'data:image/jpeg;base64,' + vehicleImg.toString('base64');
  const rawVehicleReport = await AIManager.generateReport(vehicleDataUrl, {
    subjectContext: 'Ford Mustang GT Fastback',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const vehicleReport = normalizeReport(rawVehicleReport);
  verifyReportInvariants(vehicleReport, false);
  console.log('✑ TEST B PASSED');
  console.log('  Subject: ' + vehicleReport.subject);
  console.log('  Title: ' + vehicleReport.title);
  console.log('  Classification: ' + vehicleReport.domainClassification);
  console.log('  ScientificName present: ' + (vehicleReport.scientificName !== undefined));
  console.log('  Ledger Count: ' + vehicleReport.evidenceLedger.length);

  // TEST C: Chart / Diagram
  console.log('\n--- TEST C: Chart / Diagram (Cloud Architecture) ---');
  const chartImg = await createSyntheticImage(600, 400, { r: 240, g: 240, b: 245 });
  const chartDataUrl = 'data:image/jpeg;base64,' + chartImg.toString('base64');
  const rawChartReport = await AIManager.generateReport(chartDataUrl, {
    subjectContext: 'Global Cloud Microservices Architecture Diagram',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });
  const chartReport = normalizeReport(rawChartReport);
  verifyReportInvariants(chartReport, false);
  console.log('✓ TEST C PASSED');
  console.log('  Subject: ' + chartReport.subject);
  console.log('  Title: ' + chartReport.title);
  console.log('  Classification: ' + chartReport.domainClassification);
  console.log('  ScientificName present: ' + (chartReport.scientificName !== undefined));
  console.log('  Ledger Count: ' + chartReport.evidenceLedger.length);

  console.log('\n========================================================');
  console.log('=== ALL THBEE VISUAL TYPE TESTS PASSED (100%) ===');
  console.log('=========================================================\n');
}

runThreeVisualTypeTests().catch(err => {
  console.error('Three visual types test failed:', err);
  process.exit(1);
});