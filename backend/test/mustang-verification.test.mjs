import sharp from 'sharp';
import AIManager from '../src/services/ai/AIManager.js';

async function testMustang() {
  console.log('Generating test image for Ford Mustang vehicle analysis...');
  const testImgBuf = await sharp({
    create: {
      width: 500,
      height: 350,
      channels: 3,
      background: { r: 180, g: 30, b: 30 }
    }
  }).jpeg().toBuffer();

  const dataUrl = 'data:image/jpeg;base64,' + testImgBuf.toString('base64');
  console.log('Calling AIManager.generateReport with subjectContext: Ford Mustang GT Fastback...');
  
  const report = await AIManager.generateReport(dataUrl, {
    subjectContext: 'Ford Mustang GT Fastback',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });

  console.log('\n========================================');
  console.log('=== REAL MUSTANG REPORT VERIFICATION ===');
  console.log('========================================');
  console.log('Subject:', report.subject);
  console.log('Title:', report.title);
  console.log('Category:', report.category);
  console.log('Visual Type:', report.visualType);
  console.log('Specialized Pipeline:', report.specializedPipeline);
  console.log('Evidence Status:', report.evidenceStatus);
  console.log('Has Legacy confidenceScore:', report.confidenceScore !== undefined);
  console.log('Has Legacy aiConfidence:', report.aiConfidence !== undefined);
  console.log('Evidence Ledger Count:', report.evidenceLedger?.length);
  console.log('Evidence Ledger Items:\n', JSON.stringify(report.evidenceLedger, null, 2));
  console.log('References:\n', JSON.stringify(report.references, null, 2));
  console.log('========================================\n');
}

testMustang().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
