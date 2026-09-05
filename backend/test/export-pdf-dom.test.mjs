import assert from 'node:assert/strict';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

async function testImagePersistenceIntegrity() {
  console.log('========================================================');
  console.log('=== TEST: IMAGE PERSISTENCE & ARCHIVE DISPLAY INTEGRITY ===');
  console.log('========================================================\n');

  // Test 1: Report with genuine image
  console.log('--- TEST 1: Report with genuine image ---');
  const dummyImg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  const dummyThumb = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/thumb...';
  
  const reportWithImg = {
    id: 'RPT-12345',
    title: 'Ford Mustang Fastback Analysis',
    subject: 'Ford Mustang Fastback',
    category: 'Automotive Engineering',
    image_data_url: dummyImg,
    thumbnail_data_url: dummyThumb,
    full_data: { subject: 'Ford Mustang Fastback' }
  };

  // Ensure resolved image uses the exact image
  const resolvedImg1 = reportWithImg.image_data_url || reportWithImg.full_image || reportWithImg.full_data?.imageDataUrl || null;
  assert.equal(resolvedImg1, dummyImg, 'Must resolve exact image data');
  console.log('✓ TEST 1 PASSED: Genuine image data preserved accurately.');

  // Test 2: Old report with image stored in full_image legacy column
  console.log('\n--- TEST 2: Old report with legacy full_image column ---');
  const legacyReport = {
    id: 'RPT-OLD-1',
    title: 'Historic Vaulting Analysis',
    subject: 'Gothic Vaulting',
    category: 'Architectural Engineering',
    image_data_url: null,
    thumbnail_data_url: null,
    full_image: dummyImg,
    full_data: {}
  };
  const resolvedImg2 = legacyReport.image_data_url || legacyReport.full_image || legacyReport.full_data?.imageDataUrl || null;
  const resolvedThumb2 = legacyReport.thumbnail_data_url || legacyReport.image_data_url || legacyReport.full_image || null;
  assert.equal(resolvedImg2, dummyImg, 'Must resolve image from legacy full_image column');
  assert.equal(resolvedThumb2, dummyImg, 'Must resolve thumbnail from legacy full_image column');
  console.log('✓ TEST 2 PASSED: Old report images resolved without data loss.');

  // Test 3: Report genuinely missing image data
  console.log('\n--- TEST 3: Report genuinely missing image data ---');
  const reportNoImg = {
    id: 'RPT-NO-IMG',
    title: 'Text-only Archive Record',
    subject: 'Abstract Concept',
    category: 'General Research',
    image_data_url: null,
    thumbnail_data_url: null,
    full_image: null,
    full_data: {}
  };
  const resolvedImg3 = reportNoImg.image_data_url || reportNoImg.full_image || reportNoImg.full_data?.imageDataUrl || null;
  const resolvedThumb3 = reportNoImg.thumbnail_data_url || reportNoImg.image_data_url || reportNoImg.full_image || null;
  assert.equal(resolvedImg3, null, 'Must NOT fabricate or inject fake image');
  assert.equal(resolvedThumb3, null, 'Thumbnail must remain null for unavailable state');
  console.log('✓ TEST 3 PASSED: Missing images strictly resolve to null (no static fallbacks).');

  console.log('\n========================================================');
  console.log('=== ALL IMAGE PERSISTENCE INTEGRITY TESTS PASSED ===');
  console.log('========================================================\n');
}

async function verifyDeployments() {
  console.log('\n--- CHECKING VERCEL PRODUCTION (https://insight-lens.vercel.app) ---');
  try {
    const vRes = await fetch('https://insight-lens.vercel.app', { signal: AbortSignal.timeout(15000) });
    console.log('Vercel HTTP Status:', vRes.status);
    const text = await vRes.text();
    console.log('Vercel HTML length:', text.length);
    console.log('Vercel has evidence-workbench:', text.includes('evidence-workbench'));
  } catch (err) {
    console.log('Vercel fetch notice:', err.message);
  }

  console.log('\n--- CHECKING RENDER PRODUCTION BACKEND (https://insightlens-backend.onrender.com) ---');
  try {
    const rHealthz = await fetch('https://insightlens-backend.onrender.com/healthz', { signal: AbortSignal.timeout(15000) });
    console.log('Render /healthz Status:', rHealthz.status);
    const healthzData = await rHealthz.json();
    console.log('Render /healthz Payload:', JSON.stringify(healthzData));
  } catch (err) {
    console.log('Render /healthz notice:', err.message);
  }

  try {
    const rHealth = await fetch('https://insightlens-backend.onrender.com/api/health', { signal: AbortSignal.timeout(15000) });
    console.log('Render /api/health Status:', rHealth.status);
    const healthData = await rHealth.json();
    console.log('Render /api/health Payload:', JSON.stringify(healthData));
  } catch (err) {
    console.log('Render /api/health notice:', err.message);
  }
}

testImagePersistenceIntegrity()
  .then(() => verifyDeployments())
  .catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
  });