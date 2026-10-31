// Real End-to-End Test for 3 Distinct Image Categories
// Category 1: Scientific / Technical Diagram (Artificial Neural Network)
// Category 2: Historical / Public Entity (Manhattan Skyline Landmark)
// Category 3: Ordinary Non-Academic Visual (Alpine Snowy Meadow Landscape)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AIManager from '../src/services/ai/AIManager.js';
import normalizeReport from '../src/services/report/ReportNormalizer.js';

function getFileDataUrl(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return {
    dataUrl: `data:${mime};base64,${fileBuffer.toString('base64')}`,
    hash,
    sizeBytes: fileBuffer.length
  };
}

async function runCategoryTest(label, imagePath, promptObj) {
  console.log(`\n======================================================================`);
  console.log(`>>> RUNNING REAL E2E TEST: ${label}`);
  console.log(`File: ${imagePath}`);
  console.log(`Prompt: ${JSON.stringify(promptObj)}`);
  console.log(`======================================================================\n`);

  const startTime = Date.now();
  const { dataUrl, hash, sizeBytes } = getFileDataUrl(imagePath);
  console.log(`File SHA-256: ${hash} (${sizeBytes} bytes)`);

  try {
    const rawReport = await AIManager.generateReport(dataUrl, promptObj);
    const totalMs = Date.now() - startTime;
    const normalized = normalizeReport(rawReport);

    console.log(`\n--- [${label}] PIPELINE EXECUTION SUCCESS (${totalMs} ms) ---`);
    console.log(`SHA-256 Hash:         ${hash}`);
    console.log(`Subject Detected:     ${normalized.subject}`);
    console.log(`Title:                ${normalized.title}`);
    console.log(`Visual Type:          ${normalized.visualType}`);
    console.log(`Category:             ${normalized.category}`);
    console.log(`AI Provider & Model:  ${normalized.aiProvider} (${normalized.actualModel})`);
    console.log(`Validation Status:    ${normalized.validationStatus}`);
    console.log(`\nExecutive Summary Excerpt:`);
    console.log(`"${(normalized.executiveSummary || normalized.summaryLead || '').slice(0, 300)}..."`);

    const academicRetrieved = (normalized.retrievedSources || []).filter(s => s.type === 'academic' || s.sourceType === 'openalex');
    const encyclopedicRetrieved = (normalized.retrievedSources || []).filter(s => s.type === 'encyclopedic' || s.source === 'Wikipedia');

    if (normalized.retrievedSources && normalized.retrievedSources.length > 0) {
      console.log(`\nRetrieved Grounding Sources (${normalized.retrievedSources.length} total: ${academicRetrieved.length} academic, ${encyclopedicRetrieved.length} encyclopedic):`);
      normalized.retrievedSources.forEach((s, idx) => {
        console.log(`  [${idx + 1}] (${s.type || s.sourceType}) "${s.title}"`);
        console.log(`      Relevance: [${s.relevanceTier || 'RELEVANT'}, Score: ${s.relevanceScore ?? 'N/A'}] - ${s.relevanceRationale || 'Domain aligned'}`);
        console.log(`      URL: ${s.url || s.landingPageUrl || 'N/A'}`);
        console.log(`      DOI: ${s.doi || 'None'} (Crossref Verified: ${!!s.doiVerified})`);
      });
    } else {
      console.log('\nRetrieved Grounding Sources: 0 (No external sources retrieved for this category)');
    }

    const rejectedList = rawReport?.groundingDossier?.rejectedSources || [];
    if (rejectedList.length > 0) {
      console.log(`\nRejected Candidate Sources (${rejectedList.length} filtered out by relevance threshold):`);
      rejectedList.slice(0, 3).forEach((r, idx) => {
        console.log(`  [Rejected ${idx + 1}] "${r.title}" [Score: ${r.relevanceScore}]`);
        console.log(`      Reason: ${r.relevanceRationale}`);
      });
    }

    console.log(`\nGenerated References: ${normalized.references ? normalized.references.length : 0}`);
    const doiVerifiedRefs = [];
    const reachableRefs = [];
    (normalized.references || []).forEach((ref, idx) => {
      if (ref.doiVerified) doiVerifiedRefs.push(ref);
      if (ref.url && ref.url.startsWith('http')) reachableRefs.push(ref);
      console.log(`  [${idx + 1}] "${ref.title}" - ${ref.source || ref.journal} (${ref.year || 'N/A'})`);
      console.log(`      DOI: ${ref.doi || 'None'} (DOI Verified: ${!!ref.doiVerified}) [Badge: ${ref.validationBadge || ref.validationStatus || 'N/A'}]`);
      console.log(`      URL: ${ref.url || 'None'}`);
    });

    const claims = normalized.claims || [];
    const directVisualClaims = claims.filter(c => c.claimVerification === 'DIRECT_VISUAL_OBSERVATION' || c.status === 'OBSERVED');
    const sourceSupportedClaims = claims.filter(c => c.claimVerification === 'SOURCE_SUPPORTED');
    const backgroundContextClaims = claims.filter(c => c.claimVerification === 'BACKGROUND_TERTIARY_CONTEXT');
    const inferredClaims = claims.filter(c => c.claimVerification === 'INFERRED_REASONING' || (c.status === 'INFERRED' && c.claimVerification !== 'SOURCE_SUPPORTED'));
    const notVerifiedClaims = claims.filter(c => c.claimVerification === 'NOT_INDEPENDENTLY_VERIFIED' || (!c.claimVerification && c.status !== 'OBSERVED'));

    console.log(`\nClaims & Traceability (${claims.length} claims total across 5-class taxonomy):`);
    console.log(`  - 1. Direct Visual Observation:     ${directVisualClaims.length}`);
    console.log(`  - 2. Supported by Retrieved Source: ${sourceSupportedClaims.length}`);
    console.log(`  - 3. Background Information:        ${backgroundContextClaims.length}`);
    console.log(`  - 4. Inferred Reasoning:            ${inferredClaims.length}`);
    console.log(`  - 5. Not Independently Verified:    ${notVerifiedClaims.length}`);

    claims.forEach((c, idx) => {
      console.log(`  [Claim ${idx + 1}] Status: ${c.status} | Verification: ${c.claimVerification || 'N/A'}`);
      console.log(`    Statement: "${c.statement}"`);
      console.log(`    Evidence:  "${c.evidence}"`);
      console.log(`    Source:    "${c.source}"`);
    });

    return {
      label,
      sha256: hash,
      success: true,
      durationMs: totalMs,
      subject: normalized.subject,
      title: normalized.title,
      category: normalized.category,
      model: normalized.actualModel,
      provider: normalized.aiProvider,
      summaryExcerpt: (normalized.executiveSummary || normalized.summaryLead || '').slice(0, 200),
      retrievedTotal: normalized.retrievedSources ? normalized.retrievedSources.length : 0,
      retrievedAcademic: academicRetrieved.length,
      retrievedEncyclopedic: encyclopedicRetrieved.length,
      referencesCount: normalized.references ? normalized.references.length : 0,
      doiVerifiedCount: doiVerifiedRefs.length,
      reachableUrlsCount: reachableRefs.length,
      claimsTotal: claims.length,
      claimsDirectVisual: directVisualClaims.length,
      claimsSourceSupported: sourceSupportedClaims.length,
      claimsBackgroundContext: backgroundContextClaims.length,
      claimsInferred: inferredClaims.length,
      claimsNotVerified: notVerifiedClaims.length,
      validationStatus: normalized.validationStatus
    };
  } catch (err) {
    console.error(`\n--- [${label}] PIPELINE EXECUTION FAILED (${Date.now() - startTime} ms) ---`);
    console.error(`Error:`, err.message);
    if (err.stack) console.error(err.stack);
    return {
      label,
      sha256: hash,
      success: false,
      error: err.message
    };
  }
}

async function main() {
  const results = [];

  // 1. Scientific / Technical: Neural Network Architecture Diagram
  const sciResult = await runCategoryTest(
    'Category 1: Scientific / Technical Diagram',
    'C:\\InsightLens\\frontend\\public\\images\\neural-network.jpg',
    {
      researchLength: 'long',
      language: 'en'
    }
  );
  results.push(sciResult);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Historical / Public Entity: Manhattan Golden Hour Skyline
  const histResult = await runCategoryTest(
    'Category 2: Historical / Public Entity',
    'C:\\InsightLens\\frontend\\public\\images\\manhattan-golden-hour.jpg',
    {
      researchLength: 'long',
      language: 'en'
    }
  );
  results.push(histResult);

  await new Promise(r => setTimeout(r, 2000));

  // 3. Ordinary Image: Alpine Cosmos Snow Meadow (No Academic Relevance)
  const ordResult = await runCategoryTest(
    'Category 3: Ordinary Visual (Non-Academic)',
    'C:\\InsightLens\\frontend\\public\\images\\alpine-cosmos-snow.jpg',
    {
      researchLength: 'short',
      language: 'en'
    }
  );
  results.push(ordResult);

  console.log('\n======================================================================');
  console.log('>>> SUMMARY OF REAL END-TO-END AUDIT RUNS');
  console.log('======================================================================');
  console.log(JSON.stringify(results, null, 2));
}

main();
