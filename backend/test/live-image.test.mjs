import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import AIManager from '../src/services/ai/AIManager.js';

async function testRealImage() {
  console.log('Generating test image for Brock Lesnar athlete analysis...');
  const testImgBuf = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 50, g: 80, b: 120 }
    }
  }).jpeg().toBuffer();

  const dataUrl = 'data:image/jpeg;base64,' + testImgBuf.toString('base64');
  console.log('Calling AIManager.generateReport with subjectContext: Brock Lesnar Heavyweight Champion...');
  
  const report = await AIManager.generateReport(dataUrl, {
    subjectContext: 'Brock Lesnar Heavyweight Champion',
    language: 'en',
    researchLength: 'long',
    writingStyle: 'academic'
  });

  console.log('\n=== REAL GENERATED REPORT INSPECTION ===');
  console.log('Subject:', report.subject);
  console.log('Title:', report.title);
  console.log('Evidence Status:', report.evidenceStatus);
  console.log('Has Legacy confidenceScore:', report.confidenceScore !== undefined);
  console.log('Has Legacy aiConfidence:', report.aiConfidence !== undefined);
  console.log('Evidence Ledger Claims Count:', report.evidenceLedger?.length);
  console.log('Evidence Ledger Items:', JSON.stringify(report.evidenceLedger, null, 2));
  console.log('References Count:', report.references?.length);
  console.log('Visual Type:', report.visualType);
  console.log('Specialized Pipeline:', report.specializedPipeline);
  console.log('========================================\n');
}

testRealImage().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
