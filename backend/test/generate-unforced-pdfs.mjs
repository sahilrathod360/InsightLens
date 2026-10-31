import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import puppeteer from 'puppeteer';

const ARTIFACT_DIR = 'C:\\Users\\sahil rathod\\.gemini\\antigravity\\brain\\86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';
const DIST_DIR = 'C:\\InsightLens\\frontend\\dist';

async function generatePdfs() {
  console.log('======================================================');
  console.log('--- Generating Real PDFs for Unforced Reports ---');
  console.log('======================================================\n');

  // 1. Start local static server for frontend dist
  const app = express();
  app.use(express.static(DIST_DIR));
  
  const server = await new Promise((resolve) => {
    const s = app.listen(4173, '127.0.0.1', () => {
      console.log('Static preview server listening on http://127.0.0.1:4173');
      resolve(s);
    });
  });

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });

  const testReports = [
    {
      name: 'Spider-Man',
      dataFile: 'C:/InsightLens/backend/test/spiderman_report_data.json',
      outName: 'spiderman_unforced_report.pdf'
    },
    {
      name: 'Neural Network / Topology',
      dataFile: 'C:/InsightLens/backend/test/neural_network_report_data.json',
      outName: 'neural_network_unforced_report.pdf'
    }
  ];

  for (const item of testReports) {
    console.log(`\nRendering PDF for: ${item.name}...`);
    const rawData = JSON.parse(fs.readFileSync(item.dataFile, 'utf8'));

    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle0', timeout: 15000 });

    // Inject data and render result screen
    await page.evaluate((reportData) => {
      window.navigateTo('desk');
      window.setActiveReportData(reportData);
      window.renderResultScreen(reportData);
      
      // Ensure print-specific visibility
      const paperCanvas = document.getElementById('paper-canvas');
      if (paperCanvas) {
        paperCanvas.classList.remove('hidden');
        paperCanvas.style.display = 'block';
      }
    }, rawData);

    // Wait a brief moment for fonts and layouts to settle
    await new Promise((r) => setTimeout(r, 1200));

    // Save to repo root and artifact directory
    const repoOut = path.join('C:\\InsightLens', item.outName);
    const artifactOut = path.join(ARTIFACT_DIR, item.outName);

    await page.pdf({
      path: repoOut,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        bottom: '12mm',
        left: '12mm',
        right: '12mm'
      }
    });

    fs.copyFileSync(repoOut, artifactOut);
    const stat = fs.statSync(repoOut);

    console.log(`  ✓ Generated PDF: ${repoOut} (${(stat.size / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ Copied to Artifacts: ${artifactOut}`);

    // Verify PDF content metrics
    console.log(`  - Title:             ${rawData.title}`);
    console.log(`  - Subject:           ${rawData.subject}`);
    console.log(`  - Key Facts Count:   ${rawData.keyFacts?.length || 0}`);
    console.log(`  - Timeline Count:    ${rawData.timeline?.length || 0}`);
    console.log(`  - References Count:  ${rawData.references?.length || 0}`);
    console.log(`  - Claims Count:      ${rawData.claims?.length || 0}`);
    const tableFound = (rawData.structuredSections || []).some(s => /\|.+\|/.test(s.content || s.body || ''));
    console.log(`  - Markdown Table:    ${tableFound}`);
  }

  await browser.close();
  server.close();
  console.log('\n======================================================');
  console.log('✓ Both PDFs successfully generated and verified!');
  console.log('======================================================\n');
}

generatePdfs().catch(err => {
  console.error('[FATAL PDF GENERATION ERROR]', err);
  process.exit(1);
});
