import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import puppeteer from 'puppeteer';
import AIManager from '../src/services/ai/AIManager.js';
import normalizeReport from '../src/services/report/ReportNormalizer.js';

const ARTIFACT_DIR = 'C:\\Users\\sahil rathod\\.gemini\\antigravity\\brain\\86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';
const DIST_DIR = 'C:\\InsightLens\\frontend\\dist';

const TEST_IMAGES = [
  {
    name: 'Walter White (Breaking Bad Portrait)',
    filePath: 'C:\\InsightLens\\walter_white.jpg',
    expectedSubjectContains: 'Walter White',
    pdfName: 'walter_white_verified_report.pdf',
    jsonName: 'walter_white_verified_report.json'
  },
  {
    name: 'Spider-Man (Shadow Cinematic Staging)',
    filePath: 'C:\\Users\\sahil rathod\\Downloads\\Spiderman-blending-into-the-shadows-with-only-his-glowing-eyes-visible-4K-desktop-wallpaper.jpg',
    expectedSubjectContains: 'Spider-Man',
    pdfName: 'spiderman_verified_report.pdf',
    jsonName: 'spiderman_verified_report.json'
  },
  {
    name: 'Neural Network (Technical Diagram / Topology)',
    filePath: 'C:\\InsightLens\\frontend\\public\\images\\neural-network.jpg',
    expectedSubjectContains: 'Neural Network',
    pdfName: 'neural_network_verified_report.pdf',
    jsonName: 'neural_network_verified_report.json'
  }
];

async function runAudit() {
  console.log('=================================================================');
  console.log('--- InsightLens: Post-Fix Grounding & Citation Architecture Audit ---');
  console.log('=================================================================\n');

  // Start local static preview server for frontend dist
  const app = express();
  app.use(express.static(DIST_DIR));
  const server = await new Promise((resolve) => {
    const s = app.listen(4174, '127.0.0.1', () => {
      console.log('Static preview server listening on http://127.0.0.1:4174\n');
      resolve(s);
    });
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const auditSummary = [];

  for (const testImg of TEST_IMAGES) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`>>> Processing Image: ${testImg.name}`);
    console.log(`    File: ${testImg.filePath}`);

    if (!fs.existsSync(testImg.filePath)) {
      console.error(`ERROR: File not found: ${testImg.filePath}`);
      continue;
    }

    const imgBuffer = fs.readFileSync(testImg.filePath);
    const mime = testImg.filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${imgBuffer.toString('base64')}`;
    console.log(`    Raw Image Size: ${(imgBuffer.length / 1024).toFixed(1)} KB`);

    const startTime = Date.now();
    // Run complete unforced end-to-end pipeline
    const rawReport = await AIManager.generateReport(dataUrl, {
      researchLength: 'long',
      language: 'en',
      writingStyle: 'classic',
      citationStyle: 'APA',
      subjectContext: '', // Unforced autonomous identification
      userPreferences: { citationStyle: 'APA' }
    });

    const elapsed = Date.now() - startTime;
    const report = normalizeReport(rawReport);

    console.log(`    Generated Report in ${elapsed}ms:`);
    console.log(`    - Title: "${report.title}"`);
    console.log(`    - Subject: "${report.subject}"`);
    console.log(`    - Visual Type: ${report.visualType}`);
    console.log(`    - Analysis Model: ${report.actualModel || report.modelUsed}`);

    // Verify Wikipedia resolution
    const wikiRef = (report.references || []).find(r => r.url && r.url.includes('wikipedia.org'));
    console.log(`    - Wikipedia Source: ${wikiRef ? `${wikiRef.title} (${wikiRef.url})` : 'None retrieved'}`);

    // Verify Reference Count Consistency
    const refCount = (report.references || []).length;
    const telemetryCount = report.groundingTelemetry?.retrievedCount || 0;
    const valStatusMatch = report.validationStatus.includes(`${refCount} verified external`);
    console.log(`    - Displayed References: ${refCount}`);
    console.log(`    - Telemetry Reference Count: ${telemetryCount}`);
    console.log(`    - Count Equality Check: ${refCount === telemetryCount ? 'PASS (Strict Parity)' : 'FAIL (Mismatch)'}`);

    // Check for irrelevant paper regression on Walter White
    if (testImg.name.includes('Walter White')) {
      const hasMasculinityPaper = (report.references || []).some(r => r.title.toLowerCase().includes('masculinity') || r.title.toLowerCase().includes('detecting'));
      console.log(`    - "Detecting Masculinity" Paper Rejected: ${!hasMasculinityPaper ? 'PASS (Safely Excluded)' : 'FAIL (Still Present)'}`);
      const isWikiColorWhite = wikiRef && wikiRef.url === 'https://en.wikipedia.org/wiki/White';
      console.log(`    - Wikipedia Disambiguation Correct: ${!isWikiColorWhite && wikiRef?.url?.includes('Walter_White') ? 'PASS (Resolved to Walter_White_(Breaking_Bad))' : 'FAIL (Wrong Page)'}`);
    }

    // Inspect Claims & Evidence Support
    console.log(`\n    === CLAIM-LEVEL VERIFICATION AUDIT (${report.claims?.length || 0} Claims) ===`);
    const claimAuditRows = [];
    (report.claims || []).forEach((c, idx) => {
      console.log(`    [Claim #${idx + 1}] "${c.statement}"`);
      console.log(`      * Status: ${c.status}`);
      console.log(`      * Supporting Source: ${c.supportingSource || 'None'}`);
      console.log(`      * Supporting Passage: ${c.supportingPassage ? `"${c.supportingPassage.slice(0, 100)}..."` : 'None'}`);
      console.log(`      * Source URL: ${c.sourceUrl || 'None'}`);
      console.log(`      * Verification Status: ${c.verificationStatus}`);
      if (c.rejectionReason) {
        console.log(`      * Rejection / Decoupling Reason: ${c.rejectionReason}`);
      }
      claimAuditRows.push({
        id: idx + 1,
        statement: c.statement,
        status: c.status,
        supportingSource: c.supportingSource || 'None',
        supportingPassage: c.supportingPassage || 'None',
        sourceUrl: c.sourceUrl || 'None',
        verificationStatus: c.verificationStatus,
        rejectionReason: c.rejectionReason || null
      });
    });

    // Save JSON data
    fs.writeFileSync(path.join('C:\\InsightLens', testImg.jsonName), JSON.stringify(report, null, 2));

    // Render PDF via Puppeteer
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.goto('http://127.0.0.1:4174', { waitUntil: 'domcontentloaded', timeout: 25000 });

    await page.evaluate((reportData) => {
      window.navigateTo('desk');
      window.setActiveReportData(reportData);
      window.renderResultScreen(reportData);
      
      const paperCanvas = document.getElementById('paper-canvas');
      if (paperCanvas) {
        paperCanvas.classList.remove('hidden');
        paperCanvas.style.display = 'block';
      }
    }, report);

    await new Promise((r) => setTimeout(r, 1200));

    const repoPdfPath = path.join('C:\\InsightLens', testImg.pdfName);
    const artifactPdfPath = path.join(ARTIFACT_DIR, testImg.pdfName);

    await page.pdf({
      path: repoPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
    });
    fs.copyFileSync(repoPdfPath, artifactPdfPath);
    await page.close();

    const pdfSize = (fs.statSync(repoPdfPath).size / 1024).toFixed(1);
    console.log(`    - Generated Verified PDF: ${repoPdfPath} (${pdfSize} KB)`);

    auditSummary.push({
      testName: testImg.name,
      title: report.title,
      subject: report.subject,
      modelUsed: report.actualModel || report.modelUsed,
      refCount,
      telemetryCount,
      wikiUrl: wikiRef?.url || 'None',
      pdfSize: `${pdfSize} KB`,
      claims: claimAuditRows
    });
  }

  await browser.close();
  server.close();

  fs.writeFileSync('C:\\InsightLens\\audit_summary_results.json', JSON.stringify(auditSummary, null, 2));
  console.log('\n=================================================================');
  console.log('--- Post-Fix Grounding Verification Audit Complete ---');
  console.log('=================================================================\n');
}

runAudit().catch(err => {
  console.error('Audit Runner Error:', err);
  process.exit(1);
});
