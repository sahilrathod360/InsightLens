import fs from 'node:fs';
import { config } from '../src/config/env.js';

const TEST_IMAGES = [
  {
    name: 'Walter White (Breaking Bad Portrait)',
    filePath: 'C:/InsightLens/walter_white.jpg',
    expectedKeyword: 'Walter White'
  },
  {
    name: 'Spider-Man (Shadow Cinematic Staging)',
    filePath: 'C:/Users/sahil rathod/Downloads/Spiderman-blending-into-the-shadows-with-only-his-glowing-eyes-visible-4K-desktop-wallpaper.jpg',
    expectedKeyword: 'Spider-Man'
  },
  {
    name: 'Manhattan Skyline (Urban Architecture / Golden Hour)',
    filePath: 'C:/InsightLens/frontend/public/images/manhattan-golden-hour.jpg',
    expectedKeyword: 'Manhattan'
  }
];

async function runRealImageTests() {
  const apiKey = config.apiKeys.groq;
  if (!apiKey) {
    console.error('ERROR: No GROQ_API_KEY found in config/env.js');
    process.exit(1);
  }

  console.log('===============================================================');
  console.log('--- Groq Real-Image Subject Identification & Report Testing ---');
  console.log('    Vision Model: qwen/qwen3.8-27b');
  console.log('===============================================================\n');

  const modelId = 'qwen/qwen3.8-27b';
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  for (const img of TEST_IMAGES) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`>>> Testing Image: ${img.name}`);
    console.log(`    Path: ${img.filePath}`);

    const fileBuf = fs.readFileSync(img.filePath);
    // Base64 encode
    const base64Data = fileBuf.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    console.log(`    Size: ${(fileBuf.length / 1024).toFixed(1)} KB`);

    // Sleep helper to respect Groq free tier 7000 ITPM limit
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const identifyPrompt = 'Analyze this image and identify its primary subject for scholarly and academic research. For people, fictional characters, or cultural figures, identify the exact specific character or person name (e.g. "Walter White", "Spider-Man", "Albert Einstein") rather than just the franchise or media title. For geographic locations, cities, architectural landmarks, or monuments, identify the specific canonical entity name (e.g. "Empire State Building, New York City", "Manhattan Skyline"), never generic textbook phrases. Return JSON ONLY with keys: subject, searchQuery, concepts, category.';

    // Part A: Fast Visual Entity Identification (identifySubject)
    console.log('\n    [Phase 1] Testing Subject Identification Prompt...');
    let idRes, idData;
    let idDuration = 0;
    let attempts = 0;
    while (attempts < 3) {
      const t0 = Date.now();
      idRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          response_format: { type: 'json_object' },
          max_tokens: 250,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: identifyPrompt },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ]
        })
      });
      idDuration = Date.now() - t0;
      idData = await idRes.json();

      if (idRes.status === 429) {
        console.warn(`    ⚠ Rate limit hit (429). Free-tier ITPM reached. Waiting 22s for token bucket replenishment...`);
        await sleep(22000);
        attempts++;
        continue;
      }
      console.log(`    ✓ Phase 1 Completed in ${idDuration}ms`);
      break;
    }

    if (!idRes.ok) {
      console.error(`    ✗ Phase 1 Failed (HTTP ${idRes.status}):`, idData);
      continue;
    }

    const idContent = idData.choices?.[0]?.message?.content || '{}';
    let parsedId = {};
    try { parsedId = JSON.parse(idContent); } catch (e) { parsedId = { raw: idContent }; }

    console.log(`    ✓ Phase 1 Completed in ${idDuration}ms`);
    console.log(`      Identified Subject: "${parsedId.subject}"`);
    console.log(`      Search Query:       "${parsedId.searchQuery}"`);
    console.log(`      Category:           "${parsedId.category}"`);
    console.log(`      Concepts:           ${JSON.stringify(parsedId.concepts)}`);

    const hasExpected = (parsedId.subject || '').toLowerCase().includes(img.expectedKeyword.toLowerCase()) ||
                        (parsedId.searchQuery || '').toLowerCase().includes(img.expectedKeyword.toLowerCase());
    console.log(`      Match Quality:      ${hasExpected ? 'PERFECT ACCURACY (PASS)' : 'UNEXPECTED ENTITY'}`);

    // Part B: Full Structured Long-Form Report Generation
    console.log('\n    [Phase 2] Testing Structured Long-Form Research Report Generation...');
    const reportPrompt = `You are InsightLens's premier principal investigator and research scientist. Conduct an exhaustive visual and empirical scholarly analysis of this image.
Subject: "${parsedId.subject || img.expectedKeyword}"
Category: "${parsedId.category || 'General'}"

Return a comprehensive research dossier strictly in valid JSON format matching this schema:
{
  "title": "Comprehensive scholarly title",
  "subject": "${parsedId.subject || img.expectedKeyword}",
  "domain": "Academic domain",
  "category": "${parsedId.category || 'Visual Culture'}",
  "detectionSummary": "Dense empirical visual description of lighting, composition, and optics.",
  "summaryLead": "Executive research thesis statement.",
  "executiveSummary": "Deep two-paragraph synthesis of cultural, technological, or geographic significance.",
  "visualEvidence": [
    { "feature": "Visual element", "observation": "Detailed observation" }
  ],
  "observations": [
    "Specific optical or morphological observation 1",
    "Specific optical or morphological observation 2"
  ],
  "keyTakeaways": [
    "Key finding 1",
    "Key finding 2",
    "Key finding 3"
  ],
  "methodology": "Multimodal visual decomposition and cross-referential analysis.",
  "structuredSections": [
    {
      "heading": "Section 1: Visual Composition & Aesthetics",
      "content": "Deep analytical prose examining the visual features and artistic/photographic execution."
    },
    {
      "heading": "Section 2: Cultural, Historical & Thematic Significance",
      "content": "Comprehensive historical or narrative context and broader implications."
    }
  ],
  "timeline": [
    { "year": "Key year", "event": "Historical or contextual milestone" }
  ],
  "comparativeTable": {
    "headers": ["Attribute", "Manifestation in Subject", "Comparative Significance"],
    "rows": [
      ["Visual Signature", "...", "..."],
      ["Cultural Impact", "...", "..."]
    ]
  }
}`;

    let repRes, repData;
    let repDuration = 0;
    let repAttempts = 0;
    while (repAttempts < 3) {
      const t1 = Date.now();
      repRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          response_format: { type: 'json_object' },
          max_tokens: 3500,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: reportPrompt },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ]
        })
      });
      repDuration = Date.now() - t1;
      repData = await repRes.json();

      if (repRes.status === 429) {
        console.warn(`    ⚠ Rate limit hit (429). Free-tier ITPM reached. Waiting 25s for token bucket replenishment...`);
        await sleep(25000);
        repAttempts++;
        continue;
      }
      console.log(`    ✓ Phase 2 Completed in ${repDuration}ms (${(repDuration / 1000).toFixed(2)}s)`);
      break;
    }

    if (!repRes.ok) {
      console.error(`    ✗ Phase 2 Failed (HTTP ${repRes.status}):`, repData);
      continue;
    }

    const repContent = repData.choices?.[0]?.message?.content || '{}';
    let parsedReport = {};
    try { parsedReport = JSON.parse(repContent); } catch (e) { parsedReport = { raw: repContent }; }

    console.log(`    ✓ Phase 2 Completed in ${repDuration}ms (${(repDuration / 1000).toFixed(2)}s)`);
    console.log(`      Tokens: Prompt=${repData.usage?.prompt_tokens}, Completion=${repData.usage?.completion_tokens}, Total=${repData.usage?.total_tokens}`);
    console.log(`      Speed:  ${((repData.usage?.completion_tokens || 0) / (repDuration / 1000)).toFixed(1)} tokens/sec`);
    console.log(`      Title:  "${parsedReport.title}"`);
    console.log(`      Summary Lead: "${parsedReport.summaryLead?.slice(0, 100)}..."`);
    console.log(`      Sections: ${parsedReport.structuredSections?.length || 0} sections generated.`);
    console.log(`      Timeline Milestones: ${parsedReport.timeline?.length || 0}`);
    console.log(`      Table Rows: ${parsedReport.comparativeTable?.rows?.length || 0}`);
  }

  console.log('\n===============================================================');
  console.log('--- Real-Image Inference Testing Complete ---');
  console.log('===============================================================\n');
}

runRealImageTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
