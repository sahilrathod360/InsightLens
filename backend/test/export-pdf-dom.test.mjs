import assert from 'node:assert/strict';
import fs from 'node:fs';

async function testExportDom() {
  console.log('=== VERIFYING REPORT VIEWER DOM & PDF CANVAS ===');

  const htmlContent = fs.readFileSync('../frontend/index.html', 'utf8');

  // Verify initial HTML contains zero legacy strings
  assert.ok(!htmlContent.includes('10 Parameters Grounded'), 'HTML must not contain 10 Parameters Grounded');
  assert.ok(!htmlContent.includes('Multi-Metric Confidence Breakdown'), 'HTML must not contain Multi-Metric Confidence Breakdown');
  assert.ok(!htmlContent.includes('Canis lupus familiaris'), 'HTML must not contain Canis lupus familiaris');

  console.log('✓ STATIC DOM AUDIT PASSED: No legacy telemetry or fake taxonomy strings.');
}

testExportDom().catch(e => {
  console.error(e);
  process.exit(1);
});