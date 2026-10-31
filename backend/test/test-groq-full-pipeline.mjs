import fs from 'node:fs';
import assert from 'node:assert';
import AIManager from '../src/services/ai/AIManager.js';

async function testGroqFullPipeline() {
  console.log('======================================================');
  console.log('--- Testing Full AIManager Pipeline with Groq ---');
  console.log('======================================================\n');

  const fileBuf = fs.readFileSync('C:/InsightLens/walter_white.jpg');
  const dataUrl = `data:image/jpeg;base64,${fileBuf.toString('base64')}`;

  console.log('Generating research report with preferredProvider = "groq"...');
  const t0 = Date.now();

  const report = await AIManager.generateReport(
    dataUrl,
    {
      subjectContext: 'Walter White',
      category: 'Fictional Character',
      researchLength: 'short'
    },
    'groq'
  );

  const totalTimeMs = Date.now() - t0;
  console.log(`\n✓ Full Pipeline Succeeded in ${totalTimeMs}ms (${(totalTimeMs / 1000).toFixed(2)}s)`);
  console.log('  Provider Selected:', report.aiProvider);
  console.log('  Model Selected:   ', report.actualModel);
  console.log('  Subject:          ', report.subject);
  console.log('  Title:            ', report.title);
  console.log('  Validation Status:', report.validationStatus);
  console.log('  Executive Summary:', report.executiveSummary?.slice(0, 120) + '...');
  console.log('  Sections Count:   ', report.structuredSections?.length);
  console.log('  References Count: ', report.references?.length);

  assert(report.subject, 'Report must contain subject');
  assert(report.aiProvider === 'Groq' || report.aiProvider === 'Google Gemini AI', 'Must use Groq or resiliently promoted fallback');

  console.log('\n======================================================');
  console.log('--- Full Pipeline Integration Test PASSED ---');
  console.log('======================================================\n');
}

testGroqFullPipeline().catch(err => {
  console.error('Fatal pipeline test error:', err);
  process.exit(1);
});
